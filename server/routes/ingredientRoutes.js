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

router.use(protect);

router.get('/', getIngredients);
router.get('/:id', getIngredientById);

router.post('/', authorize('Admin', 'Manager'), createIngredient);
router.put('/:id', authorize('Admin', 'Manager'), updateIngredient);
router.delete('/:id', authorize('Admin', 'Manager'), deleteIngredient);

module.exports = router;
