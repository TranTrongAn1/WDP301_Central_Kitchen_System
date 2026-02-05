const SystemSetting = require('../models/SystemSetting');

/**
 * Default system settings to be seeded
 */
const DEFAULT_SETTINGS = [
  {
    key: 'SHIPPING_COST_BASE',
    value: '50000',
    description: 'Base shipping cost for deliveries (VND)',
    isPublic: true,
  },
  {
    key: 'TAX_RATE',
    value: '0.08',
    description: 'Tax rate for invoices (8%)',
    isPublic: true,
  },
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
 * @desc    Get system settings (with public/private separation)
 * @route   GET /api/system-settings
 * @access  Public for isPublic=true, Private for all settings
 */
const getSettings = async (req, res, next) => {
  try {
    const { publicOnly } = req.query;

    // If user is authenticated, they can see all settings
    // If not authenticated or publicOnly=true, only show public settings
    let filter = {};
    
    if (!req.user || publicOnly === 'true') {
      filter.isPublic = true;
    }

    const settings = await SystemSetting.find(filter).sort({ key: 1 });

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
    const { key, value, description, isPublic } = req.body;

    // Validate required fields
    if (!key || !value) {
      res.status(400);
      return next(new Error('Please provide key and value'));
    }

    // Check if setting already exists
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
    const { value, description, isPublic } = req.body;

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
