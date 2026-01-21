const Ingredient = require('../models/Ingredient');
const IngredientBatch = require('../models/IngredientBatch');

/**
 * @desc    Get all ingredients
 * @route   GET /api/ingredients
 * @access  Private (All authenticated users can view)
 */
const getIngredients = async (req, res, next) => {
  try {
    const ingredients = await Ingredient.find().sort({ ingredientName: 1 });
    
    res.status(200).json({
      success: true,
      count: ingredients.length,
      data: ingredients,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single ingredient by ID with active batches (FEFO sorted)
 * @route   GET /api/ingredients/:id
 * @access  Private (All authenticated users can view)
 */
const getIngredientById = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    
    if (!ingredient) {
      res.status(404);
      return next(new Error('Ingredient not found'));
    }
    
    // Get all active batches sorted by expiry date (FEFO - First Expired First Out)
    const batches = await IngredientBatch.find({
      ingredientId: req.params.id,
      isActive: true,
      currentQuantity: { $gt: 0 },
    }).sort({ expiryDate: 1 }); // Ascending order - oldest expiry first
    
    // Calculate total quantity from batches
    const totalQuantity = batches.reduce((sum, batch) => sum + batch.currentQuantity, 0);
    
    // Check if below threshold
    const isBelowThreshold = totalQuantity < ingredient.warningThreshold;
    
    res.status(200).json({
      success: true,
      data: {
        ...ingredient.toObject(),
        totalQuantity,
        isBelowThreshold,
        batches,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new ingredient
 * @route   POST /api/ingredients
 * @access  Private (Admin, Manager only)
 */
const createIngredient = async (req, res, next) => {
  try {
    const { ingredientName, unit, warningThreshold } = req.body;
    
    // Validation: Check required fields
    if (!ingredientName || ingredientName.trim() === '') {
      res.status(400);
      return next(new Error('Ingredient name is required'));
    }
    
    if (!unit || unit.trim() === '') {
      res.status(400);
      return next(new Error('Unit is required'));
    }
    
    // Validation: Check for duplicate name (case-insensitive)
    const existingIngredient = await Ingredient.findOne({
      ingredientName: { $regex: `^${ingredientName.trim()}$`, $options: 'i' },
    });
    
    if (existingIngredient) {
      res.status(400);
      return next(new Error('Ingredient with this name already exists'));
    }
    
    // Create ingredient (unit will be auto-converted to lowercase by pre-save hook)
    // NOTE: costPrice removed - now tracked per batch
    const ingredient = await Ingredient.create({
      ingredientName: ingredientName.trim(),
      unit: unit.trim(),
      warningThreshold: warningThreshold || 10,
    });
    
    res.status(201).json({
      success: true,
      message: 'Ingredient created successfully',
      data: ingredient,
    });
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      res.status(400);
      const messages = Object.values(error.errors).map((err) => err.message);
      return next(new Error(messages.join(', ')));
    }
    next(error);
  }
};

/**
 * @desc    Update ingredient
 * @route   PUT /api/ingredients/:id
 * @access  Private (Admin, Kitchen_Manager only)
 */
const updateIngredient = async (req, res, next) => {
  try {
    let ingredient = await Ingredient.findById(req.params.id);
    
    if (!ingredient) {
      res.status(404);
      return next(new Error('Ingredient not found'));
    }
    
    // If updating ingredientName, check for duplicates
    if (req.body.ingredientName && req.body.ingredientName.trim() !== ingredient.ingredientName) {
      const existingIngredient = await Ingredient.findOne({
        ingredientName: { $regex: `^${req.body.ingredientName.trim()}$`, $options: 'i' },
        _id: { $ne: req.params.id },
      });
      
      if (existingIngredient) {
        res.status(400);
        return next(new Error('Ingredient with this name already exists'));
      }
    }
    
    // Validate costPrice if being updated
    if (req.body.costPrice !== undefined && req.body.costPrice < 0) {
      res.status(400);
      return next(new Error('Cost price cannot be negative'));
    }
    
    // Validate warningThreshold if being updated
    if (req.body.warningThreshold !== undefined && req.body.warningThreshold < 0) {
      res.status(400);
      return next(new Error('Warning threshold cannot be negative'));
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
  } catch (error) {
    if (error.name === 'ValidationError') {
      res.status(400);
      const messages = Object.values(error.errors).map((err) => err.message);
      return next(new Error(messages.join(', ')));
    }
    next(error);
  }
};

/**
 * @desc    Delete ingredient
 * @route   DELETE /api/ingredients/:id
 * @access  Private (Admin, Kitchen_Manager only)
 */
const deleteIngredient = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    
    if (!ingredient) {
      res.status(404);
      return next(new Error('Ingredient not found'));
    }
    
    // Business Rule: Check if ingredient is used in product recipes
    const Product = require('../models/Product');
    const productsUsingIngredient = await Product.countDocuments({
      'recipe.ingredientId': req.params.id,
    });
    
    if (productsUsingIngredient > 0) {
      res.status(400);
      return next(
        new Error(
          `Cannot delete ingredient. It is being used in ${productsUsingIngredient} product recipe(s)`
        )
      );
    }
    
    // Safe to delete
    await ingredient.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Ingredient deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
};
