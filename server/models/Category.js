const mongoose = require('mongoose');

/**
 * Category Schema for Kendo Mooncake Central Kitchen System
 * Used to classify Products (e.g., "Bánh Nướng", "Bánh Dẻo")
 */
const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
categorySchema.index({ categoryName: 1 });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
