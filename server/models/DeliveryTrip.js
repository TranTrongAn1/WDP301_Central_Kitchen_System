const mongoose = require('mongoose');

/**
 * Generate unique trip code
 * Format: TRIP-YYYYMMDD-RANDOM
 */
const generateTripCode = () => {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `TRIP-${dateStr}-${random}`;
};

/**
 * DeliveryTrip Schema for Kendo Mooncake Central Kitchen System
 * Represents delivery trips that can contain multiple orders
 */
const deliveryTripSchema = new mongoose.Schema(
  {
    tripCode: {
      type: String,
      unique: true,
      uppercase: true,
      default: generateTripCode,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Driver is required'],
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],
    status: {
      type: String,
      enum: {
        values: ['Pending', 'In_Transit', 'Completed', 'Cancelled'],
        message: '{VALUE} is not a valid status',
      },
      default: 'Pending',
    },
    departureTime: {
      type: Date,
    },
    completedTime: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Validate that orders array is not empty
deliveryTripSchema.pre('save', function () {
  if (!this.orders || this.orders.length === 0) {
    throw new Error('Delivery trip must have at least one order');
  }
});

// Indexes for faster queries
deliveryTripSchema.index({ driverId: 1 });
deliveryTripSchema.index({ status: 1 });
deliveryTripSchema.index({ tripCode: 1 });

const DeliveryTrip = mongoose.model('DeliveryTrip', deliveryTripSchema);

module.exports = DeliveryTrip;
