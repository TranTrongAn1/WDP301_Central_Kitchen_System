const mongoose = require('mongoose');
const ProductionPlan = require('../models/ProductionPlan');
const Product = require('../models/Product');
const Batch = require('../models/BatchModel');

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
  // Start a transaction session for data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  let transactionAborted = false;

  try {
    const { planId } = req.params;
    const { productId, actualQuantity } = req.body;

    // ========================================
    // STEP 1: Validation
    // ========================================
    if (!productId || !actualQuantity || actualQuantity <= 0) {
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
      throw new Error(
        `Cannot complete items for plan with status '${plan.status}'`
      );
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
    // STEP 2: Fetch Product with Recipe
    // ========================================
    const product = await Product.findById(productId)
      .populate('recipe.ingredientId')
      .session(session);

    if (!product) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('Product not found');
    }

    if (!product.recipe || product.recipe.length === 0) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Product has no recipe defined. Cannot complete production.');
    }

    // ========================================
    // STEP 3: Check Ingredient Availability
    // ========================================
    const Ingredient = require('../models/Ingredient');
    const IngredientBatch = require('../models/IngredientBatch');

    for (const recipeItem of product.recipe) {
      const totalNeeded = actualQuantity * recipeItem.quantity;
      const ingredient = await Ingredient.findById(recipeItem.ingredientId._id).session(session);

      if (!ingredient) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(404);
        throw new Error(`Ingredient not found: ${recipeItem.ingredientId.ingredientName}`);
      }

      if (ingredient.totalQuantity < totalNeeded) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(400);
        throw new Error(
          `Insufficient inventory for ingredient '${ingredient.ingredientName}'. ` +
          `Required: ${totalNeeded} ${ingredient.unit}, Available: ${ingredient.totalQuantity} ${ingredient.unit}`
        );
      }
    }

    // ========================================
    // STEP 4: FEFO Deduction Logic
    // ========================================
    const ingredientBatchesUsed = [];

    for (const recipeItem of product.recipe) {
      let totalNeeded = actualQuantity * recipeItem.quantity;
      const ingredientId = recipeItem.ingredientId._id;

      // Fetch all active batches sorted by expiryDate (FEFO - First Expired First Out)
      const batches = await IngredientBatch.find({
        ingredientId: ingredientId,
        isActive: true,
        currentQuantity: { $gt: 0 },
      })
        .sort({ expiryDate: 1 }) // Ascending: oldest expiry date first
        .session(session);

      if (batches.length === 0) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(400);
        throw new Error(
          `No active batches found for ingredient '${recipeItem.ingredientId.ingredientName}'`
        );
      }

      // Deduct from batches using FEFO logic
      for (const batch of batches) {
        if (totalNeeded <= 0) break;

        const deductAmount = Math.min(batch.currentQuantity, totalNeeded);

        // Update batch current quantity
        batch.currentQuantity -= deductAmount;

        // If batch is fully consumed, mark as inactive
        if (batch.currentQuantity === 0) {
          batch.isActive = false;
        }

        await batch.save({ session });

        // Track traceability
        ingredientBatchesUsed.push({
          ingredientBatchId: batch._id,
          quantityUsed: deductAmount,
          ingredientName: recipeItem.ingredientId.ingredientName,
          batchCode: batch.batchCode,
        });

        totalNeeded -= deductAmount;
      }

      // Double-check: Ensure we deducted enough
      if (totalNeeded > 0) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(400);
        throw new Error(
          `Failed to deduct sufficient quantity for ingredient '${recipeItem.ingredientId.ingredientName}'. ` +
          `Remaining needed: ${totalNeeded}`
        );
      }

      // Update parent Ingredient totalQuantity
      const ingredient = await Ingredient.findById(ingredientId).session(session);
      const totalDeducted = actualQuantity * recipeItem.quantity;
      ingredient.totalQuantity -= totalDeducted;

      if (ingredient.totalQuantity < 0) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(500);
        throw new Error(
          `Data inconsistency detected for ingredient '${ingredient.ingredientName}'. ` +
          `Total quantity became negative.`
        );
      }

      await ingredient.save({ session });
    }

    // ========================================
    // STEP 5: Create Finished Product Batch
    // ========================================
    const mfgDate = new Date();
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + product.shelfLifeDays);

    // Generate batch code: BATCH-YYYYMMDD-SKU
    const dateStr = mfgDate.toISOString().split('T')[0].replace(/-/g, '');
    let batchCode = `BATCH-${dateStr}-${product.sku}`;

    // Ensure unique batch code
    let finalBatchCode = batchCode;
    let counter = 1;
    while (await Batch.findOne({ batchCode: finalBatchCode }).session(session)) {
      finalBatchCode = `${batchCode}-${counter}`;
      counter++;
    }

    // Create the finished product batch with traceability
    const batch = await Batch.create(
      [
        {
          batchCode: finalBatchCode,
          productionPlanId: planId,
          productId: productId,
          mfgDate: mfgDate,
          expDate: expDate,
          initialQuantity: actualQuantity,
          currentQuantity: actualQuantity,
          status: 'Active',
          ingredientBatchesUsed: ingredientBatchesUsed.map((item) => ({
            ingredientBatchId: item.ingredientBatchId,
            quantityUsed: item.quantityUsed,
          })),
        },
      ],
      { session }
    );

    // ========================================
    // STEP 6: Update Production Plan
    // ========================================
    plan.details[detailIndex].actualQuantity = actualQuantity;
    plan.details[detailIndex].status = 'Completed';

    // Update plan status to In_Progress if it was Planned
    if (plan.status === 'Planned') {
      plan.status = 'In_Progress';
    }

    // Check if all details are completed
    const allCompleted = plan.details.every(
      (detail) => detail.status === 'Completed'
    );
    if (allCompleted) {
      plan.status = 'Completed';
    }

    await plan.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // ========================================
    // STEP 7: Populate and Return Response
    // ========================================
    await plan.populate('details.productId', 'name sku price shelfLifeDays');
    await batch[0].populate('productId', 'name sku categoryId');

    res.status(201).json({
      success: true,
      message: 'Production item completed successfully',
      data: {
        plan: plan,
        batch: batch[0],
        traceability: {
          ingredientBatchesUsed: ingredientBatchesUsed,
          message: 'Ingredients deducted using FEFO (First Expired First Out) logic',
        },
      },
    });
  } catch (error) {
    // Rollback transaction on error (only if not already aborted)
    if (!transactionAborted) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    // End session
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
