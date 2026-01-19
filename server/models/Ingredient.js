const mongoose = require('mongoose');

/**
 * Ingredient Schema for Kendo Mooncake Central Kitchen System
 * Represents raw materials used in production (e.g., "Bột mì", "Trứng muối")
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
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
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
  }
);

// Index for efficient queries
ingredientSchema.index({ ingredientName: 1 });

// Pre-save hook: Ensure unit is stored in lowercase
ingredientSchema.pre('save', function (next) {
  if (this.unit) {
    this.unit = this.unit.toLowerCase().trim();
  }
  next();
});

const Ingredient = mongoose.model('Ingredient', ingredientSchema);

module.exports = Ingredient;
