const mongoose = require('mongoose');

/**
 * Generate unique transfer code
 * Format: TRF-YYYYMMDD-RANDOM
 */
const generateTransferCode = () => {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TRF-${dateStr}-${random}`;
};

/**
 * Transfer Schema for Kendo Mooncake Central Kitchen System
 * Tracks shipments from Central Kitchen to Stores
 */
const transferSchema = new mongoose.Schema(
  {
    transferCode: {
      type: String,
      unique: true,
      uppercase: true,
      default: generateTransferCode,
    },
    toStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Destination store is required'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Shipped', 'Received', 'Cancelled'],
        message: '{VALUE} is not a valid status',
      },
      default: 'Pending',
    },
    shippedDate: {
      type: Date,
    },
    receivedDate: {
      type: Date,
    },
    // Items being transferred
    items: [
      {
        batchId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Batch',
          required: true,
        },
        quantity: {
          type: Number,
          required: [true, 'Quantity is required'],
          min: [1, 'Quantity must be at least 1'],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Validate that items array is not empty
transferSchema.pre('save', function () {
  if (!this.items || this.items.length === 0) {
    throw new Error('Transfer must have at least one item');
  }
});

// Indexes for faster queries
transferSchema.index({ toStoreId: 1 });
transferSchema.index({ createdBy: 1 });
transferSchema.index({ status: 1 });

const Transfer = mongoose.model('Transfer', transferSchema);

module.exports = Transfer;
