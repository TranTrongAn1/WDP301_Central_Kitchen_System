const SystemSetting = require('../models/SystemSetting');

/**
 * Default system settings to be seeded (Đã bổ sung các Limits và Phân loại)
 */
const DEFAULT_SETTINGS = [
  {
    key: 'SHIPPING_COST_BASE',
    value: '50000',
    dataType: 'NUMBER',
    group: 'DELIVERY',
    description: 'Base shipping cost for deliveries (VND)',
    isPublic: true,
  },
  {
    key: 'TAX_RATE',
    value: '0.08',
    dataType: 'NUMBER',
    group: 'FINANCE',
    description: 'Tax rate for invoices (8%)',
    isPublic: true,
  },
  // --- CÁC CẤU HÌNH GIỚI HẠN MỚI THÊM ---
  {
    key: 'MAX_ORDERS_PER_TRIP',
    value: '100',
    dataType: 'NUMBER',
    group: 'DELIVERY',
    description: 'Giới hạn tối đa số đơn trên 1 chuyến xe',
    isPublic: false,
  },
  {
    key: 'MIN_ORDERS_PER_TRIP',
    value: '5',
    dataType: 'NUMBER',
    group: 'DELIVERY',
    description: 'Số đơn tối thiểu để xe xuất bến',
    isPublic: false,
  },
  {
    key: 'MAX_PRODUCTS_PER_PLAN',
    value: '1000',
    dataType: 'NUMBER',
    group: 'PRODUCTION',
    description: 'Giới hạn năng lực nấu (tổng số lượng sản phẩm) của 1 mẻ',
    isPublic: false,
  }
];

/**
 * @desc    Seed default system settings
 * @route   POST /api/system-settings/seed
 * @access  Private (Admin only)
 */
const seedDefaultSettings = async (req, res, next) => {
  try {
    const seededSettings = [];
    const skippedSettings = [];

    for (const setting of DEFAULT_SETTINGS) {
      // Check if setting already exists
      const existingSetting = await SystemSetting.findOne({ key: setting.key });

      if (!existingSetting) {
        const newSetting = await SystemSetting.create(setting);
        seededSettings.push(newSetting);
      } else {
        skippedSettings.push(setting.key);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Default settings seeded successfully',
      data: {
        seeded: seededSettings,
        skipped: skippedSettings,
        seededCount: seededSettings.length,
        skippedCount: skippedSettings.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get system settings (with public/private separation & Group filter)
 * @route   GET /api/system-settings
 * @access  Public for isPublic=true, Private for all settings
 */
const getSettings = async (req, res, next) => {
  try {
    const { publicOnly, group } = req.query;

    let filter = {};
    
    // Nếu chưa đăng nhập hoặc có query publicOnly=true -> Chỉ lấy Public
    if (!req.user || publicOnly === 'true') {
      filter.isPublic = true;
    }

    // [MỚI] Lọc theo nhóm (Group) nếu FE truyền lên
    if (group) {
      filter.group = group.toUpperCase();
    }

    const settings = await SystemSetting.find(filter).sort({ group: 1, key: 1 });

    res.status(200).json({
      success: true,
      count: settings.length,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single system setting by key
 * @route   GET /api/system-settings/:key
 * @access  Public for isPublic=true, Private for all
 */
const getSettingByKey = async (req, res, next) => {
  try {
    const setting = await SystemSetting.findOne({ 
      key: req.params.key.toUpperCase() 
    });

    if (!setting) {
      res.status(404);
      return next(new Error('System setting not found'));
    }

    // Check if user can access this setting
    if (!setting.isPublic && !req.user) {
      res.status(403);
      return next(new Error('Access denied. This setting is private.'));
    }

    res.status(200).json({
      success: true,
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new system setting
 * @route   POST /api/system-settings
 * @access  Private (Admin only)
 */
const createSetting = async (req, res, next) => {
  try {
    // [CẬP NHẬT] Thêm dataType và group
    const { key, value, description, isPublic, dataType, group } = req.body;

    if (!key || !value) {
      res.status(400);
      return next(new Error('Please provide key and value'));
    }

    const existingSetting = await SystemSetting.findOne({ 
      key: key.toUpperCase() 
    });

    if (existingSetting) {
      res.status(400);
      return next(new Error(`Setting with key '${key}' already exists`));
    }

    const setting = await SystemSetting.create({
      key: key.toUpperCase(),
      value,
      dataType: dataType || 'STRING',
      group: group || 'OTHER',
      description: description || '',
      isPublic: isPublic !== undefined ? isPublic : false,
    });

    res.status(201).json({
      success: true,
      message: 'System setting created successfully',
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update system setting
 * @route   PUT /api/system-settings/:key
 * @access  Private (Admin only)
 */
const updateSetting = async (req, res, next) => {
  try {
    // [CẬP NHẬT] Thêm dataType và group
    const { value, description, isPublic, dataType, group } = req.body;

    const setting = await SystemSetting.findOne({ 
      key: req.params.key.toUpperCase() 
    });

    if (!setting) {
      res.status(404);
      return next(new Error('System setting not found'));
    }

    // Update fields if provided
    if (value !== undefined) setting.value = value;
    if (description !== undefined) setting.description = description;
    if (isPublic !== undefined) setting.isPublic = isPublic;
    if (dataType !== undefined) setting.dataType = dataType;
    if (group !== undefined) setting.group = group;

    await setting.save();

    res.status(200).json({
      success: true,
      message: 'System setting updated successfully',
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete system setting
 * @route   DELETE /api/system-settings/:key
 * @access  Private (Admin only)
 */
const deleteSetting = async (req, res, next) => {
  try {
    const setting = await SystemSetting.findOneAndDelete({ 
      key: req.params.key.toUpperCase() 
    });

    if (!setting) {
      res.status(404);
      return next(new Error('System setting not found'));
    }

    res.status(200).json({
      success: true,
      message: 'System setting deleted successfully',
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  seedDefaultSettings,
  getSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
};