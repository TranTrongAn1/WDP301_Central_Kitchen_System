const mongoose = require('mongoose');

const ingredientRequestSchema = new mongoose.Schema({
  ingredientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient', // Trỏ tới model Ingredient
    required: true
  },
  quantityRequested: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'lit', 'ml', 'chai', 'hộp', 'bó'], // Các đơn vị thường dùng
    default: 'kg'
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
    default: 'PENDING'
  },
  note: {
    type: String,
    trim: true,
    maxLength: 500
  },
  actualCost: {
    type: Number, // Số tiền thực tế đi chợ (VNĐ)
    default: null
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Trỏ tới người tạo (Bếp) - Tùy chọn
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Trỏ tới người duyệt (Điều phối) - Tùy chọn
    default: null
  }
}, {
  timestamps: true // Tự động sinh ra createdAt và updatedAt
});

module.exports = mongoose.model('IngredientRequest', ingredientRequestSchema);