const mongoose = require('mongoose');

/**
<<<<<<< Updated upstream
 * Order Item Schema (Embedded)
 * Represents individual items within an order
 */
const orderItemSchema = new mongoose.Schema(
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
  },
  { _id: false }
);

/**
 * Order Schema for Kendo Mooncake Central Kitchen System
 * Represents orders from stores for products from the central kitchen
 */
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true,
      uppercase: true,
=======
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
>>>>>>> Stashed changes
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
<<<<<<< Updated upstream
      required: [true, 'Store ID is required'],
      index: true,
    },
    orderDate: {
      type: Date,
      required: [true, 'Order date is required'],
      default: Date.now,
    },
    requestedDeliveryDate: {
      type: Date,
      required: [true, 'Requested delivery date is required'],
      validate: {
        validator: function (value) {
          return value >= this.orderDate;
        },
        message: 'Requested delivery date cannot be before order date',
      },
    },
    orderItems: {
      type: [orderItemSchema],
      required: [true, 'Order items are required'],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Order must contain at least one item',
      },
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
=======
      required: [true, 'Store is required'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user is required'],
>>>>>>> Stashed changes
    },
    status: {
      type: String,
      enum: {
<<<<<<< Updated upstream
        values: ['Pending', 'Approved', 'Shipped', 'Received', 'Cancelled'],
        message: '{VALUE} is not a valid order status',
      },
      default: 'Pending',
      required: true,
=======
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
>>>>>>> Stashed changes
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
<<<<<<< Updated upstream
    approvedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
=======
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
>>>>>>> Stashed changes
    },
  },
  {
    timestamps: true,
  }
);

<<<<<<< Updated upstream
// Indexes for efficient querying
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ storeId: 1, orderDate: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ requestedDeliveryDate: 1 });

// Pre-save hook to calculate total amount from order items
orderSchema.pre('save', function () {
  // Calculate total for new orders or when orderItems change
  if ((this.isNew || this.isModified('orderItems')) && this.orderItems && this.orderItems.length > 0) {
    this.totalAmount = this.orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  }
});

module.exports = mongoose.model('Order', orderSchema);
=======
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
>>>>>>> Stashed changes
