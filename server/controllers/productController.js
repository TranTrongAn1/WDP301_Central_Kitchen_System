const Product = require('../models/Product');
const Category = require('../models/Category');
const Ingredient = require('../models/Ingredient');

const getProducts = async (req, res, next) => {
  try {
    const { categoryId } = req.query;
    const filter = {};
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
    let product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }
    if (req.body.sku && req.body.sku !== product.sku) {
      const existingProduct = await Product.findOne({ sku: req.body.sku });
      if (existingProduct) {
        res.status(400);
        return next(new Error('Product with this SKU already exists'));
      }
    }
    if (req.body.categoryId) {
      const category = await Category.findById(req.body.categoryId);
      if (!category) {
        res.status(400);
        return next(new Error('Invalid category'));
      }
    }
    if (req.body.recipe && req.body.recipe.length > 0) {
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
    if (req.body.bundleItems && req.body.bundleItems.length > 0) {
      for (const item of req.body.bundleItems) {
        if (item.childProductId === req.params.id) {
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
    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
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
    await product.deleteOne();
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
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
