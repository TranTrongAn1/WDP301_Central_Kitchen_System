const express = require('express');
const {
  getIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  addBatch,
} = require('../controllers/ingredientController');
const { getBatchesByIngredientId } = require('../controllers/ingredientBatchController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getIngredients);
router.get('/:id', getIngredientById);

// Batch Management Routes
router.post('/:id/batches', authorize('Admin', 'KitchenStaff', 'Manager'), addBatch);
router.get('/:id/batches', getBatchesByIngredientId);

router.post('/', authorize('Admin', 'KitchenStaff', 'Manager'), createIngredient);
router.put('/:id', authorize('Admin', 'KitchenStaff', 'Manager'), updateIngredient);
router.delete('/:id', authorize('Admin', 'KitchenStaff', 'Manager'), deleteIngredient);

module.exports = router;
