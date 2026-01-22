const Store = require('../models/Store');

/**
 * @desc    Get all stores
 * @route   GET /api/stores
 * @access  Private (All authenticated users)
 */
const getStores = async (req, res, next) => {
  try {
    const stores = await Store.find().sort({ storeName: 1 });

    res.status(200).json({
      success: true,
      count: stores.length,
      data: stores,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single store by ID
 * @route   GET /api/stores/:id
 * @access  Private
 */
const getStoreById = async (req, res, next) => {
  try {
    const store = await Store.findById(req.params.id);

    if (!store) {
      res.status(404);
      return next(new Error('Store not found'));
    }

    res.status(200).json({
      success: true,
      data: store,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new store
 * @route   POST /api/stores
 * @access  Private (Admin, Manager)
 */
const createStore = async (req, res, next) => {
  try {
    const { storeName, storeCode, address, phone, standardDeliveryMinutes, status } = req.body;

    // Check if store name already exists
    const existingStore = await Store.findOne({ storeName });
    if (existingStore) {
      res.status(400);
      return next(new Error('Store with this name already exists'));
    }

    // Check if store code already exists
    const existingStoreCode = await Store.findOne({ storeCode });
    if (existingStoreCode) {
      res.status(400);
      return next(new Error('Store with this code already exists'));
    }

    const store = await Store.create({
      storeName,
      storeCode,
      address,
      phone,
      standardDeliveryMinutes,
      status,
    });

    res.status(201).json({
      success: true,
      message: 'Store created successfully',
      data: store,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update store
 * @route   PUT /api/stores/:id
 * @access  Private (Admin, Manager)
 */
const updateStore = async (req, res, next) => {
  try {
    let store = await Store.findById(req.params.id);

    if (!store) {
      res.status(404);
      return next(new Error('Store not found'));
    }

    // Check if new name already exists (if name is being changed)
    if (req.body.storeName && req.body.storeName !== store.storeName) {
      const existingStore = await Store.findOne({ storeName: req.body.storeName });
      if (existingStore) {
        res.status(400);
        return next(new Error('Store with this name already exists'));
      }
    }

    // Check if new store code already exists (if code is being changed)
    if (req.body.storeCode && req.body.storeCode !== store.storeCode) {
      const existingStoreCode = await Store.findOne({ storeCode: req.body.storeCode });
      if (existingStoreCode) {
        res.status(400);
        return next(new Error('Store with this code already exists'));
      }
    }

    store = await Store.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Store updated successfully',
      data: store,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete store
 * @route   DELETE /api/stores/:id
 * @access  Private (Admin only)
 */
const deleteStore = async (req, res, next) => {
  try {
    const store = await Store.findById(req.params.id);

    if (!store) {
      res.status(404);
      return next(new Error('Store not found'));
    }

    // Check if store has assigned users
    const User = require('../models/User');
    const usersInStore = await User.countDocuments({ storeId: req.params.id });

    if (usersInStore > 0) {
      res.status(400);
      return next(
        new Error(
          `Cannot delete store. ${usersInStore} user(s) are currently assigned to this store`
        )
      );
    }

    await store.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Store deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
};
