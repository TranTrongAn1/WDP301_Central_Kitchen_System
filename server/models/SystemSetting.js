const mongoose = require('mongoose');

/**
 * SystemSetting Schema for Kendo Mooncake Central Kitchen System
 * A simple key-value store for system-wide configuration settings
 */
const systemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Setting key is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    value: {
      type: String,
      required: [true, 'Setting value is required'],
    },
    // [MỚI] Kiểu dữ liệu để Frontend render Form và Backend ép kiểu
    dataType: {
      type: String,
      enum: ['STRING', 'NUMBER', 'BOOLEAN', 'JSON'],
      default: 'STRING',
      uppercase: true,
    },
    // [MỚI] Nhóm phân loại để chia Tab trên giao diện Admin
    group: {
      type: String,
      enum: ['SYSTEM', 'FINANCE', 'DELIVERY', 'PRODUCTION', 'ORDER', 'INVENTORY', 'OTHER'],
      default: 'OTHER',
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster key lookups
systemSettingSchema.index({ key: 1 });

// [MỚI] Index for grouping queries (Tối ưu tốc độ khi FE gọi theo Tab)
systemSettingSchema.index({ group: 1 });

// Index for filtering public settings
systemSettingSchema.index({ isPublic: 1 });

module.exports = mongoose.model('SystemSetting', systemSettingSchema);