const Supplier = require('../models/Supplier');

/**
 * @desc    Get all suppliers
 * @route   GET /api/suppliers
 * @access  Private (Admin, Manager, KitchenStaff)
 */
const getSuppliers = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    // Build filter
    const filter = {};
    if (status) {
      filter.status = status;
    }

    // Pagination
    const skip = (page - 1) * limit;

    const suppliers = await Supplier.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Supplier.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: suppliers.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: suppliers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single supplier by ID
 * @route   GET /api/suppliers/:id
 * @access  Private
 */
const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      res.status(404);
      return next(new Error('Supplier not found'));
    }

    res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new supplier
 * @route   POST /api/suppliers
 * @access  Private (Admin, Manager)
 */
const createSupplier = async (req, res, next) => {
  try {
    const { name, address, phone, email, status } = req.body;

    // Check if supplier name already exists
    const existingName = await Supplier.findOne({ name });
    if (existingName) {
      res.status(400);
      return next(new Error('Supplier with this name already exists'));
    }

    // Check if supplier email already exists
    const existingEmail = await Supplier.findOne({ email });
    if (existingEmail) {
      res.status(400);
      return next(new Error('Supplier with this email already exists'));
    }

    const supplier = await Supplier.create({
      name,
      address,
      phone,
      email,
      status,
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier,
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      res.status(400);
      return next(new Error(messages.join(', ')));
    }
    next(error);
  }
};

/**
 * @desc    Update supplier
 * @route   PUT /api/suppliers/:id
 * @access  Private (Admin, Manager)
 */
const updateSupplier = async (req, res, next) => {
  try {
    let supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      res.status(404);
      return next(new Error('Supplier not found'));
    }

    // Check if new name already exists (if name is being changed)
    if (req.body.name && req.body.name !== supplier.name) {
      const existingName = await Supplier.findOne({ name: req.body.name });
      if (existingName) {
        res.status(400);
        return next(new Error('Supplier with this name already exists'));
      }
    }

    // Check if new email already exists (if email is being changed)
    if (req.body.email && req.body.email !== supplier.email) {
      const existingEmail = await Supplier.findOne({ email: req.body.email });
      if (existingEmail) {
        res.status(400);
        return next(new Error('Supplier with this email already exists'));
      }
    }

    supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier,
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      res.status(400);
      return next(new Error(messages.join(', ')));
    }
    next(error);
  }
};

/**
 * @desc    Delete supplier (Soft delete - set status to Inactive)
 * @route   DELETE /api/suppliers/:id
 * @access  Private (Admin only)
 */
const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      res.status(404);
      return next(new Error('Supplier not found'));
    }

    // Check if supplier has associated batches
    const IngredientBatch = require('../models/IngredientBatch');
    const batchCount = await IngredientBatch.countDocuments({ 
      supplierId: req.params.id 
    });

    if (batchCount > 0) {
      // Soft delete: Set status to Inactive
      supplier.status = 'Inactive';
      await supplier.save();

      return res.status(200).json({
        success: true,
        message: `Supplier has ${batchCount} associated batch(es). Status changed to Inactive instead of deletion.`,
        data: supplier,
      });
    }

    // Hard delete if no associated batches
    await supplier.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Permanently delete supplier (Hard delete)
 * @route   DELETE /api/suppliers/:id/permanent
 * @access  Private (Admin only)
 */
const permanentDeleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      res.status(404);
      return next(new Error('Supplier not found'));
    }

    // Check if supplier has associated batches
    const IngredientBatch = require('../models/IngredientBatch');
    const batchCount = await IngredientBatch.countDocuments({ 
      supplierId: req.params.id 
    });

    if (batchCount > 0) {
      res.status(400);
      return next(
        new Error(
          `Cannot permanently delete supplier. ${batchCount} ingredient batch(es) are linked to this supplier. Please remove the batches first.`
        )
      );
    }

    await supplier.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Supplier permanently deleted',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  permanentDeleteSupplier,
};
