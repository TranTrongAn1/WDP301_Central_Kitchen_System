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
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isPublic: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster key lookups
systemSettingSchema.index({ key: 1 });

// Index for filtering public settings
systemSettingSchema.index({ isPublic: 1 });

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
