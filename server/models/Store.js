const mongoose = require('mongoose');

/**
 * Store Schema for Kendo Mooncake Central Kitchen System
 * Represents physical store locations
 */
const storeSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Store address is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    status: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
storeSchema.index({ storeName: 1 });
storeSchema.index({ status: 1 });

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;
