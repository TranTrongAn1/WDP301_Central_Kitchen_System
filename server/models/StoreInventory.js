const mongoose = require('mongoose');

/**
 * StoreInventory Schema for Kendo Mooncake Central Kitchen System
 * Tracks current stock at each store location
 */
const storeInventorySchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store ID is required'],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch ID is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate entries (same store + same batch)
storeInventorySchema.index({ storeId: 1, batchId: 1 }, { unique: true });

// Additional indexes for faster queries
storeInventorySchema.index({ storeId: 1, productId: 1 });
storeInventorySchema.index({ storeId: 1 });

// Update lastUpdated on save
storeInventorySchema.pre('save', function () {
  this.lastUpdated = Date.now();
});

const StoreInventory = mongoose.model('StoreInventory', storeInventorySchema);

module.exports = StoreInventory;
