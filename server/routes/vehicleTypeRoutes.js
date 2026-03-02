const express = require('express');
const router = express.Router();

const {
  createVehicleType,
  getVehicleTypes,
  getVehicleTypeById,
  updateVehicleType,
  deleteVehicleType,
} = require('../controllers/vehicleTypeController');

const { protect, authorize } = require('../middlewares/authMiddleware');

// ================================
// Admin CRUD Routes
// ================================

router
  .route('/')
  .post(protect, authorize('Admin'), createVehicleType)
  .get(protect, getVehicleTypes);

router
  .route('/:id')
  .get(protect, getVehicleTypeById)
  .put(protect, authorize('Admin'), updateVehicleType)
  .delete(protect, authorize('Admin'), deleteVehicleType);

module.exports = router;