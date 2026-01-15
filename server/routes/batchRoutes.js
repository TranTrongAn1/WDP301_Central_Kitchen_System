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

router.use(protect);

router.get('/', getBatches);
router.get('/:id', getBatchById);

router.post('/', authorize('Admin', 'Manager', 'KitchenStaff'), createBatch);
router.put('/:id', authorize('Admin', 'Manager'), updateBatch);
router.delete('/:id', authorize('Admin', 'Manager'), deleteBatch);

module.exports = router;
