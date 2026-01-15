const express = require('express');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getCategories);
router.get('/:id', getCategoryById);

router.post('/', authorize('Admin', 'Manager'), createCategory);
router.put('/:id', authorize('Admin', 'Manager'), updateCategory);
router.delete('/:id', authorize('Admin', 'Manager'), deleteCategory);

module.exports = router;
