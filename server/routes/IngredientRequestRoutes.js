const express = require('express');
const router = express.Router();
const ingredientRequestController = require('../controllers/IngredientRequestController');
const { protect, authorize } = require('../middleware/authMiddleware'); 
router.use(protect);

// 1. Xem danh sách phiếu (Bếp, Điều phối, Admin đều xem được)
router.get(
  '/', 
  authorize('KitchenStaff', 'Coordinator', 'Admin'), 
  ingredientRequestController.getAllRequests
);

// 2. BẾP tạo phiếu xin mua
router.post(
  '/', 
  authorize('KitchenStaff', 'Admin'), 
  ingredientRequestController.createRequest
);

// 3. ĐIỀU PHỐI Duyệt / Từ chối phiếu
router.put(
  '/:id/status', 
  authorize('Coordinator', 'Admin'), 
  ingredientRequestController.updateRequestStatus
);

// 4. CHỐT HÀNG & NHẬP TIỀN (Ai đi chợ người đó chốt, Bếp hoặc Điều phối đều ok)
router.put(
  '/:id/complete', 
  authorize('KitchenStaff', 'Coordinator', 'Admin'), 
  ingredientRequestController.completeRequest
);

module.exports = router;