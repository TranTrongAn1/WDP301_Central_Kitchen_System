const VehicleType = require('../models/VehicleType');

/**
 * @desc    Create new vehicle type
 * @route   POST /api/vehicle-types
 * @access  Admin
 */
exports.createVehicleType = async (req, res, next) => {
  try {
    // [CẬP NHẬT] Lấy thêm capacity và unit
    const { name, description, capacity, unit } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Vehicle type name is required',
      });
    }

    if (!capacity || capacity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle capacity must be a positive number',
      });
    }

    const existing = await VehicleType.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle type already exists',
      });
    }

    const vehicleType = await VehicleType.create({
      name: name.trim(),
      capacity,
      unit: unit || 'kg', // Nếu không truyền lên thì mặc định là kg
      description,
    });

    res.status(201).json({
      success: true,
      data: vehicleType,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all vehicle types
 * @route   GET /api/vehicle-types
 * @access  Private (Admin / Manager)
 */
exports.getVehicleTypes = async (req, res, next) => {
  try {
    const vehicleTypes = await VehicleType.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vehicleTypes.length,
      data: vehicleTypes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single vehicle type
 * @route   GET /api/vehicle-types/:id
 * @access  Private
 */
exports.getVehicleTypeById = async (req, res, next) => {
  try {
    const vehicleType = await VehicleType.findById(req.params.id);

    if (!vehicleType) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle type not found',
      });
    }

    res.status(200).json({
      success: true,
      data: vehicleType,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update vehicle type
 * @route   PUT /api/vehicle-types/:id
 * @access  Admin
 */
exports.updateVehicleType = async (req, res, next) => {
  try {
    // [CẬP NHẬT] Thêm capacity và unit
    const { name, description, capacity, unit, isActive } = req.body;

    const vehicleType = await VehicleType.findById(req.params.id);

    if (!vehicleType) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle type not found',
      });
    }

    if (name) {
      const duplicate = await VehicleType.findOne({
        name: name.trim(),
        _id: { $ne: req.params.id },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle type name already exists',
        });
      }

      vehicleType.name = name.trim();
    }

    // [CẬP NHẬT] Áp dụng các thay đổi mới
    if (capacity !== undefined) {
        if (capacity <= 0) {
            return res.status(400).json({ success: false, message: 'Capacity must be greater than 0' });
        }
        vehicleType.capacity = capacity;
    }
    
    if (unit) {
        vehicleType.unit = unit;
    }

    if (description !== undefined) {
      vehicleType.description = description;
    }

    if (typeof isActive === 'boolean') {
      vehicleType.isActive = isActive;
    }

    await vehicleType.save();

    res.status(200).json({
      success: true,
      data: vehicleType,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete vehicle type (Soft delete)
 * @route   DELETE /api/vehicle-types/:id
 * @access  Admin
 */
exports.deleteVehicleType = async (req, res, next) => {
  try {
    const vehicleType = await VehicleType.findById(req.params.id);

    if (!vehicleType) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle type not found',
      });
    }

    // Soft delete
    vehicleType.isActive = false;
    await vehicleType.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle type deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};