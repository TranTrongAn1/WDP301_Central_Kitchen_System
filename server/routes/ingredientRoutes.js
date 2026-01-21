const express = require('express');
const {
  getIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  addBatch,
  getBatchesByIngredient,
} = require('../controllers/ingredientController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getIngredients);
router.get('/:id', getIngredientById);

// Batch Management Routes
router.post('/:id/batches', authorize('Admin', 'Kitchen_Manager', 'Manager'), addBatch);
router.get('/:id/batches', getBatchesByIngredient);

router.post('/', authorize('Admin', 'Kitchen_Manager', 'Manager'), createIngredient);
router.put('/:id', authorize('Admin', 'Kitchen_Manager', 'Manager'), updateIngredient);
router.delete('/:id', authorize('Admin', 'Kitchen_Manager', 'Manager'), deleteIngredient);

module.exports = router;
