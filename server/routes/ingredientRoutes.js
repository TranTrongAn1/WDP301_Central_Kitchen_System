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
router.post('/:id/batches', authorize('Admin', 'Kitchen_Manager', 'Manager'), addBatch);
router.get('/:id/batches', getBatchesByIngredientId);

router.post('/', authorize('Admin', 'Kitchen_Manager', 'Manager'), createIngredient);
router.put('/:id', authorize('Admin', 'Kitchen_Manager', 'Manager'), updateIngredient);
router.delete('/:id', authorize('Admin', 'Kitchen_Manager', 'Manager'), deleteIngredient);

module.exports = router;
