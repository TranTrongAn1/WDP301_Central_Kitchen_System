const express = require('express');
const router = express.Router();
const {
  getAllBatches,
  getBatchById,
  updateBatch,
} = require('../controllers/ingredientBatchController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/ingredient-batches
 * @desc    Get all ingredient batches
 * @access  Private (All authenticated users)
 */
router.get('/', protect, getAllBatches);

/**
 * @route   GET /api/ingredient-batches/:id
 * @desc    Get single ingredient batch by ID
 * @access  Private (All authenticated users)
 */
router.get('/:id', protect, getBatchById);

/**
 * @route   PUT /api/ingredient-batches/:id
 * @desc    Update ingredient batch
 * @access  Private (Admin, Kitchen_Manager, Manager only)
 */
router.put('/:id', protect, authorize('Admin', 'Kitchen_Manager', 'Manager'), updateBatch);

module.exports = router;
