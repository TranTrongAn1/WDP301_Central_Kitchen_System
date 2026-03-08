const mongoose = require('mongoose');

/**
 * IngredientUsage Schema for Kendo Mooncake Central Kitchen System
 * Records the manual usage of ingredient batches during production.
 * Provides full traceability: Production Plan → Product → Ingredient Batch → Quantity Used
 */
const ingredientUsageSchema = new mongoose.Schema(
  {
    productionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionPlan',
      required: [true, 'Production Plan ID is required'],
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true,
    },
    ingredientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: [true, 'Ingredient ID is required'],
      index: true,
    },
    ingredientBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IngredientBatch',
      required: [true, 'Ingredient Batch ID is required'],
      index: true,
    },
    quantityUsed: {
      type: Number,
      required: [true, 'Quantity used is required'],
      min: [0, 'Quantity used cannot be negative'],
    },
    note: {
      type: String,
      trim: true,
      default: null,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying all usage records within a production plan
ingredientUsageSchema.index({ productionPlanId: 1, productId: 1 });

// Compound index for querying usage history of a specific ingredient batch
ingredientUsageSchema.index({ ingredientBatchId: 1, recordedAt: -1 });

const IngredientUsage = mongoose.model('IngredientUsage', ingredientUsageSchema);

module.exports = IngredientUsage;
