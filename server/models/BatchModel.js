const mongoose = require('mongoose');

/**
 * Batch Schema for Kendo Mooncake Central Kitchen System
 * Represents a production batch with manufacturing and expiration tracking
 * Includes full traceability linking to Production Plan
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
    productionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionPlan',
      required: [true, 'Production Plan ID is required'],
      index: true,
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
    status: {
      type: String,
      enum: {
        values: ['Active', 'SoldOut', 'Expired', 'Recalled'],
        message: '{VALUE} is not a valid status',
      },
      default: 'Active',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for optimal query performance
batchSchema.index({ productionPlanId: 1 }); // Traceability: find batches by plan
batchSchema.index({ productId: 1, expDate: 1 }); // FEFO logic: First Expired First Out
batchSchema.index({ expDate: 1 }); // Expiration monitoring
batchSchema.index({ status: 1 }); // Filter by status

// Virtual property: Check if batch is expired
batchSchema.virtual('isExpired').get(function () {
  return this.expDate < Date.now();
});

const Batch = mongoose.model('Batch', batchSchema);

module.exports = Batch;
