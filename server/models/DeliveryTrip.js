const mongoose = require('mongoose');

/**
 * Export Detail Schema (Embedded)
 * Represents individual items being exported in a delivery trip
 */
const exportDetailSchema = new mongoose.Schema(
  {
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
      min: [1, 'Quantity must be at least 1'],
    },
  },
  { _id: false }
);

/**
 * DeliveryTrip Schema for Kendo Mooncake Central Kitchen System
 * Represents the "Export Slip" - tracks delivery of products from central kitchen to stores
 */
const deliveryTripSchema = new mongoose.Schema(
  {
    tripNumber: {
      type: String,
      required: [true, 'Trip number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store ID is required'],
      index: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    exportDetails: {
      type: [exportDetailSchema],
      required: [true, 'Export details are required'],
      validate: {
        validator: function (details) {
          return details && details.length > 0;
        },
        message: 'Delivery trip must contain at least one export detail',
      },
    },
    departureDate: {
      type: Date,
      required: [true, 'Departure date is required'],
      default: Date.now,
    },
    estimatedArrival: {
      type: Date,
      required: [true, 'Estimated arrival is required'],
      validate: {
        validator: function (value) {
          return value >= this.departureDate;
        },
        message: 'Estimated arrival cannot be before departure date',
      },
    },
    actualArrival: {
      type: Date,
      validate: {
        validator: function (value) {
          return !value || value >= this.departureDate;
        },
        message: 'Actual arrival cannot be before departure date',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['In_Transit', 'Completed', 'Cancelled'],
        message: '{VALUE} is not a valid delivery trip status',
      },
      default: 'In_Transit',
      required: true,
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
deliveryTripSchema.index({ tripNumber: 1 });
deliveryTripSchema.index({ orderId: 1 });
deliveryTripSchema.index({ storeId: 1, departureDate: -1 });
deliveryTripSchema.index({ status: 1 });
deliveryTripSchema.index({ driverId: 1 });

// Pre-save hook to set actualArrival when status is Completed
deliveryTripSchema.pre('save', function () {
  if (this.isModified('status') && this.status === 'Completed' && !this.actualArrival) {
    this.actualArrival = new Date();
  }
});

module.exports = mongoose.model('DeliveryTrip', deliveryTripSchema);
