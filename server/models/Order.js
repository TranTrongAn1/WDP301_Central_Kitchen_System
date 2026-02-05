const mongoose = require('mongoose');

/**
 * Generate unique order code
 * Format: ORD-YYYYMMDD-RANDOM
 */
const generateOrderCode = () => {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `ORD-${dateStr}-${random}`;
};

/**
 * Order Schema for Kendo Mooncake Central Kitchen System
 * Represents orders from stores to central kitchen
 */
const orderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      unique: true,
      uppercase: true,
      default: generateOrderCode,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store is required'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Approved', 'In_Transit', 'Received', 'Cancelled'],
        message: '{VALUE} is not a valid status',
      },
      default: 'Pending',
    },
    requestedDeliveryDate: {
      type: Date,
      required: [true, 'Requested delivery date is required'],
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: [true, 'Quantity is required'],
          min: [1, 'Quantity must be at least 1'],
        },
        unitPrice: {
          type: Number,
          required: [true, 'Unit price is required'],
          min: [0, 'Unit price cannot be negative'],
        },
        subtotal: {
          type: Number,
          required: [true, 'Subtotal is required'],
          min: [0, 'Subtotal cannot be negative'],
        },
        batchId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Batch',
        },
      },
    ],
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedDate: {
      type: Date,
    },
    shippedDate: {
      type: Date,
    },
    receivedDate: {
      type: Date,
    },
    cancelledDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Validate that items array is not empty
orderSchema.pre('save', function () {
  if (!this.items || this.items.length === 0) {
    throw new Error('Order must have at least one item');
  }
});

// Indexes for faster queries
orderSchema.index({ storeId: 1 });
orderSchema.index({ createdBy: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderCode: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
