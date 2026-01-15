const mongoose = require('mongoose');

/**
 * Product Schema for Kendo Mooncake Central Kitchen System
 * Represents products with recipe and bundle capabilities
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    shelfLifeDays: {
      type: Number,
      required: [true, 'Shelf life days is required'],
      min: [1, 'Shelf life must be at least 1 day'],
    },
    image: {
      type: String,
      trim: true,
      match: [
        /^https?:\/\/.+/,
        'Image must be a valid URL',
      ],
    },
    // Recipe: Array of ingredients with quantities
    recipe: [
      {
        ingredientId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Ingredient',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [0, 'Quantity cannot be negative'],
        },
      },
    ],
    // Bundle Items: Array of child products for combo products
    bundleItems: [
      {
        childProductId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Bundle quantity must be at least 1'],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Validate that a product cannot reference itself in bundleItems
productSchema.pre('save', function () {
  if (this.bundleItems && this.bundleItems.length > 0) {
    const hasSelfReference = this.bundleItems.some(
      (item) => item.childProductId.toString() === this._id.toString()
    );
    if (hasSelfReference) {
      throw new Error('A product cannot be bundled with itself');
    }
  }
});

// Index for faster queries (sku already has unique index)
productSchema.index({ categoryId: 1 });
productSchema.index({ name: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
