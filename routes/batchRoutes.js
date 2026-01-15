const express = require('express');
const {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
} = require('../controllers/batchController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Read routes - accessible by all authenticated users
// StoreStaff can check batches and expiry dates
router.get('/', getBatches);
router.get('/:id', getBatchById);

// Write routes - restricted to Admin, Manager, KitchenStaff
router.post('/', authorize('Admin', 'Manager', 'KitchenStaff'), createBatch);
router.put('/:id', authorize('Admin', 'Manager'), updateBatch);
router.delete('/:id', authorize('Admin', 'Manager'), deleteBatch);

module.exports = router;
