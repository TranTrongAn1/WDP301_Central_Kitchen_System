const express = require('express');
const {
  getProductionPlans,
  getProductionPlanById,
  createProductionPlan,
  updateProductionPlan,
  deleteProductionPlan,
  completeProductionItem,
  updateProductionPlanStatus,
} = require('../controllers/productionController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Routes accessible by all authenticated users (read-only for StoreStaff)
router.get('/', getProductionPlans);
router.get('/:id', getProductionPlanById);

// Routes for production management (Admin, Manager, KitchenStaff)
router.post(
  '/',
  authorize('Admin', 'Manager', 'KitchenStaff'),
  createProductionPlan
);

router.put(
  '/:id',
  authorize('Admin', 'Manager', 'KitchenStaff'),
  updateProductionPlan
);

router.patch(
  '/:id/status',
  authorize('Admin', 'Manager', 'KitchenStaff'),
  updateProductionPlanStatus
);

// Complete production item (auto-creates batch)
router.post(
  '/:planId/complete-item',
  authorize('Admin', 'Manager', 'KitchenStaff'),
  completeProductionItem
);

// Delete only for Admin and Manager
router.delete('/:id', authorize('Admin', 'Manager'), deleteProductionPlan);

module.exports = router;
