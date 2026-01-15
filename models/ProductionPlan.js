const mongoose = require('mongoose');

/**
 * ProductionPlan Schema for Kendo Mooncake Central Kitchen System
 * Represents production plans with multiple products
 */
const productionPlanSchema = new mongoose.Schema(
  {
    planCode: {
      type: String,
      required: [true, 'Plan code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    planDate: {
      type: Date,
      required: [true, 'Plan date is required'],
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: ['Planned', 'In_Progress', 'Completed', 'Cancelled'],
        message: '{VALUE} is not a valid status',
      },
      default: 'Planned',
    },
    note: {
      type: String,
      trim: true,
    },
    // Details: Array of products to be produced
    details: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        plannedQuantity: {
          type: Number,
          required: [true, 'Planned quantity is required'],
          min: [1, 'Planned quantity must be at least 1'],
        },
        actualQuantity: {
          type: Number,
          default: 0,
          min: [0, 'Actual quantity cannot be negative'],
        },
        status: {
          type: String,
          enum: {
            values: ['Pending', 'In_Progress', 'Completed', 'Cancelled'],
            message: '{VALUE} is not a valid detail status',
          },
          default: 'Pending',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Validate that details array is not empty
productionPlanSchema.pre('save', function () {
  if (!this.details || this.details.length === 0) {
    throw new Error('Production plan must have at least one product detail');
  }
});

// Index for faster queries
productionPlanSchema.index({ planDate: -1 });
productionPlanSchema.index({ status: 1 });

const ProductionPlan = mongoose.model('ProductionPlan', productionPlanSchema);

module.exports = ProductionPlan;
