const mongoose = require('mongoose');

/**
 * Ingredient Schema for Kendo Mooncake Central Kitchen System
 * Represents raw materials used in production (e.g., "Bột mì", "Trứng muối")
 * 
 * NOTE: Quantity is no longer stored directly in this model.
 * Use IngredientBatch model for batch-level tracking with FEFO (First Expired First Out).
 */
const ingredientSchema = new mongoose.Schema(
  {
    ingredientName: {
      type: String,
      required: [true, 'Ingredient name is required'],
      trim: true,
      unique: true,
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      lowercase: true,
      trim: true,
    },
    warningThreshold: {
      type: Number,
      required: [true, 'Warning threshold is required'],
      default: 10,
      min: [0, 'Warning threshold cannot be negative'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for efficient queries
ingredientSchema.index({ ingredientName: 1 });

// Virtual field: totalQuantity (calculated from all active batches)
// This is read-only and computed on-the-fly
ingredientSchema.virtual('totalQuantity', {
  ref: 'IngredientBatch',
  localField: '_id',
  foreignField: 'ingredientId',
  justOne: false,
  options: { match: { isActive: true, currentQuantity: { $gt: 0 } } },
});

// Pre-save hook: Ensure unit is stored in lowercase
ingredientSchema.pre('save', function (next) {
  if (this.unit) {
    this.unit = this.unit.toLowerCase().trim();
  }
  next();
});

// Instance method: Get total quantity from all active batches
ingredientSchema.methods.getTotalQuantity = async function () {
  const IngredientBatch = require('./IngredientBatch');
  const batches = await IngredientBatch.find({
    ingredientId: this._id,
    isActive: true,
    currentQuantity: { $gt: 0 },
  });
  return batches.reduce((total, batch) => total + batch.currentQuantity, 0);
};

// Instance method: Check if ingredient is below warning threshold
ingredientSchema.methods.isBelowThreshold = async function () {
  const totalQuantity = await this.getTotalQuantity();
  return totalQuantity < this.warningThreshold;
};

const Ingredient = mongoose.model('Ingredient', ingredientSchema);

module.exports = Ingredient;
