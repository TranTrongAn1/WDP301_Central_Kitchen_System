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

router.use(protect);

router.get('/', getProducts);
router.get('/:id', getProductById);

router.post('/', authorize('Admin', 'Manager'), createProduct);
router.put('/:id', authorize('Admin', 'Manager'), updateProduct);
router.delete('/:id', authorize('Admin', 'Manager'), deleteProduct);

module.exports = router;
