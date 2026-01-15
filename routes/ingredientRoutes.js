const express = require('express');
const {
  getIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
} = require('../controllers/ingredientController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Routes accessible by all authenticated users
router.get('/', getIngredients);
router.get('/:id', getIngredientById);

// Routes restricted to Admin and Manager only
router.post('/', authorize('Admin', 'Manager'), createIngredient);
router.put('/:id', authorize('Admin', 'Manager'), updateIngredient);
router.delete('/:id', authorize('Admin', 'Manager'), deleteIngredient);

module.exports = router;
