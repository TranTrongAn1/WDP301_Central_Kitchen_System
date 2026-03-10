const mongoose = require('mongoose');
const ProductionPlan = require('../models/ProductionPlan');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Batch = require('../models/BatchModel');
const Ingredient = require('../models/Ingredient');
const IngredientBatch = require('../models/IngredientBatch');
const IngredientUsage = require('../models/IngredientUsage');
const { getSettingNumber } = require('../utils/settingHelper');
const getProductionPlans = async (req, res, next) => {
  try {
    const { status, planDate } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (planDate) {
      const start = new Date(planDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(planDate);
      end.setHours(23, 59, 59, 999);
      filter.planDate = { $gte: start, $lte: end };
    }
    const plans = await ProductionPlan.find(filter)
      .populate('details.productId', 'name sku price shelfLifeDays')
      .sort({ planDate: -1 });
    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

const getProductionPlanById = async (req, res, next) => {
  try {
    const plan = await ProductionPlan.findById(req.params.id).populate(
      'details.productId',
      'name sku price shelfLifeDays categoryId'
    );
    if (!plan) {
      res.status(404);
      return next(new Error('Production plan not found'));
    }
    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

const createProductionPlan = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { planCode, planDate, note, orderIds } = req.body;

    // Validate orderIds
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      await session.abortTransaction();
      session.endSession();
      res.status(400);
      return next(new Error('orderIds must be a non-empty array'));
    }

    // Check for duplicate plan code
    const existingPlan = await ProductionPlan.findOne({ planCode }).session(session);
    if (existingPlan) {
      await session.abortTransaction();
      session.endSession();
      res.status(400);
      return next(new Error('Production plan with this code already exists'));
    }

    // Fetch all referenced orders
    const orders = await Order.find({ _id: { $in: orderIds } }).session(session);

    // Verify every requested order was found
    if (orders.length !== orderIds.length) {
      const foundIds = orders.map((o) => o._id.toString());
      const missing = orderIds.filter((id) => !foundIds.includes(id.toString()));
      await session.abortTransaction();
      session.endSession();
      res.status(400);
      return next(new Error(`Orders not found: ${missing.join(', ')}`));
    }

    // Verify all orders have status 'Approved'
    const nonApproved = orders.filter((o) => o.status !== 'Approved');
    if (nonApproved.length > 0) {
      const codes = nonApproved.map((o) => o.orderCode).join(', ');
      await session.abortTransaction();
      session.endSession();
      res.status(400);
      return next(
        new Error(`All orders must have status 'Approved'. Non-compliant orders: ${codes}`)
      );
    }

    // ========================================
    // [CẬP NHẬT] Đếm số lượng và Check Limit
    // ========================================
    const quantityMap = new Map();
    let totalProductsCount = 0; // Biến đếm tổng tất cả sản phẩm

    for (const order of orders) {
      for (const item of order.items) {
        const pid = item.productId.toString();
        const qty = item.quantity || 0;
        
        // Cộng dồn cho từng món
        quantityMap.set(pid, (quantityMap.get(pid) || 0) + qty);
        
        // Cộng dồn vào tổng số lượng của cả mẻ nấu
        totalProductsCount += qty; 
      }
    }

    // Lấy giới hạn từ System Setting (mặc định 1000 nếu chưa set)
    const maxProductsPerPlan = await getSettingNumber('MAX_PRODUCTS_PER_PLAN', 1000);

    // Chốt chặn văng lỗi nếu vượt quá năng lực
    if (totalProductsCount > maxProductsPerPlan) {
      await session.abortTransaction();
      session.endSession();
      res.status(400);
      return next(new Error(`Vượt quá năng lực Bếp! Mẻ nấu này có tổng cộng ${totalProductsCount} sản phẩm, nhưng giới hạn hệ thống chỉ cho phép tối đa ${maxProductsPerPlan} sản phẩm/mẻ.`));
    }
    // ========================================

    // Build the details array
    const details = Array.from(quantityMap.entries()).map(([productId, totalQuantity]) => ({
      productId,
      plannedQuantity: totalQuantity,
      actualQuantity: 0,
      status: 'Pending',
    }));

    if (details.length === 0) {
      await session.abortTransaction();
      session.endSession();
      res.status(400);
      return next(new Error('The selected orders contain no items to produce'));
    }

    // Create the production plan
    const [plan] = await ProductionPlan.create(
      [{ planCode, planDate: planDate || Date.now(), note, orders: orderIds, details }],
      { session }
    );

    // Update all linked orders to 'Transferred_To_Kitchen'
    await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { status: 'Transferred_To_Kitchen' } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    await plan.populate('details.productId', 'name sku price shelfLifeDays');

    res.status(201).json({
      success: true,
      message: 'Production plan created successfully',
      data: plan,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    next(error);
  }
};
const updateProductionPlan = async (req, res, next) => {
  try {
    const plan = await ProductionPlan.findById(req.params.id);
    if (!plan) {
      res.status(404);
      return next(new Error('Production plan not found'));
    }
    if (plan.status === 'Completed' || plan.status === 'Cancelled') {
      res.status(400);
      return next(
        new Error(
          `Cannot update production plan with status '${plan.status}'`
        )
      );
    }
    const { planCode, planDate, note } = req.body;
    const allowedUpdates = {};
    if (planCode !== undefined) allowedUpdates.planCode = planCode;
    if (planDate !== undefined) allowedUpdates.planDate = planDate;
    if (note !== undefined) allowedUpdates.note = note;

    const updated = await ProductionPlan.findByIdAndUpdate(req.params.id, allowedUpdates, {
      new: true,
      runValidators: true,
    }).populate('details.productId', 'name sku price shelfLifeDays');
    res.status(200).json({
      success: true,
      message: 'Production plan updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

const deleteProductionPlan = async (req, res, next) => {
  try {
    const plan = await ProductionPlan.findById(req.params.id);
    if (!plan) {
      res.status(404);
      return next(new Error('Production plan not found'));
    }
    if (plan.status !== 'Planned' && plan.status !== 'Cancelled') {
      res.status(400);
      return next(
        new Error(
          'Can only delete production plans with status Planned or Cancelled'
        )
      );
    }
    await plan.deleteOne();
    res.status(200).json({
      success: true,
      message: 'Production plan deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

const completeProductionItem = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let transactionAborted = false;

  try {
    const { planId } = req.params;
    const { productId, actualQuantity, usedIngredients } = req.body;

    // ========================================
    // STEP 1: Validation
    // ========================================
    if (!productId || !actualQuantity || actualQuantity <= 0) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Product ID and valid actual quantity are required');
    }

    if (!usedIngredients || !Array.isArray(usedIngredients) || usedIngredients.length === 0) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('usedIngredients must be a non-empty array');
    }

    const plan = await ProductionPlan.findById(planId).session(session);
    if (!plan) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('Production plan not found');
    }

    if (plan.status === 'Completed' || plan.status === 'Cancelled') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error(`Cannot complete items for plan with status '${plan.status}'`);
    }

    const detailIndex = plan.details.findIndex(
      (detail) => detail.productId.toString() === productId
    );

    if (detailIndex === -1) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('Product not found in this production plan');
    }

    if (plan.details[detailIndex].status === 'Completed') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('This production item is already completed');
    }

    // ========================================
    // STEP 2: Fetch Product
    // ========================================
    const product = await Product.findById(productId).session(session);
    if (!product) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('Product not found');
    }

    // ========================================
    // STEP 3: Manual Deduction + IngredientUsage records
    // ========================================
    const ingredientBatchesUsed = [];

    for (const item of usedIngredients) {
      const { ingredientBatchId, quantityUsed, note } = item;

      if (!ingredientBatchId || !quantityUsed || quantityUsed <= 0) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(400);
        throw new Error(
          'Each usedIngredients item must have ingredientBatchId and a positive quantityUsed'
        );
      }

      // Find the batch
      const batch = await IngredientBatch.findById(ingredientBatchId).session(session);
      if (!batch) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(404);
        throw new Error(`Ingredient batch not found: ${ingredientBatchId}`);
      }

      // Check sufficient quantity
      if (batch.currentQuantity < quantityUsed) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(400);
        throw new Error(
          `Insufficient quantity in batch '${batch.batchCode}'. ` +
          `Available: ${batch.currentQuantity}, Requested: ${quantityUsed}`
        );
      }

      // Deduct from batch
      batch.currentQuantity -= quantityUsed;
      if (batch.currentQuantity === 0) {
        batch.isActive = false;
      }
      await batch.save({ session });

      // Deduct from parent Ingredient totalQuantity
      const ingredient = await Ingredient.findById(batch.ingredientId).session(session);
      if (!ingredient) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(404);
        throw new Error(`Parent ingredient not found for batch '${batch.batchCode}'`);
      }

      ingredient.totalQuantity -= quantityUsed;
      if (ingredient.totalQuantity < 0) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(500);
        throw new Error(
          `Data inconsistency: totalQuantity for ingredient '${ingredient.ingredientName}' would become negative`
        );
      }
      await ingredient.save({ session });

      // Create IngredientUsage audit record
      await IngredientUsage.create(
        [
          {
            productionPlanId: planId,
            productId,
            ingredientId: batch.ingredientId,
            ingredientBatchId,
            quantityUsed,
            note: note || null,
          },
        ],
        { session }
      );

      // Collect for finished batch traceability
      ingredientBatchesUsed.push({
        ingredientBatchId: batch._id,
        quantityUsed,
      });
    }

    // ========================================
    // STEP 4: Create Finished Product Batch
    // ========================================
    const mfgDate = new Date();
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + (product.shelfLifeDays || 0));

    const dateStr = mfgDate.toISOString().split('T')[0].replace(/-/g, '');
    let batchCode = `BATCH-${dateStr}-${product.sku}`;

    // Ensure unique batch code
    let finalBatchCode = batchCode;
    let counter = 1;
    while (await Batch.findOne({ batchCode: finalBatchCode }).session(session)) {
      finalBatchCode = `${batchCode}-${counter}`;
      counter++;
    }

    const finishedBatch = await Batch.create(
      [
        {
          batchCode: finalBatchCode,
          productionPlanId: planId,
          productId,
          mfgDate,
          expDate,
          initialQuantity: actualQuantity,
          currentQuantity: actualQuantity,
          status: 'Active',
          ingredientBatchesUsed,
        },
      ],
      { session }
    );

    // ========================================
    // STEP 5: Update Production Plan
    // ========================================
    plan.details[detailIndex].actualQuantity = actualQuantity;
    plan.details[detailIndex].status = 'Completed';

    if (plan.status === 'Planned') {
      plan.status = 'In_Progress';
    }

    const allCompleted = plan.details.every((detail) => detail.status === 'Completed');
    if (allCompleted) {
      plan.status = 'Completed';
    }

    // ========================================
    // STEP 5b: Link Finished Batch to Orders + mark Ready_For_Shipping
    // ========================================
    if (plan.orders && plan.orders.length > 0) {
      const relatedOrders = await Order.find({
        _id: { $in: plan.orders },
        'items.productId': productId,
      }).session(session);

      for (const order of relatedOrders) {
        for (const item of order.items) {
          if (item.productId.toString() === productId) {
            item.batchId = finishedBatch[0]._id;
          }
        }
        order.status = 'Ready_For_Shipping';
        await order.save({ session });
      }
    }

    await plan.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // ========================================
    // STEP 6: Populate and Return Response
    // ========================================
    await plan.populate('details.productId', 'name sku price shelfLifeDays');
    await finishedBatch[0].populate('productId', 'name sku categoryId');

    res.status(201).json({
      success: true,
      message: 'Production item completed successfully',
      data: {
        plan,
        batch: finishedBatch[0],
        ingredientBatchesUsed,
      },
    });
  } catch (error) {
    if (!transactionAborted) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    session.endSession();
  }
};

const updateProductionPlanStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400);
      return next(new Error('Status is required'));
    }
    const validStatuses = ['Planned', 'In_Progress', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400);
      return next(new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`));
    }
    const plan = await ProductionPlan.findById(req.params.id);
    if (!plan) {
      res.status(404);
      return next(new Error('Production plan not found'));
    }
    if (status === 'Completed') {
      const allCompleted = plan.details.every(
        (detail) => detail.status === 'Completed'
      );
      if (!allCompleted) {
        res.status(400);
        return next(
          new Error('Cannot mark plan as Completed. Not all items are completed')
        );
      }
    }
    plan.status = status;
    await plan.save();
    await plan.populate('details.productId', 'name sku price shelfLifeDays');
    res.status(200).json({
      success: true,
      message: 'Production plan status updated successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProductionPlans,
  getProductionPlanById,
  createProductionPlan,
  updateProductionPlan,
  deleteProductionPlan,
  completeProductionItem,
  updateProductionPlanStatus,
};
