const Category = require('../models/Category');

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Private (All authenticated users can view)
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ categoryName: 1 });
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single category by ID
 * @route   GET /api/categories/:id
 * @access  Private (All authenticated users can view)
 */
const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      res.status(404);
      return next(new Error('Category not found'));
    }
    
    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new category
 * @route   POST /api/categories
 * @access  Private (Admin, Kitchen_Manager only)
 */
const createCategory = async (req, res, next) => {
  try {
    const { categoryName } = req.body;
    
    // Validation: Check required field
    if (!categoryName || categoryName.trim() === '') {
      res.status(400);
      return next(new Error('Category name is required'));
    }
    
    // Validation: Check for duplicate (case-insensitive)
    const existingCategory = await Category.findOne({
      categoryName: { $regex: `^${categoryName.trim()}$`, $options: 'i' },
    });
    
    if (existingCategory) {
      res.status(400);
      return next(new Error('Category with this name already exists'));
    }
    
    // Create category
    const category = await Category.create({
      categoryName: categoryName.trim(),
    });
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
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
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private (Admin, Kitchen_Manager only)
 */
const updateCategory = async (req, res, next) => {
  try {
    let category = await Category.findById(req.params.id);
    
    if (!category) {
      res.status(404);
      return next(new Error('Category not found'));
    }
    
    // If updating categoryName, check for duplicates
    if (req.body.categoryName && req.body.categoryName.trim() !== category.categoryName) {
      const existingCategory = await Category.findOne({
        categoryName: { $regex: `^${req.body.categoryName.trim()}$`, $options: 'i' },
        _id: { $ne: req.params.id },
      });
      
      if (existingCategory) {
        res.status(400);
        return next(new Error('Category with this name already exists'));
      }
    }
    
    // Update category
    category = await Category.findByIdAndUpdate(
      req.params.id,
      { categoryName: req.body.categoryName?.trim() },
      {
        new: true,
        runValidators: true,
      }
    );
    
    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
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
 * @desc    Delete category
 * @route   DELETE /api/categories/:id
 * @access  Private (Admin, Kitchen_Manager only)
 */
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      res.status(404);
      return next(new Error('Category not found'));
    }
    
    // Business Rule: Check if category is being used by products
    const Product = require('../models/Product');
    const productsUsingCategory = await Product.countDocuments({
      categoryId: req.params.id,
    });
    
    if (productsUsingCategory > 0) {
      res.status(400);
      return next(
        new Error(
          `Cannot delete category. It is being used by ${productsUsingCategory} product(s)`
        )
      );
    }
    
    // Safe to delete
    await category.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
