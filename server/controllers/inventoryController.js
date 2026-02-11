const StoreInventory = require('../models/StoreInventory');
const Store = require('../models/Store');

const getStoreInventory = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const { productId } = req.query;

    const store = await Store.findById(storeId);
    if (!store) {
      res.status(404);
      return next(new Error('Store not found'));
    }

    if (req.user.roleId.roleName === 'StoreStaff') {
      // Extract ID safely - handle both populated object and plain ObjectId
      const userStoreId = req.user.storeId?._id 
        ? req.user.storeId._id.toString() 
        : req.user.storeId?.toString();
      
      console.log('[DEBUG] StoreStaff Authorization Check:', {
        userStoreId,
        requestedStoreId: storeId,
        match: userStoreId === storeId
      });

      if (!userStoreId || userStoreId !== storeId) {
        res.status(403);
        return next(new Error('You can only view your own store inventory'));
      }
    }

    const filter = { storeId };
    if (productId) {
      filter.productId = productId;
    }

    const inventory = await StoreInventory.find(filter)
      .populate('productId', 'name sku price shelfLifeDays')
      .populate('batchId', 'batchCode mfgDate expDate')
      .populate('storeId', 'storeName address')
      .sort({ lastUpdated: -1 });

    const summary = {};
    inventory.forEach((item) => {
      const productKey = item.productId._id.toString();
      if (!summary[productKey]) {
        summary[productKey] = {
          productId: item.productId._id,
          productName: item.productId.name,
          productSku: item.productId.sku,
          totalQuantity: 0,
          batches: 0,
        };
      }
      summary[productKey].totalQuantity += item.quantity;
      summary[productKey].batches += 1;
    });

    res.status(200).json({
      success: true,
      store: {
        id: store._id,
        name: store.storeName,
        address: store.address,
      },
      summary: Object.values(summary),
      count: inventory.length,
      data: inventory,
    });
  } catch (error) {
    next(error);
  }
};

const getAllInventory = async (req, res, next) => {
  try {
    const { productId } = req.query;
    const filter = {};
    if (productId) {
      filter.productId = productId;
    }
    const inventory = await StoreInventory.find(filter)
      .populate('productId', 'name sku price')
      .populate('batchId', 'batchCode mfgDate expDate')
      .populate('storeId', 'storeName address')
      .sort({ storeId: 1, lastUpdated: -1 });

    const byStore = {};
    inventory.forEach((item) => {
      const storeKey = item.storeId._id.toString();
      if (!byStore[storeKey]) {
        byStore[storeKey] = {
          store: {
            id: item.storeId._id,
            name: item.storeId.storeName,
            address: item.storeId.address,
          },
          items: [],
          totalQuantity: 0,
        };
      }
      byStore[storeKey].items.push(item);
      byStore[storeKey].totalQuantity += item.quantity;
    });

    res.status(200).json({
      success: true,
      storeCount: Object.keys(byStore).length,
      totalItems: inventory.length,
      data: Object.values(byStore),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStoreInventory,
  getAllInventory,
};
