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

router.post(
  '/:planId/complete-item',
  authorize('Admin', 'Manager', 'KitchenStaff'),
  completeProductionItem
);

router.delete('/:id', authorize('Admin', 'Manager'), deleteProductionPlan);

module.exports = router;
