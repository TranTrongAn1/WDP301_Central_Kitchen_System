const mongoose = require('mongoose');

const FEEDBACK_TAGS = ['Giao hàng nhanh/Đúng giờ', 'Vận chuyển an toàn/Cẩn thận', 'Thái độ Shipper tốt', 'Sản phẩm chất lượng/Đẹp', 'Đóng gói chắc chắn', 'Giao hàng trễ hẹn', 'Vận chuyển thiếu hàng', 'Hàng hư hỏng do vận chuyển', 'Giao sai sản phẩm', 'Sản phẩm cận date/Hết hạn', 'Bánh bị lỗi/Biến dạng', 'Thái độ Shipper kém', 'Khác'];

/**
 * Feedback Schema for Kendo Mooncake Central Kitchen System
 * Allows stores to provide feedback on received orders
 */
const feedbackSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store ID is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    content: {
      type: String,
      trim: true,
      maxlength: [1000, 'Feedback content cannot exceed 1000 characters'],
    },
    tags: {
      type: [String],
      enum: FEEDBACK_TAGS,
      default: [],
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return v.length <= 5;
        },
        message: 'Cannot upload more than 5 images',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
feedbackSchema.index({ storeId: 1 });
feedbackSchema.index({ rating: 1 });

// Prevent duplicate feedback for the same order (also indexes orderId)
feedbackSchema.index({ orderId: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
