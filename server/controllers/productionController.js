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
    const orders = await Order.find({ _id: { $in: orderIds } })
      .populate('items.productId')
      .session(session);

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
        const product = item.productId;
        const orderQty = item.quantity || item.quantityRequested || 0;

        if (!product || orderQty <= 0) {
          continue;
        }

        if (product.bundleItems && product.bundleItems.length > 0) {
          for (const bundleItem of product.bundleItems) {
            const childProductId = bundleItem.childProductId?.toString();
            const childQty = (bundleItem.quantity || 0) * orderQty;

            if (!childProductId || childQty <= 0) {
              continue;
            }

            quantityMap.set(childProductId, (quantityMap.get(childProductId) || 0) + childQty);
            totalProductsCount += childQty;
          }
        } else {
          const productIdKey = product._id?.toString() || product.toString();
          quantityMap.set(productIdKey, (quantityMap.get(productIdKey) || 0) + orderQty);
          totalProductsCount += orderQty;
        }
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
    const actualQty = Number(actualQuantity);

    // ========================================
    // STEP 1: Validation
    // ========================================
    if (!productId || !actualQty || actualQty <= 0) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Product ID and valid actual quantity are required');
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
    const product = await Product.findById(productId)
      .populate('recipe.ingredientId', 'ingredientName')
      .session(session);
    if (!product) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('Product not found');
    }

    // ========================================
    // STEP 3: Ingredient Deduction (Manual override OR Auto FEFO)
    // ========================================
    const ingredientBatchesUsed = [];
    const usageRecords = [];
    const isManualMode = Array.isArray(usedIngredients) && usedIngredients.length > 0;

    if (isManualMode) {
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

        const qtyUsed = Number(quantityUsed);

        // Find the batch
        const batch = await IngredientBatch.findById(ingredientBatchId).session(session);
        if (!batch) {
          transactionAborted = true;
          await session.abortTransaction();
          res.status(404);
          throw new Error(`Ingredient batch not found: ${ingredientBatchId}`);
        }

        // Check sufficient quantity
        if (batch.currentQuantity < qtyUsed) {
          transactionAborted = true;
          await session.abortTransaction();
          res.status(400);
          throw new Error(
            `Insufficient quantity in batch '${batch.batchCode}'. ` +
            `Available: ${batch.currentQuantity}, Requested: ${qtyUsed}`
          );
        }

        // Deduct from batch
        batch.currentQuantity -= qtyUsed;
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

        ingredient.totalQuantity -= qtyUsed;
        if (ingredient.totalQuantity < 0) {
          transactionAborted = true;
          await session.abortTransaction();
          res.status(500);
          throw new Error(
            `Data inconsistency: totalQuantity for ingredient '${ingredient.ingredientName}' would become negative`
          );
        }
        ingredient.reservedQuantity -= qtyUsed;
        // Đảm bảo không bị âm nếu bếp nhập hao hụt nhiều hơn mức hệ thống dự tính ban đầu
        if (ingredient.reservedQuantity < 0) ingredient.reservedQuantity = 0;
        await ingredient.save({ session });

        usageRecords.push({
          productionPlanId: planId,
          productId,
          ingredientId: batch.ingredientId,
          ingredientBatchId,
          quantityUsed: qtyUsed,
          note: note || null,
        });

        // Collect for finished batch traceability
        ingredientBatchesUsed.push({
          ingredientBatchId: batch._id,
          quantityUsed: qtyUsed,
        });
      }
    } else {
      // Auto FEFO mode: derive usage from product recipe and deduct earliest-expiring batches first.
      for (const recipeItem of product.recipe || []) {
        const ingredientRef = recipeItem.ingredientId;
        const ingredientId = ingredientRef?._id || ingredientRef;
        const ingredientName = ingredientRef?.ingredientName || ingredientId?.toString() || 'Unknown Ingredient';

        let totalNeeded = Number(recipeItem.quantity || 0) * actualQty;
        let consumedForIngredient = 0;
        if (totalNeeded <= 0) {
          continue;
        }

        const batches = await IngredientBatch.find({
          ingredientId,
          isActive: true,
          currentQuantity: { $gt: 0 },
        })
          .sort({ expiryDate: 1 })
          .session(session);

        for (const batch of batches) {
          if (totalNeeded <= 0) {
            break;
          }

          const deductAmount = Math.min(batch.currentQuantity, totalNeeded);
          batch.currentQuantity -= deductAmount;
          if (batch.currentQuantity === 0) {
            batch.isActive = false;
          }
          await batch.save({ session });

          usageRecords.push({
            productionPlanId: planId,
            productId,
            ingredientId,
            ingredientBatchId: batch._id,
            quantityUsed: deductAmount,
            note: null,
          });

          ingredientBatchesUsed.push({
            ingredientBatchId: batch._id,
            quantityUsed: deductAmount,
          });

          consumedForIngredient += deductAmount;
          totalNeeded -= deductAmount;
        }

        if (totalNeeded > 0) {
          transactionAborted = true;
          await session.abortTransaction();
          res.status(400);
          throw new Error(`Insufficient stock for ingredient ${ingredientName}.`);
        }

        const ingredient = await Ingredient.findById(ingredientId).session(session);
        if (!ingredient) {
          transactionAborted = true;
          await session.abortTransaction();
          res.status(404);
          throw new Error(`Parent ingredient not found for ingredient '${ingredientName}'`);
        }

        ingredient.totalQuantity -= consumedForIngredient;
        if (ingredient.totalQuantity < 0) {
          transactionAborted = true;
          await session.abortTransaction();
          res.status(500);
          throw new Error(
            `Data inconsistency: totalQuantity for ingredient '${ingredient.ingredientName}' would become negative`
          );
        }
        ingredient.reservedQuantity -= consumedForIngredient;
        // Đảm bảo không bị âm
        if (ingredient.reservedQuantity < 0) ingredient.reservedQuantity = 0;
        await ingredient.save({ session });
      }
    }

    if (usageRecords.length > 0) {
      await IngredientUsage.insertMany(usageRecords, { session });
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
          initialQuantity: actualQty,
          currentQuantity: actualQty,
          status: 'Active',
          ingredientBatchesUsed,
        },
      ],
      { session }
    );

    // ========================================
    // STEP 5: Update Production Plan
    // ========================================
    plan.details[detailIndex].actualQuantity = actualQty;
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
    updateAllProductsStockStatus().catch(console.error);
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
