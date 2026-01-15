const mongoose = require('mongoose');

/**
 * Ingredient Schema for Kendo Mooncake Central Kitchen System
 * Represents raw materials and ingredients used in production
 */
const ingredientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Ingredient name is required'],
      trim: true,
      unique: true,
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      enum: {
        values: ['kg', 'g', 'l', 'ml', 'pcs'],
        message: '{VALUE} is not a valid unit',
      },
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    warningThreshold: {
      type: Number,
      default: 10,
      min: [0, 'Warning threshold cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// No need for manual index on name - unique: true already creates it

const Ingredient = mongoose.model('Ingredient', ingredientSchema);

module.exports = Ingredient;
