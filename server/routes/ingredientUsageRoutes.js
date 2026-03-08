const express = require('express');
const router = express.Router();
const { getIngredientUsages } = require('../controllers/ingredientUsageController');
const { protect } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/ingredient-usages
 * @desc    Get all ingredient usage records (audit log)
 * @access  Private (All authenticated users)
 */
router.get('/', protect, getIngredientUsages);

module.exports = router;
