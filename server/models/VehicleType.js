const mongoose = require('mongoose');

const vehicleTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vehicle type name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Vehicle type name cannot exceed 100 characters'],
    },
    // [MỚI] Sức chở / Tải trọng tối đa
    capacity: {
      type: Number,
      required: [true, 'Vehicle capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    // [MỚI] Đơn vị đo lường
    unit: {
      type: String,
      enum: ['kg', 'ton', 'box'], // Thường bánh kẹo dùng kg hoặc thùng (box)
      default: 'kg',
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

const VehicleType = mongoose.model('VehicleType', vehicleTypeSchema);

module.exports = VehicleType;