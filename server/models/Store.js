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
      unique: true,
    },
    storeCode: {
      type: String,
      required: [true, 'Store code is required'],
      trim: true,
      unique: true,
      uppercase: true,
    },
    address: {
      type: String,
      required: [true, 'Store address is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    standardDeliveryMinutes: {
      type: Number,
      required: [true, 'Standard delivery minutes is required'],
      default: 30,
      min: [0, 'Delivery minutes cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Inactive', 'Maintenance'],
        message: '{VALUE} is not a valid status',
      },
      default: 'Active',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
storeSchema.index({ storeName: 1 });
storeSchema.index({ storeCode: 1 }, { unique: true });
storeSchema.index({ status: 1 });

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;
