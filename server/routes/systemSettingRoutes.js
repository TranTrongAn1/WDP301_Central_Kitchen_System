const express = require('express');
const {
  seedDefaultSettings,
  getSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
} = require('../controllers/systemSettingController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Public/Semi-public routes
 * - GET /api/system-settings - Get all settings (public only if not authenticated)
 * - GET /api/system-settings/:key - Get setting by key (public only if not authenticated)
 */
router.get('/', getSettings);
router.get('/:key', getSettingByKey);

/**
 * Admin-only routes
 * - POST /api/system-settings/seed - Seed default settings
 * - POST /api/system-settings - Create new setting
 * - PUT /api/system-settings/:key - Update setting
 * - DELETE /api/system-settings/:key - Delete setting
 */
router.use(protect); // All routes below require authentication
router.use(authorize('Admin')); // All routes below require Admin role

router.post('/seed', seedDefaultSettings);
router.post('/', createSetting);
router.put('/:key', updateSetting);
router.delete('/:key', deleteSetting);

module.exports = router;
