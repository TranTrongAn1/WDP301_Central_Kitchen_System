const mongoose = require('mongoose');

/**
 * Category Schema for Kendo Mooncake Central Kitchen System
 * Represents product categories
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// No need for manual index on name - unique: true already creates it

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
