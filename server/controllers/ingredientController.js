const Ingredient = require('../models/Ingredient');

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

const createIngredient = async (req, res, next) => {
  try {
    const { name, unit, costPrice, warningThreshold } = req.body;
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

const updateIngredient = async (req, res, next) => {
  try {
    let ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      res.status(404);
      return next(new Error('Ingredient not found'));
    }
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

const deleteIngredient = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      res.status(404);
      return next(new Error('Ingredient not found'));
    }
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
