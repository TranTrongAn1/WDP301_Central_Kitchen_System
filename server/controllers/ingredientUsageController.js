const asyncHandler = require('express-async-handler');
const IngredientUsage = require('../models/IngredientUsage');

/**
 * @desc    Get all ingredient usage records (read-only audit log)
 * @route   GET /api/ingredient-usages
 * @access  Private (All authenticated users)
 */
const getIngredientUsages = asyncHandler(async (req, res) => {
  const {
    productionPlanId,
    productId,
    ingredientId,
    ingredientBatchId,
    startDate,
    endDate,
  } = req.query;

  const query = {};

  if (productionPlanId) {
    query.productionPlanId = productionPlanId;
  }

  if (productId) {
    query.productId = productId;
  }

  if (ingredientId) {
    query.ingredientId = ingredientId;
  }

  if (ingredientBatchId) {
    query.ingredientBatchId = ingredientBatchId;
  }

  // Date range filter on recordedAt
  if (startDate || endDate) {
    query.recordedAt = {};
    if (startDate) {
      query.recordedAt.$gte = new Date(startDate);
    }
    if (endDate) {
      // Include the full end day by setting time to end of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.recordedAt.$lte = end;
    }
  }

  const usages = await IngredientUsage.find(query)
    .populate('productionPlanId', 'planCode')
    .populate('productId', 'name sku')
    .populate('ingredientId', 'ingredientName unit')
    .populate('ingredientBatchId', 'batchCode')
    .sort({ recordedAt: -1 });

  res.status(200).json({
    success: true,
    count: usages.length,
    data: usages,
  });
});

module.exports = { getIngredientUsages };
