const mongoose = require('mongoose');

/**
 * WalletTransaction Schema for Kendo Mooncake Central Kitchen System
 * Tracks all monetary movements in store wallets
 */
const walletTransactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: [true, 'Wallet ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      validate: {
        validator: function (v) {
          return v !== 0;
        },
        message: 'Transaction amount cannot be zero',
      },
    },
    type: {
      type: String,
      enum: {
        values: ['Deposit', 'Withdrawal', 'Refund', 'Payment'],
        message: '{VALUE} is not a valid transaction type',
      },
      required: [true, 'Transaction type is required'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
walletTransactionSchema.index({ walletId: 1, timestamp: -1 });
walletTransactionSchema.index({ orderId: 1 });

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

module.exports = WalletTransaction;
