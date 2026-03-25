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
    weight: {
      type: Number,
      default: 0.5, 
      min: [0, 'Weight cannot be negative'],
      description: 'Weight of one unit of the product in KG for logistics calculation',
    },
    weightUnit: {
      type: String,
      default: 'kg',
      trim: true,
    },
    image: {
      type: String,
      trim: true,
      match: [
        /^https?:\/\/.+/,
        'Image must be a valid URL',
      ],
    },
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
    isActive: {
      type: Boolean,
      default: true,
      description: 'Quyết định kinh doanh: Sản phẩm có còn được bán/hiển thị trên hệ thống không'
    },
    isOutOfStock: {
      type: Boolean,
      default: false,
      description: 'Trạng thái kho: True nếu tạm thời hết nguyên liệu để sản xuất'
    },
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

// Index for faster queries
productSchema.index({ categoryId: 1 });
productSchema.index({ name: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isOutOfStock: 1 }); 

const Product = mongoose.model('Product', productSchema);

module.exports = Product;