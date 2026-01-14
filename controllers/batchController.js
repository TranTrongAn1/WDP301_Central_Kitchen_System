const Batch = require('../models/BatchModel');

/**
 * @desc    Create a new batch
 * @route   POST /api/batches
 * @access  Public (you can add authentication later)
 */
const createBatch = async (req, res, next) => {
  try {
    const { batchCode, productId, mfgDate, expDate, currentQuantity } = req.body;

    // Check if batch code already exists
    const existingBatch = await Batch.findOne({ batchCode });
    if (existingBatch) {
      res.status(400);
      return next(new Error(`Batch with code ${batchCode} already exists`));
    }

    // Create new batch
    const batch = await Batch.create({
      batchCode,
      productId,
      mfgDate,
      expDate,
      currentQuantity,
    });

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
 * @access  Public
 */
const getBatches = async (req, res, next) => {
  try {
    const batches = await Batch.find().populate('productId', 'name code');

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
 * @access  Public
 */
const getBatchById = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id).populate('productId', 'name code');

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
 * @desc    Update batch
 * @route   PUT /api/batches/:id
 * @access  Public
 */
const updateBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      res.status(404);
      return next(new Error('Batch not found'));
    }

    const updatedBatch = await Batch.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

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
 * @access  Public
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
