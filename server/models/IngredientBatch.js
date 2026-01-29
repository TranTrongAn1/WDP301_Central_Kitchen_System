const mongoose = require('mongoose');

/**
 * IngredientBatch Schema for Batch Management with FEFO (First Expired First Out)
 * Tracks individual batches of ingredients for traceability and expiry date management
 */
const ingredientBatchSchema = new mongoose.Schema(
  {
    ingredientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: [true, 'Ingredient ID is required'],
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier ID is required'],
      index: true,
    },
    batchCode: {
      type: String,
      required: [true, 'Batch code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      validate: {
        validator: function (value) {
          // Expiry date must be in the future (at time of creation)
          return value > new Date();
        },
        message: 'Expiry date must be in the future',
      },
    },
    receivedDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    initialQuantity: {
      type: Number,
      required: [true, 'Initial quantity is required'],
      min: [0, 'Initial quantity cannot be negative'],
    },
    currentQuantity: {
      type: Number,
      required: [true, 'Current quantity is required'],
      min: [0, 'Current quantity cannot be negative'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient FEFO queries (by ingredient and expiry date)
ingredientBatchSchema.index({ ingredientId: 1, expiryDate: 1 });
ingredientBatchSchema.index({ isActive: 1, currentQuantity: 1 });
// Compound index for supplier import history
ingredientBatchSchema.index({ supplierId: 1, receivedDate: -1 });

// Pre-save hook: Set currentQuantity to initialQuantity on creation
ingredientBatchSchema.pre('save', async function () {
  if (this.isNew && !this.currentQuantity) {
    this.currentQuantity = this.initialQuantity;
  }
});

// Pre-save hook: Uppercase batch code
ingredientBatchSchema.pre('save', async function () {
  if (this.batchCode) {
    this.batchCode = this.batchCode.toUpperCase().trim();
  }
});

// Virtual: Check if batch is expired
ingredientBatchSchema.virtual('isExpired').get(function () {
  return this.expiryDate < new Date();
});

// Virtual: Check if batch is empty
ingredientBatchSchema.virtual('isEmpty').get(function () {
  return this.currentQuantity <= 0;
});

// Instance method: Deduct quantity from batch
ingredientBatchSchema.methods.deductQuantity = function (amount) {
  if (amount > this.currentQuantity) {
    throw new Error(
      `Insufficient quantity in batch ${this.batchCode}. Available: ${this.currentQuantity}, Requested: ${amount}`
    );
  }
  this.currentQuantity -= amount;
  if (this.currentQuantity === 0) {
    this.isActive = false;
  }
  return this.save();
};

const IngredientBatch = mongoose.model('IngredientBatch', ingredientBatchSchema);

module.exports = IngredientBatch;
