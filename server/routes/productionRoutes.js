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

router.use(protect);

router.get('/', getProductionPlans);
router.get('/:id', getProductionPlanById);

router.post(
  '/',
  authorize('Admin', 'Manager', 'Coordinator', 'KitchenStaff'),
  createProductionPlan
);

router.put(
  '/:id',
  authorize('Admin', 'Manager', 'Coordinator', 'KitchenStaff'),
  updateProductionPlan
);

router.patch(
  '/:id/status',
  authorize('Admin', 'Manager', 'Coordinator', 'KitchenStaff'),
  updateProductionPlanStatus
);

router.post(
  '/:planId/complete-item',
  authorize('Admin', 'Manager', 'Coordinator', 'KitchenStaff'),
  completeProductionItem
);

router.delete('/:id', authorize('Admin', 'Manager'), deleteProductionPlan);

module.exports = router;
