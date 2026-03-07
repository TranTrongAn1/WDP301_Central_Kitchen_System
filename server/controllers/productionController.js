const mongoose = require('mongoose');
const ProductionPlan = require('../models/ProductionPlan');
const Product = require('../models/Product');
const Batch = require('../models/BatchModel');
const Ingredient = require('../models/Ingredient');
const IngredientBatch = require('../models/IngredientBatch');
const IngredientUsage = require('../models/IngredientUsage');

const getProductionPlans = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
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
  try {
    const { planCode, planDate, note, details } = req.body;
    const existingPlan = await ProductionPlan.findOne({ planCode });
    if (existingPlan) {
      res.status(400);
      return next(new Error('Production plan with this code already exists'));
    }
    if (!details || details.length === 0) {
      res.status(400);
      return next(
        new Error('Production plan must have at least one product detail')
      );
    }
    for (const detail of details) {
      const product = await Product.findById(detail.productId);
      if (!product) {
        res.status(400);
        return next(new Error(`Invalid product ID: ${detail.productId}`));
      }
    }
    const plan = await ProductionPlan.create({
      planCode,
      planDate: planDate || Date.now(),
      note,
      details,
    });
    await plan.populate('details.productId', 'name sku price shelfLifeDays');
    res.status(201).json({
      success: true,
      message: 'Production plan created successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

const updateProductionPlan = async (req, res, next) => {
  try {
    let plan = await ProductionPlan.findById(req.params.id);
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
    if (req.body.details) {
      for (const detail of req.body.details) {
        const product = await Product.findById(detail.productId);
        if (!product) {
          res.status(400);
          return next(new Error(`Invalid product ID: ${detail.productId}`));
        }
      }
    }
    plan = await ProductionPlan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('details.productId', 'name sku price shelfLifeDays');
    res.status(200).json({
      success: true,
      message: 'Production plan updated successfully',
      data: plan,
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
