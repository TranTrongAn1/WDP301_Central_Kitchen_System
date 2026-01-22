const mongoose = require('mongoose');

/**
 * Supplier Schema for Kendo Mooncake Central Kitchen System
 * Represents suppliers who provide ingredients
 */
const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      unique: true,
    },
    address: {
      type: String,
      required: [true, 'Supplier address is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [
        /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
        'Please provide a valid phone number',
      ],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Inactive'],
        message: '{VALUE} is not a valid status',
      },
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
supplierSchema.index({ name: 1 });
supplierSchema.index({ email: 1 }, { unique: true });
supplierSchema.index({ status: 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = Supplier;
