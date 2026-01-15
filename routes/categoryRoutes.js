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

// All routes require authentication
router.use(protect);

// Routes accessible by all authenticated users
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Routes restricted to Admin and Manager only
router.post('/', authorize('Admin', 'Manager'), createCategory);
router.put('/:id', authorize('Admin', 'Manager'), updateCategory);
router.delete('/:id', authorize('Admin', 'Manager'), deleteCategory);

module.exports = router;
