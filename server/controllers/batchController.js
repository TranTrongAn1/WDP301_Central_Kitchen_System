const Batch = require('../models/BatchModel');
const Product = require('../models/Product');
const ProductionPlan = require('../models/ProductionPlan');

/**
 * @desc    Create a new batch
 * @route   POST /api/batches
 * @access  Private (Admin, Manager, KitchenStaff)
 */
const createBatch = async (req, res, next) => {
  try {
    const { 
      batchCode, 
      productionPlanId, 
      productId, 
      mfgDate, 
      expDate, 
      initialQuantity, 
      currentQuantity,
      status,
      ingredientBatchesUsed 
    } = req.body;

    // Check if batch code already exists
    const existingBatch = await Batch.findOne({ batchCode });
    if (existingBatch) {
      res.status(400);
      return next(new Error(`Batch with code ${batchCode} already exists`));
    }

    // Validate production plan exists (CRITICAL for traceability)
    const productionPlan = await ProductionPlan.findById(productionPlanId);
    if (!productionPlan) {
      res.status(400);
      return next(new Error('Invalid production plan'));
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(400);
      return next(new Error('Invalid product'));
    }

    // Validate expiration date is after manufacturing date
    if (expDate && mfgDate && new Date(expDate) <= new Date(mfgDate)) {
      res.status(400);
      return next(new Error('Expiration date must be after manufacturing date'));
    }

    // Create new batch with all required fields
    const batch = await Batch.create({
      batchCode,
      productionPlanId,
      productId,
      mfgDate: mfgDate || Date.now(),
      expDate,
      initialQuantity,
      currentQuantity: currentQuantity || initialQuantity,
      status: status || 'Active',
      ingredientBatchesUsed: ingredientBatchesUsed || [],
    });

    await batch.populate([
      { path: 'productId', select: 'name sku price shelfLifeDays categoryId' },
      { path: 'productionPlanId', select: 'planCode planDate status' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all batches
 * @route   GET /api/batches
 * @access  Private (All authenticated users)
 */
const getBatches = async (req, res, next) => {
  try {
    const { expiring, productId, status, productionPlanId } = req.query;
    const filter = {};

    // Filter by product
    if (productId) {
      filter.productId = productId;
    }

    // Filter by production plan
    if (productionPlanId) {
      filter.productionPlanId = productionPlanId;
    }

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Filter expiring batches (within next X days, default 7)
    if (expiring) {
      const days = parseInt(expiring) || 7;
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);
      filter.expDate = { $gte: today, $lte: futureDate };
    }

    const batches = await Batch.find(filter)
      .populate('productId', 'name sku price shelfLifeDays categoryId')
      .populate('productionPlanId', 'planCode planDate status')
      .sort({ expDate: 1 });

    res.status(200).json({
      success: true,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single batch by ID
 * @route   GET /api/batches/:id
 * @access  Private
 */
const getBatchById = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('productId', 'name sku price shelfLifeDays categoryId')
      .populate('productionPlanId', 'planCode planDate status note');

    if (!batch) {
      res.status(404);
      return next(new Error('Batch not found'));
    }

    res.status(200).json({
      success: true,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update batch (mainly for quantity adjustments)
 * @route   PUT /api/batches/:id
 * @access  Private (Admin, Manager)
 */
const updateBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      res.status(404);
      return next(new Error('Batch not found'));
    }

    // Validate product if being changed
    if (req.body.productId && req.body.productId !== batch.productId.toString()) {
      const product = await Product.findById(req.body.productId);
      if (!product) {
        res.status(400);
        return next(new Error('Invalid product'));
      }
    }

    // Validate production plan if being changed
    if (req.body.productionPlanId && req.body.productionPlanId !== batch.productionPlanId.toString()) {
      const productionPlan = await ProductionPlan.findById(req.body.productionPlanId);
      if (!productionPlan) {
        res.status(400);
        return next(new Error('Invalid production plan'));
      }
    }

    // Validate expiration date if being changed
    if (req.body.expDate && req.body.mfgDate) {
      if (new Date(req.body.expDate) <= new Date(req.body.mfgDate)) {
        res.status(400);
        return next(new Error('Expiration date must be after manufacturing date'));
      }
    } else if (req.body.expDate) {
      if (new Date(req.body.expDate) <= batch.mfgDate) {
        res.status(400);
        return next(new Error('Expiration date must be after manufacturing date'));
      }
    }

    const updatedBatch = await Batch.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    )
    .populate('productId', 'name sku price shelfLifeDays categoryId')
    .populate('productionPlanId', 'planCode planDate status');

    res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      data: updatedBatch,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete batch
 * @route   DELETE /api/batches/:id
 * @access  Private (Admin, Manager)
 */
const deleteBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      res.status(404);
      return next(new Error('Batch not found'));
    }

    await batch.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Batch deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
};
