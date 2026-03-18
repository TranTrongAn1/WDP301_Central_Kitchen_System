const Product = require('../models/Product');
const Category = require('../models/Category');
const Ingredient = require('../models/Ingredient');

const getProducts = async (req, res, next) => {
  try {
    const { categoryId } = req.query;
    const filter = { isActive: true };
    if (categoryId) {
      filter.categoryId = categoryId;
    }
    const products = await Product.find(filter)
      .populate('categoryId', 'name description')
      .populate('recipe.ingredientId', 'name unit costPrice')
      .populate('bundleItems.childProductId', 'name sku price')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name description')
      .populate('recipe.ingredientId', 'name unit costPrice')
      .populate('bundleItems.childProductId', 'name sku price');
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      categoryId,
      price,
      shelfLifeDays,
      weight,
      weightUnit,
      image,
      recipe,
      bundleItems,
    } = req.body;

    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      res.status(400);
      return next(new Error('Product with this SKU already exists'));
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      res.status(400);
      return next(new Error('Invalid category'));
    }

    if (recipe && recipe.length > 0) {
      for (const item of recipe) {
        const ingredient = await Ingredient.findById(item.ingredientId);
        if (!ingredient) {
          res.status(400);
          return next(
            new Error(`Invalid ingredient ID: ${item.ingredientId}`)
          );
        }
      }
    }

    if (bundleItems && bundleItems.length > 0) {
      for (const item of bundleItems) {
        const childProduct = await Product.findById(item.childProductId);
        if (!childProduct) {
          res.status(400);
          return next(
            new Error(`Invalid child product ID: ${item.childProductId}`)
          );
        }
      }
    }

    const product = await Product.create({
      name,
      sku,
      categoryId,
      price,
      shelfLifeDays,
      weight,
      weightUnit,
      image,
      recipe: recipe || [],
      bundleItems: bundleItems || [],
    });

    await product.populate('categoryId', 'name description');
    await product.populate('recipe.ingredientId', 'name unit costPrice');
    await product.populate('bundleItems.childProductId', 'name sku price');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      categoryId,
      price,
      shelfLifeDays,
      weight,
      weightUnit,
      image,
      recipe,
      bundleItems,
      isActive,
    } = req.body;

    const updateData = {
      ...(name !== undefined && { name }),
      ...(sku !== undefined && { sku }),
      ...(categoryId !== undefined && { categoryId }),
      ...(price !== undefined && { price }),
      ...(shelfLifeDays !== undefined && { shelfLifeDays }),
      ...(weight !== undefined && { weight }),
      ...(weightUnit !== undefined && { weightUnit }),
      ...(image !== undefined && { image }),
      ...(recipe !== undefined && { recipe }),
      ...(bundleItems !== undefined && { bundleItems }),
      ...(isActive !== undefined && { isActive }),
    };

    let product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }
    if (updateData.sku && updateData.sku !== product.sku) {
      const existingProduct = await Product.findOne({ sku: updateData.sku });
      if (existingProduct) {
        res.status(400);
        return next(new Error('Product with this SKU already exists'));
      }
    }
    if (updateData.categoryId) {
      const category = await Category.findById(updateData.categoryId);
      if (!category) {
        res.status(400);
        return next(new Error('Invalid category'));
      }
    }
    if (req.body.recipe !== undefined && !Array.isArray(req.body.recipe)) {
      res.status(400);
      return next(new Error('recipe must be an array'));
    }
    if (req.body.recipe !== undefined && Array.isArray(req.body.recipe) && req.body.recipe.length > 0) {
      for (const item of req.body.recipe) {
        const ingredient = await Ingredient.findById(item.ingredientId);
        if (!ingredient) {
          res.status(400);
          return next(
            new Error(`Invalid ingredient ID: ${item.ingredientId}`)
          );
        }
      }
    }
    if (req.body.bundleItems !== undefined && !Array.isArray(req.body.bundleItems)) {
      res.status(400);
      return next(new Error('bundleItems must be an array'));
    }
    if (req.body.bundleItems !== undefined && Array.isArray(req.body.bundleItems) && req.body.bundleItems.length > 0) {
      for (const item of req.body.bundleItems) {
        if (String(item.childProductId) === String(req.params.id)) {
          res.status(400);
          return next(new Error('A product cannot be bundled with itself'));
        }
        const childProduct = await Product.findById(item.childProductId);
        if (!childProduct) {
          res.status(400);
          return next(
            new Error(`Invalid child product ID: ${item.childProductId}`)
          );
        }
      }
    }
    product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('categoryId', 'name description')
      .populate('recipe.ingredientId', 'name unit costPrice')
      .populate('bundleItems.childProductId', 'name sku price');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }
    const productsUsingThisInBundle = await Product.countDocuments({
      'bundleItems.childProductId': req.params.id,
    });
    if (productsUsingThisInBundle > 0) {
      res.status(400);
      return next(
        new Error(
          `Cannot delete product. It is being used in ${productsUsingThisInBundle} bundle product(s)`
        )
      );
    }
    product.isActive = false;
    await product.save();
    res.status(200).json({
      success: true,
      message: 'Product deactivated successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
