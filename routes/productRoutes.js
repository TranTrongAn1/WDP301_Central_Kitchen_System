const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Routes accessible by all authenticated users
router.get('/', getProducts);
router.get('/:id', getProductById);

// Routes restricted to Admin and Manager only
router.post('/', authorize('Admin', 'Manager'), createProduct);
router.put('/:id', authorize('Admin', 'Manager'), updateProduct);
router.delete('/:id', authorize('Admin', 'Manager'), deleteProduct);

module.exports = router;
