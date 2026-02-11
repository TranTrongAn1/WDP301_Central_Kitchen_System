const mongoose = require('mongoose');

/**
 * Invoice Schema for Kendo Mooncake Central Kitchen System
 * Represents invoices linked to orders and tracks payment status
 */
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
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
    invoiceDate: {
      type: Date,
      required: [true, 'Invoice date is required'],
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      validate: {
        validator: function (value) {
          return value >= this.invoiceDate;
        },
        message: 'Due date cannot be before invoice date',
      },
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
    },
    taxRate: {
      type: Number,
      default: 0,
      min: [0, 'Tax rate cannot be negative'],
      max: [100, 'Tax rate cannot exceed 100%'],
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: [0, 'Tax amount cannot be negative'],
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative'],
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['Pending', 'Partial', 'Paid', 'Overdue', 'Cancelled'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'Pending',
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
    },
    paymentDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['Cash', 'Bank_Transfer', 'Credit_Card', 'Check', 'Other'],
        message: '{VALUE} is not a valid payment method',
      },
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
// invoiceNumber already has unique: true index
// orderId already has index: true
invoiceSchema.index({ storeId: 1, invoiceDate: -1 });
invoiceSchema.index({ paymentStatus: 1 });
invoiceSchema.index({ dueDate: 1 });

// Pre-save hook to calculate tax and total amounts
invoiceSchema.pre('save', function () {
  // Calculate tax and total for new documents or when subtotal/taxRate changes
  if (this.isNew || this.isModified('subtotal') || this.isModified('taxRate')) {
    this.taxAmount = (this.subtotal * this.taxRate) / 100;
    this.totalAmount = this.subtotal + this.taxAmount;
  }
  
  // Update payment status based on paid amount
  if (this.isModified('paidAmount')) {
    if (this.paidAmount === 0) {
      this.paymentStatus = 'Pending';
    } else if (this.paidAmount >= this.totalAmount) {
      this.paymentStatus = 'Paid';
      if (!this.paymentDate) {
        this.paymentDate = new Date();
      }
    } else if (this.paidAmount > 0 && this.paidAmount < this.totalAmount) {
      this.paymentStatus = 'Partial';
    }
  }
  
  // Check for overdue invoices
  if (this.paymentStatus !== 'Paid' && this.paymentStatus !== 'Cancelled') {
    const now = new Date();
    if (this.dueDate < now) {
      this.paymentStatus = 'Overdue';
    }
  }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
