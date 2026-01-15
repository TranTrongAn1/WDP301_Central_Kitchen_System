const Ingredient = require('../models/Ingredient');

/**
 * @desc    Get all ingredients
 * @route   GET /api/ingredients
 * @access  Private (All authenticated users)
 */
const getIngredients = async (req, res, next) => {
  try {
    const ingredients = await Ingredient.find().sort({ name: 1 });

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
 * @desc    Get single ingredient by ID
 * @route   GET /api/ingredients/:id
 * @access  Private
 */
const getIngredientById = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);

    if (!ingredient) {
      res.status(404);
      return next(new Error('Ingredient not found'));
    }

    res.status(200).json({
      success: true,
      data: ingredient,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new ingredient
 * @route   POST /api/ingredients
 * @access  Private (Admin, Manager)
 */
const createIngredient = async (req, res, next) => {
  try {
    const { name, unit, costPrice, warningThreshold } = req.body;

    // Check if ingredient already exists
    const existingIngredient = await Ingredient.findOne({ name });
    if (existingIngredient) {
      res.status(400);
      return next(new Error('Ingredient with this name already exists'));
    }

    const ingredient = await Ingredient.create({
      name,
      unit,
      costPrice,
      warningThreshold,
    });

    res.status(201).json({
      success: true,
      message: 'Ingredient created successfully',
      data: ingredient,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update ingredient
 * @route   PUT /api/ingredients/:id
 * @access  Private (Admin, Manager)
 */
const updateIngredient = async (req, res, next) => {
  try {
    let ingredient = await Ingredient.findById(req.params.id);

    if (!ingredient) {
      res.status(404);
      return next(new Error('Ingredient not found'));
    }

    // Check if new name already exists (if name is being changed)
    if (req.body.name && req.body.name !== ingredient.name) {
      const existingIngredient = await Ingredient.findOne({
        name: req.body.name,
      });
      if (existingIngredient) {
        res.status(400);
        return next(new Error('Ingredient with this name already exists'));
      }
    }

    ingredient = await Ingredient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Ingredient updated successfully',
      data: ingredient,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete ingredient
 * @route   DELETE /api/ingredients/:id
 * @access  Private (Admin, Manager)
 */
const deleteIngredient = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);

    if (!ingredient) {
      res.status(404);
      return next(new Error('Ingredient not found'));
    }

    // Check if ingredient is being used in any product recipes
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
