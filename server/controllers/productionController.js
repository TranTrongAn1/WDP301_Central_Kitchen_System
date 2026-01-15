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
  try {
    const { planId } = req.params;
    const { productId, actualQuantity } = req.body;

    if (!productId || !actualQuantity || actualQuantity <= 0) {
      res.status(400);
      return next(
        new Error('Product ID and valid actual quantity are required')
      );
    }

    const plan = await ProductionPlan.findById(planId);
    if (!plan) {
      res.status(404);
      return next(new Error('Production plan not found'));
    }

    if (plan.status === 'Completed' || plan.status === 'Cancelled') {
      res.status(400);
      return next(
        new Error(
          `Cannot complete items for plan with status '${plan.status}'`
        )
      );
    }

    const detailIndex = plan.details.findIndex(
      (detail) => detail.productId.toString() === productId
    );

    if (detailIndex === -1) {
      res.status(404);
      return next(new Error('Product not found in this production plan'));
    }

    if (plan.details[detailIndex].status === 'Completed') {
      res.status(400);
      return next(new Error('This production item is already completed'));
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    // Calculate dates
    const mfgDate = new Date();
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + product.shelfLifeDays);

    // Generate batch code: BATCH-YYYYMMDD-SKU
    const dateStr = mfgDate.toISOString().split('T')[0].replace(/-/g, '');
    const batchCode = `BATCH-${dateStr}-${product.sku}`;

    // Check if batch code already exists, add suffix if needed
    let finalBatchCode = batchCode;
    let counter = 1;
    while (await Batch.findOne({ batchCode: finalBatchCode })) {
      finalBatchCode = `${batchCode}-${counter}`;
      counter++;
    }

    // Create the batch automatically
    const batch = await Batch.create({
      batchCode: finalBatchCode,
      productId: productId,
      mfgDate: mfgDate,
      expDate: expDate,
      initialQuantity: actualQuantity,
      currentQuantity: actualQuantity,
    });

    // Update the production plan detail
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

    await plan.save();

    // Populate and return
    await plan.populate('details.productId', 'name sku price shelfLifeDays');
    await batch.populate('productId', 'name sku categoryId');

    res.status(201).json({
      success: true,
      message: 'Production item completed and batch created successfully',
      data: {
        plan: plan,
        batch: batch,
      },
    });
  } catch (error) {
    next(error);
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
