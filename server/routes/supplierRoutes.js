const express = require('express');
const router = express.Router();
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  permanentDeleteSupplier,
} = require('../controllers/supplierController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/suppliers
 * @desc    Get all suppliers (with optional filtering and pagination)
 * @access  Private (Admin, Manager, KitchenStaff)
 */
router.get('/', protect, authorize('Admin', 'Manager', 'KitchenStaff'), getSuppliers);

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get single supplier by ID
 * @access  Private (Admin, Manager, KitchenStaff)
 */
router.get('/:id', protect, authorize('Admin', 'Manager', 'KitchenStaff'), getSupplierById);

/**
 * @route   POST /api/suppliers
 * @desc    Create new supplier
 * @access  Private (Admin, Manager only)
 */
router.post('/', protect, authorize('Admin', 'Manager'), createSupplier);

/**
 * @route   PUT /api/suppliers/:id
 * @desc    Update supplier
 * @access  Private (Admin, Manager only)
 */
router.put('/:id', protect, authorize('Admin', 'Manager'), updateSupplier);

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Delete supplier (soft delete if has batches, hard delete otherwise)
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, authorize('Admin'), deleteSupplier);

/**
 * @route   DELETE /api/suppliers/:id/permanent
 * @desc    Permanently delete supplier (hard delete - fails if has batches)
 * @access  Private (Admin only)
 */
router.delete('/:id/permanent', protect, authorize('Admin'), permanentDeleteSupplier);

module.exports = router;
