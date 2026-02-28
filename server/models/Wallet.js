const mongoose = require('mongoose');

/**
 * Wallet Schema for Kendo Mooncake Central Kitchen System
 * Manages store credit and balance for each store
 */
const walletSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store ID is required'],
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
      validate: {
        validator: function (v) {
          return v >= 0;
        },
        message: 'Balance cannot be negative',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Locked'],
        message: '{VALUE} is not a valid wallet status',
      },
      default: 'Active',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
walletSchema.index({ storeId: 1 });

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
