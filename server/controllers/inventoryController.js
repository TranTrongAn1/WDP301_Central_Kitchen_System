const mongoose = require('mongoose');
const StoreInventory = require('../models/StoreInventory');
const Store = require('../models/Store');
const Order = require('../models/Order');
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

    const filter = {
      storeId,
      quantity: { $gt: 0 },
    };
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
      if (!item.productId || !item.productId._id) {
        return; 
      }
      const productKey = item.productId._id.toString();
      
      if (!summary[productKey]) {
        summary[productKey] = {
          productId: item.productId._id,
          productName: item.productId.name || 'Sản phẩm lỗi tên',
          productSku: item.productId.sku || 'N/A',
          totalQuantity: 0,
          batches: 0,
        };
      }
      
      // Trong code cũ cộng `totalQuantity` 2 lần nếu có batchId. Giờ chỉ cộng 1 lần thôi.
      summary[productKey].totalQuantity += (item.quantity || 0);
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

const updateInventoryQuantity = async (req, res, next) => {
  try {
    const { id } = req.params; // ID của bản ghi StoreInventory
    const { quantity } = req.body;

    const inventory = await StoreInventory.findById(id);
    if (!inventory) {
      res.status(404);
      return next(new Error('Inventory item not found'));
    }

    // Kiểm tra quyền: StoreStaff chỉ được sửa kho của mình
    if (req.user.roleId.roleName === 'StoreStaff' && inventory.storeId.toString() !== req.user.storeId.toString()) {
      res.status(403);
      return next(new Error('Unauthorized to update this store inventory'));
    }

    inventory.quantity = quantity;
    inventory.lastUpdated = Date.now();
    await inventory.save();

    res.status(200).json({ success: true, data: inventory });
  } catch (error) {
    next(error);
  }
};

const sellProducts = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { storeId, items } = req.body;

    if (!storeId || !Array.isArray(items) || items.length === 0) {
      res.status(400);
      throw new Error('storeId and non-empty items array are required');
    }

    const userRole = req.user?.roleId?.roleName;
    if (userRole === 'StoreStaff') {
      const userStoreId = req.user.storeId?._id
        ? req.user.storeId._id.toString()
        : req.user.storeId?.toString();

      if (!userStoreId || userStoreId !== storeId.toString()) {
        res.status(403);
        throw new Error('StoreStaff can only sell from their own store');
      }
    }

    const soldDetails = [];

    for (const item of items) {
      const { productId, quantity, batchId } = item || {};

      if (!productId || !quantity || quantity <= 0) {
        res.status(400);
        throw new Error('Each item must include productId and quantity > 0');
      }

      if (batchId) {
        const inventoryRecord = await StoreInventory.findOne({
          storeId,
          productId,
          batchId,
        }).session(session);

        if (!inventoryRecord || inventoryRecord.quantity < quantity) {
          res.status(400);
          throw new Error(`Insufficient stock for product ${productId} in selected batch ${batchId}`);
        }

        inventoryRecord.quantity -= quantity;
        inventoryRecord.lastUpdated = Date.now();
        await inventoryRecord.save({ session });

        soldDetails.push({
          productId,
          batchId,
          deductedQuantity: quantity,
          inventoryId: inventoryRecord._id,
        });

        continue;
      }

      const inventoryRecords = await StoreInventory.find({
        storeId,
        productId,
        quantity: { $gt: 0 },
      })
        .populate('batchId', 'batchCode expDate')
        .session(session);

      const sortedRecords = inventoryRecords.sort((a, b) => {
        const expA = a.batchId?.expDate ? new Date(a.batchId.expDate).getTime() : Number.MAX_SAFE_INTEGER;
        const expB = b.batchId?.expDate ? new Date(b.batchId.expDate).getTime() : Number.MAX_SAFE_INTEGER;
        return expA - expB;
      });

      let remainingToDeduct = quantity;

      for (const record of sortedRecords) {
        if (remainingToDeduct <= 0) {
          break;
        }

        const deductAmount = Math.min(record.quantity, remainingToDeduct);
        if (deductAmount <= 0) {
          continue;
        }

        record.quantity -= deductAmount;
        record.lastUpdated = Date.now();
        await record.save({ session });

        soldDetails.push({
          productId,
          batchId: record.batchId?._id || null,
          deductedQuantity: deductAmount,
          inventoryId: record._id,
        });

        remainingToDeduct -= deductAmount;
      }

      if (remainingToDeduct > 0) {
        res.status(400);
        throw new Error(`Insufficient stock for product ${productId}. Missing quantity: ${remainingToDeduct}`);
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Products sold and inventory deducted successfully',
      soldDetails,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

const updateOrderStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction(); // Sử dụng Transaction để đảm bảo an toàn dữ liệu

  try {
    const { orderId } = req.params;
    const { status } = req.body; // status gửi lên là "Received"

    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error('Order not found');

    // Chỉ xử lý nếu trạng thái cũ chưa phải là Received và trạng thái mới là Received
    if (order.status !== 'Received' && status === 'Received') {
      
      // Lặp qua từng item trong đơn hàng để cộng kho
      const inventoryPromises = order.items.map(async (item) => {
        return StoreInventory.findOneAndUpdate(
          {
            storeId: order.storeId,
            productId: item.productId,
            batchId: item.batchId // batchId này phải được gán từ lúc Warehouse xuất hàng
          },
          {
            $inc: { quantity: item.quantity }, // Tự động cộng dồn số lượng
            $set: { lastUpdated: Date.now() }
          },
          {
            upsert: true, // Nếu chưa có sản phẩm/batch này trong kho thì tạo mới
            new: true,
            session
          }
        );
      });

      await Promise.all(inventoryPromises);
      
      // Cập nhật thông tin nhận hàng vào đơn hàng
      order.status = 'Received';
      order.receivedDate = Date.now();
      await order.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, message: 'Order received and inventory updated' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
const getAllInventory = async (req, res, next) => {
  try {
    const { productId } = req.query;
    const filter = {
      quantity: { $gt: 0 },
    };
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
const deleteInventoryItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const inventory = await StoreInventory.findById(id);
    if (!inventory) {
      res.status(404);
      return next(new Error('Inventory item not found'));
    }

    // Chỉ Admin mới được quyền xóa bản ghi kho (để tránh Staff xóa làm mất dấu số liệu)
    if (req.user.roleId.roleName !== 'Admin') {
      res.status(403);
      return next(new Error('Only Admin can delete inventory records'));
    }

    await inventory.deleteOne();

    res.status(200).json({ success: true, message: 'Inventory record removed' });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  getStoreInventory,
  getAllInventory,
  updateInventoryQuantity,
  sellProducts,
  deleteInventoryItem,
  updateOrderStatus
};
