const asyncHandler = require('express-async-handler');
const Ingredient = require('../models/Ingredient');
const IngredientBatch = require('../models/IngredientBatch');

/**
 * @desc    Get all ingredients
 * @route   GET /api/ingredients
 * @access  Private (All authenticated users can view)
 */
const getIngredients = asyncHandler(async (req, res) => {
  const ingredients = await Ingredient.find().sort({ ingredientName: 1 });
  
  res.status(200).json({
    success: true,
    count: ingredients.length,
    data: ingredients,
  });
});

/**
 * @desc    Get single ingredient by ID
 * @route   GET /api/ingredients/:id
 * @access  Private (All authenticated users can view)
 */
const getIngredientById = asyncHandler(async (req, res) => {
  const ingredient = await Ingredient.findById(req.params.id);
  
  if (!ingredient) {
    res.status(404);
    throw new Error('Ingredient not found');
  }
  
  // Check if below threshold
  const isBelowThreshold = ingredient.totalQuantity < ingredient.warningThreshold;
  
  res.status(200).json({
    success: true,
    data: {
      ...ingredient.toObject(),
      isBelowThreshold,
    },
  });
});

/**
 * @desc    Create new ingredient
 * @route   POST /api/ingredients
 * @access  Private (Admin, Kitchen_Manager only)
 */
const createIngredient = asyncHandler(async (req, res) => {
  const { ingredientName, unit, costPrice, warningThreshold } = req.body;
  
  // Validation: Check required fields
  if (!ingredientName || ingredientName.trim() === '') {
    res.status(400);
    throw new Error('Ingredient name is required');
  }
  
  if (!unit || unit.trim() === '') {
    res.status(400);
    throw new Error('Unit is required');
  }
  
  if (costPrice === undefined || costPrice === null) {
    res.status(400);
    throw new Error('Cost price is required');
  }
  
  if (costPrice < 0) {
    res.status(400);
    throw new Error('Cost price cannot be negative');
  }
  
  // Validation: Check for duplicate name (case-insensitive)
  const existingIngredient = await Ingredient.findOne({
    ingredientName: { $regex: `^${ingredientName.trim()}$`, $options: 'i' },
  });
  
  if (existingIngredient) {
    res.status(400);
    throw new Error('Ingredient with this name already exists');
  }
  
  // Create ingredient with totalQuantity defaulting to 0
  const ingredient = await Ingredient.create({
    ingredientName: ingredientName.trim(),
    unit: unit.trim(),
    costPrice,
    warningThreshold: warningThreshold || 10,
    totalQuantity: 0, // Default to 0, will be updated when batches are added
  });
  
  res.status(201).json({
    success: true,
    message: 'Ingredient created successfully',
    data: ingredient,
  });
});

/**
 * @desc    Add new ingredient batch (Import stock)
 * @route   POST /api/ingredients/:id/batches
 * @access  Private (Admin, Kitchen_Manager only)
 * 
 * CRITICAL: This is a Parent-Child update operation
 * 1. Create new IngredientBatch record
 * 2. Update parent Ingredient.totalQuantity by adding the new batch quantity
 */
const addBatch = asyncHandler(async (req, res) => {
  const { batchCode, expiryDate, initialQuantity, price, supplierId } = req.body;
  
  // Validation: Check if ingredient exists
  const ingredient = await Ingredient.findById(req.params.id);
  if (!ingredient) {
    res.status(404);
    throw new Error('Ingredient not found');
  }
  
  // Validation: Check if supplierId is provided
  if (!supplierId || supplierId.trim() === '') {
    res.status(400);
    throw new Error('Supplier ID is required');
  }
  
  // Validation: Verify supplier exists
  const Supplier = require('../models/Supplier');
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found');
  }
  
  // Validation: Check if supplier is active
  if (supplier.status !== 'Active') {
    res.status(400);
    throw new Error('Cannot create batch with inactive supplier');
  }
  
  // Validation: Required fields
  if (!batchCode || batchCode.trim() === '') {
    res.status(400);
    throw new Error('Batch code is required');
  }
  
  if (!expiryDate) {
    res.status(400);
    throw new Error('Expiry date is required');
  }
  
  if (!initialQuantity || initialQuantity <= 0) {
    res.status(400);
    throw new Error('Initial quantity must be greater than 0');
  }
  
  if (price === undefined || price === null || price < 0) {
    res.status(400);
    throw new Error('Price is required and cannot be negative');
  }
  
  // Validation: Expiry date must be in the future
  const expiryDateObj = new Date(expiryDate);
  if (expiryDateObj <= new Date()) {
    res.status(400);
    throw new Error('Expiry date must be in the future');
  }
  
  // Validation: Check for duplicate batch code
  const existingBatch = await IngredientBatch.findOne({
    batchCode: batchCode.toUpperCase().trim(),
  });
  
  if (existingBatch) {
    res.status(400);
    throw new Error('Batch code already exists');
  }
  
  // Create new batch with supplier traceability
  const batch = await IngredientBatch.create({
    ingredientId: req.params.id,
    supplierId,
    batchCode: batchCode.trim(),
    expiryDate: expiryDateObj,
    initialQuantity,
    currentQuantity: initialQuantity,
    price,
    isActive: true,
  });
  
  // CRITICAL: Update parent Ingredient totalQuantity
  // This maintains data consistency between parent and child
  ingredient.totalQuantity += initialQuantity;
  await ingredient.save();
  
  // Populate supplier info for response
  await batch.populate('supplierId', 'name email phone');
  
  res.status(201).json({
    success: true,
    message: 'Ingredient batch added successfully',
    data: {
      batch,
      ingredient: {
        id: ingredient._id,
        ingredientName: ingredient.ingredientName,
        totalQuantity: ingredient.totalQuantity,
        warningThreshold: ingredient.warningThreshold,
        isBelowThreshold: ingredient.totalQuantity < ingredient.warningThreshold,
      },
    },
  });
});

