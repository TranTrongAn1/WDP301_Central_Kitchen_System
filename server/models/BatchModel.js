const mongoose = require('mongoose');

/**
 * Batch Schema for Kendo Mooncake Central Kitchen System
 * Represents a production batch with manufacturing and expiration tracking
 */
const batchSchema = new mongoose.Schema(
  {
    batchCode: {
      type: String,
      required: [true, 'Batch code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    mfgDate: {
      type: Date,
      required: [true, 'Manufacturing date is required'],
      default: Date.now,
    },
    expDate: {
      type: Date,
      required: [true, 'Expiration date is required'],
      validate: {
        validator: function (value) {
          return value > this.mfgDate;
        },
        message: 'Expiration date must be after manufacturing date',
      },
    },
    initialQuantity: {
      type: Number,
      required: [true, 'Initial quantity is required'],
      min: [0, 'Initial quantity cannot be negative'],
    },
    currentQuantity: {
      type: Number,
      required: [true, 'Current quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries (batchCode already has unique index)
batchSchema.index({ productId: 1 });
batchSchema.index({ expDate: 1 });

const Batch = mongoose.model('Batch', batchSchema);

module.exports = Batch;
