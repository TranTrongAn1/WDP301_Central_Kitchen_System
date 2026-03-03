const express = require('express');
const router = express.Router();

const {
  createVehicleType,
  getVehicleTypes,
  getVehicleTypeById,
  updateVehicleType,
  deleteVehicleType,
} = require('../controllers/vehicleTypeController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Áp dụng protect cho tất cả các route trong file này
router.use(protect);

// ================================
// Routes
// ================================

// Lấy danh sách (ai đăng nhập cũng xem được) và Tạo mới (chỉ Admin/Manager)
router.get('/', getVehicleTypes);
router.post('/', authorize('Admin', 'Manager'), createVehicleType);

// Thao tác trên từng ID cụ thể
router.get('/:id', getVehicleTypeById);
router.put('/:id', authorize('Admin', 'Manager'), updateVehicleType);
router.delete('/:id', authorize('Admin', 'Manager'), deleteVehicleType);

module.exports = router;