/**
 * @desc    Get all batches for an ingredient (FEFO sorted)
 * @route   GET /api/ingredients/:id/batches
 * @access  Private (All authenticated users can view)
 * 
 * FEFO Logic (First Expired First Out):
 * - Returns only active batches with quantity > 0
 * - Sorted by expiryDate ASC (oldest expiry date first)
 * - This ensures that batches closest to expiry are used first
 */
const getBatchesByIngredient = asyncHandler(async (req, res) => {
  // Verify ingredient exists
  const ingredient = await Ingredient.findById(req.params.id);
  if (!ingredient) {
    res.status(404);
    throw new Error('Ingredient not found');
  }
  
  // Get active batches sorted by expiry date (FEFO - First Expired First Out)
  // expiryDate: 1 means ascending order (oldest first)
  const batches = await IngredientBatch.find({
    ingredientId: req.params.id,
    isActive: true,
    currentQuantity: { $gt: 0 },
  })
    .sort({ expiryDate: 1 }) // FEFO: Oldest expiry date first
    .populate('ingredientId', 'ingredientName unit')
    .populate('supplierId', 'name email phone status');
  
  res.status(200).json({
    success: true,
    count: batches.length,
    data: batches,
    note: 'Batches are sorted by expiry date (FEFO - First Expired First Out)',
  });
});

/**
 * @desc    Update ingredient
 * @route   PUT /api/ingredients/:id
 * @access  Private (Admin, Kitchen_Manager only)
 */
const updateIngredient = asyncHandler(async (req, res) => {
  let ingredient = await Ingredient.findById(req.params.id);
  
  if (!ingredient) {
    res.status(404);
    throw new Error('Ingredient not found');
  }
  
  // If updating ingredientName, check for duplicates
  if (req.body.ingredientName && req.body.ingredientName.trim() !== ingredient.ingredientName) {
    const existingIngredient = await Ingredient.findOne({
      ingredientName: { $regex: `^${req.body.ingredientName.trim()}$`, $options: 'i' },
      _id: { $ne: req.params.id },
    });
    
    if (existingIngredient) {
      res.status(400);
      throw new Error('Ingredient with this name already exists');
    }
  }
  
  // Validate costPrice if being updated
  if (req.body.costPrice !== undefined && req.body.costPrice < 0) {
    res.status(400);
    throw new Error('Cost price cannot be negative');
  }
  
  // Validate warningThreshold if being updated
  if (req.body.warningThreshold !== undefined && req.body.warningThreshold < 0) {
    res.status(400);
    throw new Error('Warning threshold cannot be negative');
  }
  
  // Note: totalQuantity should NOT be manually updated
  // It's managed automatically through batch operations
  if (req.body.totalQuantity !== undefined) {
    res.status(400);
    throw new Error('Total quantity cannot be manually updated. Use batch operations instead.');
  }
  
  // Build update object
  const updateData = {};
  if (req.body.ingredientName) updateData.ingredientName = req.body.ingredientName.trim();
  if (req.body.unit) updateData.unit = req.body.unit.trim().toLowerCase();
  if (req.body.costPrice !== undefined) updateData.costPrice = req.body.costPrice;
  if (req.body.warningThreshold !== undefined) updateData.warningThreshold = req.body.warningThreshold;
  
  // Update ingredient
  ingredient = await Ingredient.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );
  
  res.status(200).json({
    success: true,
    message: 'Ingredient updated successfully',
    data: ingredient,
  });
});

/**
 * @desc    Delete ingredient
 * @route   DELETE /api/ingredients/:id
 * @access  Private (Admin, Kitchen_Manager only)
 */
const deleteIngredient = asyncHandler(async (req, res) => {
  const ingredient = await Ingredient.findById(req.params.id);
  
  if (!ingredient) {
    res.status(404);
    throw new Error('Ingredient not found');
  }
  
  // Business Rule: Check if ingredient is used in product recipes
  const Product = require('../models/Product');
  const productsUsingIngredient = await Product.countDocuments({
    'recipe.ingredientId': req.params.id,
  });
  
  if (productsUsingIngredient > 0) {
    res.status(400);
    throw new Error(
      `Cannot delete ingredient. It is being used in ${productsUsingIngredient} product recipe(s)`
    );
  }
  
  // Business Rule: Check if ingredient has active batches
  const activeBatches = await IngredientBatch.countDocuments({
    ingredientId: req.params.id,
    isActive: true,
    currentQuantity: { $gt: 0 },
  });
  
  if (activeBatches > 0) {
    res.status(400);
    throw new Error(
      `Cannot delete ingredient. It has ${activeBatches} active batch(es) with remaining stock`
    );
  }
  
  // Safe to delete
  await ingredient.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Ingredient deleted successfully',
    data: {},
  });
});

module.exports = {
  getIngredients,
  getIngredientById,
  createIngredient,
  addBatch,
  getBatchesByIngredient,
  updateIngredient,
  deleteIngredient,
};
