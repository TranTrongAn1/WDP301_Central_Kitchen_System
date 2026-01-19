const express = require('express');
const {
  getStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
} = require('../controllers/storeController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// All authenticated users can view stores
router.get('/', getStores);
router.get('/:id', getStoreById);

// Admin and Manager can create/update stores
router.post('/', authorize('Admin', 'Manager'), createStore);
router.put('/:id', authorize('Admin', 'Manager'), updateStore);

// Only Admin can delete stores
router.delete('/:id', authorize('Admin'), deleteStore);

module.exports = router;
