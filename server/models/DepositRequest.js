const mongoose = require('mongoose');

/**
 * DepositRequest Schema
 * Tracks PayOS top-up requests before wallet balance is credited.
 */
const depositRequestSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    payosOrderCode: {
      type: Number,
      required: [true, 'PayOS order code is required'],
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Completed', 'Failed'],
        message: '{VALUE} is not a valid deposit request status',
      },
      default: 'Pending',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const DepositRequest = mongoose.model('DepositRequest', depositRequestSchema);

module.exports = DepositRequest;
