const mongoose = require('mongoose');

/**
<<<<<<< Updated upstream
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
=======
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
>>>>>>> Stashed changes
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
<<<<<<< Updated upstream
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
=======
      required: [true, 'Driver is required'],
>>>>>>> Stashed changes
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
<<<<<<< Updated upstream
    notes: {
      type: String,
      trim: true,
=======
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
>>>>>>> Stashed changes
    },
  },
  {
    timestamps: true,
  }
);

<<<<<<< Updated upstream
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
=======
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
>>>>>>> Stashed changes
