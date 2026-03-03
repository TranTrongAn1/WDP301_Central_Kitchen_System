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
        values: ['Pending', 'Approved', 'Transferred_To_Kitchen', 'Ready_For_Shipping', 'In_Transit', 'Received', 'Cancelled'],
        message: '{VALUE} is not a valid status',
      },
      default: 'Pending',
    },
    requestedDeliveryDate: {
      type: Date,
      required: [true, 'Requested delivery date is required'],
    },
    address: {
      type: String,
      required: [true, 'Delivery address is required'],
      trim: true,
    },
    recipientName: {
  type: String,
  required: [true, 'Recipient name is required'],
  trim: true,
  maxlength: [100, 'Recipient name cannot exceed 100 characters'],
},

recipientPhone: {
  type: String,
  required: [true, 'Recipient phone is required'],
  trim: true,
  match: [/^(0|\+84)[0-9]{9,10}$/, 'Invalid phone number format'],
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
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: {
      type: Date,
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
// orderCode already has unique: true index

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
