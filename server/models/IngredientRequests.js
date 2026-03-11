const mongoose = require('mongoose');

const ingredientRequestSchema = new mongoose.Schema({
  ingredientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient',
    required: true
  },
  // Phân loại mua sắm
  requestType: {
    type: String,
    enum: ['URGENT', 'PLANNED'], // URGENT: Bếp hết hàng cần mua gấp, PLANNED: Kế hoạch tuần/tháng
    default: 'URGENT'
  },
  quantityRequested: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
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
  // ---- TRUY XUẤT NGUỒN GỐC & TÀI CHÍNH ----
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier', // Nếu mua sỉ từ NCC hệ thống
    default: null
  },
  supplierName: {
    type: String, // Dùng khi Bếp chạy ra chợ tạp hóa mua gấp (VD: "Sạp bà Bảy chợ Gò Vấp")
    trim: true,
    default: ''
  },
  actualCost: {
    type: Number, // Số tiền thực tế thanh toán
    default: null
  },
  receiptImage: {
    type: String, // Link ảnh chụp hóa đơn/bill tính tiền để kế toán duyệt
    default: ''
  },
  // ----------------------------------------
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('IngredientRequest', ingredientRequestSchema);