const express = require('express');
const {
  getStoreInventory,
  getAllInventory,
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/all', authorize('Admin', 'Manager'), getAllInventory);

router.get('/store/:storeId', getStoreInventory);

module.exports = router;
