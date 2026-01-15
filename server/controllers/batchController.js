const Batch = require('../models/BatchModel');
const Product = require('../models/Product');

/**
 * @desc    Create a new batch
 * @route   POST /api/batches
 * @access  Private (Admin, Manager, KitchenStaff)
 */
const createBatch = async (req, res, next) => {
  try {
    const { batchCode, productId, mfgDate, expDate, initialQuantity, currentQuantity } = req.body;

    // Check if batch code already exists
    const existingBatch = await Batch.findOne({ batchCode });
    if (existingBatch) {
      res.status(400);
      return next(new Error(`Batch with code ${batchCode} already exists`));
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(400);
      return next(new Error('Invalid product'));
    }

    // Create new batch
    const batch = await Batch.create({
      batchCode,
      productId,
      mfgDate: mfgDate || Date.now(),
      expDate,
      initialQuantity: initialQuantity || currentQuantity,
      currentQuantity,
    });

    await batch.populate('productId', 'name sku price shelfLifeDays');

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
    const { expiring, productId } = req.query;
    const filter = {};

    // Filter by product
    if (productId) {
      filter.productId = productId;
    }

    // Filter expiring batches (within next 7 days)
    if (expiring === 'true') {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      filter.expDate = { $gte: today, $lte: nextWeek };
    }

    const batches = await Batch.find(filter)
      .populate('productId', 'name sku price shelfLifeDays categoryId')
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
    const batch = await Batch.findById(req.params.id).populate('productId', 'name sku price shelfLifeDays categoryId');

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

    const updatedBatch = await Batch.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).populate('productId', 'name sku price shelfLifeDays categoryId');

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
