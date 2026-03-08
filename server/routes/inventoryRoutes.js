const express = require('express');
const {
  getStoreInventory,
  getAllInventory,
  updateInventoryQuantity,
  deleteInventoryItem,
  updateOrderStatus
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Tất cả các route inventory đều cần login
router.use(protect);

// 1. Lấy tất cả kho của các store (Chỉ dành cho Admin/Manager)
router.get('/all', authorize('Admin', 'Manager'), getAllInventory);

// 2. Lấy kho của một store cụ thể (Staff xem kho mình, Admin xem kho bất kỳ)
router.get('/store/:storeId', getStoreInventory);

// 3. Cập nhật số lượng thủ công - Kiểm kho (Staff sửa kho mình, Admin/Manager sửa mọi kho)
router.put('/:id', updateInventoryQuantity);

// 4. Xóa một bản ghi kho (Chỉ Admin)
router.delete('/:id', authorize('Admin'), deleteInventoryItem);

// 5. Cập nhật trạng thái đơn hàng -> Tự động cộng kho (Side-effect)
// Thường route này sẽ nằm ở orderRoutes, nhưng nếu gộp ở đây thì gọi là:
router.patch('/order/:orderId/status', updateOrderStatus);

module.exports = router;