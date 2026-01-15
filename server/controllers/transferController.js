const mongoose = require('mongoose');
const Transfer = require('../models/Transfer');
const Batch = require('../models/BatchModel');
const StoreInventory = require('../models/StoreInventory');
const Store = require('../models/Store');

const getTransfers = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (req.user.roleId.roleName === 'StoreStaff') {
      if (!req.user.storeId) {
        res.status(403);
        return next(new Error('Store staff must be assigned to a store'));
      }
      filter.toStoreId = req.user.storeId;
    }
    const transfers = await Transfer.find(filter)
      .populate('toStoreId', 'storeName address')
      .populate('createdBy', 'fullName username')
      .populate({
        path: 'items.batchId',
        select: 'batchCode productId mfgDate expDate currentQuantity',
        populate: {
          path: 'productId',
          select: 'name sku',
        },
      })
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: transfers.length,
      data: transfers,
    });
  } catch (error) {
    next(error);
  }
};

const getTransferById = async (req, res, next) => {
  try {
    const transfer = await Transfer.findById(req.params.id)
      .populate('toStoreId', 'storeName address')
      .populate('createdBy', 'fullName username email')
      .populate({
        path: 'items.batchId',
        select: 'batchCode productId mfgDate expDate currentQuantity',
        populate: {
          path: 'productId',
          select: 'name sku price',
        },
      });
    if (!transfer) {
      res.status(404);
      return next(new Error('Transfer not found'));
    }
    if (req.user.roleId.roleName === 'StoreStaff') {
      if (transfer.toStoreId._id.toString() !== req.user.storeId.toString()) {
        res.status(403);
        return next(new Error('You can only view transfers to your store'));
      }
    }
    res.status(200).json({
      success: true,
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

const createTransfer = async (req, res, next) => {
  try {
    const { toStoreId, items } = req.body;
    const store = await Store.findById(toStoreId);
    if (!store) {
      res.status(400);
      return next(new Error('Invalid destination store'));
    }
    if (!items || items.length === 0) {
      res.status(400);
      return next(new Error('Transfer must have at least one item'));
    }
    for (const item of items) {
      const batch = await Batch.findById(item.batchId).populate('productId');
      if (!batch) {
        res.status(400);
        return next(new Error(`Invalid batch ID: ${item.batchId}`));
      }
      if (item.quantity > batch.currentQuantity) {
        res.status(400);
        return next(
          new Error(
            `Insufficient quantity for batch ${batch.batchCode}. Available: ${batch.currentQuantity}, Requested: ${item.quantity}`
          )
        );
      }
    }
    const transfer = await Transfer.create({
      toStoreId,
      createdBy: req.user.id,
      items,
    });
    await transfer.populate('toStoreId', 'storeName address');
    await transfer.populate('createdBy', 'fullName username');
    await transfer.populate({
      path: 'items.batchId',
      select: 'batchCode productId mfgDate expDate currentQuantity',
      populate: {
        path: 'productId',
        select: 'name sku',
      },
    });
    res.status(201).json({
      success: true,
      message: 'Transfer created successfully',
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

const updateTransferStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status } = req.body;
    const transferId = req.params.id;
    if (!status) {
      res.status(400);
      return next(new Error('Status is required'));
    }
    const transfer = await Transfer.findById(transferId).session(session);
    if (!transfer) {
      await session.abortTransaction();
      res.status(404);
      return next(new Error('Transfer not found'));
    }
    const userRole = req.user.roleId.roleName;

    if (status === 'Shipped') {
      if (!['Admin', 'Manager'].includes(userRole)) {
        await session.abortTransaction();
        res.status(403);
        return next(new Error('Only Manager/Admin can ship transfers'));
      }
      if (transfer.status !== 'Pending') {
        await session.abortTransaction();
        res.status(400);
        return next(new Error(`Cannot ship transfer with status: ${transfer.status}`));
      }
      for (const item of transfer.items) {
        const batch = await Batch.findById(item.batchId).session(session);
        if (!batch) {
          await session.abortTransaction();
          res.status(400);
          return next(new Error(`Batch not found: ${item.batchId}`));
        }
        if (item.quantity > batch.currentQuantity) {
          await session.abortTransaction();
          res.status(400);
          return next(
            new Error(
              `Insufficient quantity for batch ${batch.batchCode}. Available: ${batch.currentQuantity}, Requested: ${item.quantity}`
            )
          );
        }
        batch.currentQuantity -= item.quantity;
        await batch.save({ session });
      }
      transfer.status = 'Shipped';
      transfer.shippedDate = new Date();
      await transfer.save({ session });
    } else if (status === 'Received') {
      if (userRole === 'StoreStaff') {
        if (!req.user.storeId || req.user.storeId.toString() !== transfer.toStoreId.toString()) {
          await session.abortTransaction();
          res.status(403);
          return next(new Error('You can only receive transfers to your store'));
        }
      } else if (!['Admin', 'Manager'].includes(userRole)) {
        await session.abortTransaction();
        res.status(403);
        return next(new Error('Only StoreStaff/Manager/Admin can receive transfers'));
      }
      if (transfer.status !== 'Shipped') {
        await session.abortTransaction();
        res.status(400);
        return next(new Error(`Cannot receive transfer with status: ${transfer.status}`));
      }
      for (const item of transfer.items) {
        const batch = await Batch.findById(item.batchId).session(session);
        if (!batch) {
          await session.abortTransaction();
          res.status(400);
          return next(new Error(`Batch not found: ${item.batchId}`));
        }
        const existingInventory = await StoreInventory.findOne({
          storeId: transfer.toStoreId,
          batchId: item.batchId,
        }).session(session);
        if (existingInventory) {
          existingInventory.quantity += item.quantity;
          existingInventory.lastUpdated = new Date();
          await existingInventory.save({ session });
        } else {
          await StoreInventory.create(
            [
              {
                storeId: transfer.toStoreId,
                productId: batch.productId,
                batchId: item.batchId,
                quantity: item.quantity,
                lastUpdated: new Date(),
              },
            ],
            { session }
          );
        }
      }
      transfer.status = 'Received';
      transfer.receivedDate = new Date();
      await transfer.save({ session });
    } else if (status === 'Cancelled') {
      if (!['Admin', 'Manager'].includes(userRole)) {
        await session.abortTransaction();
        res.status(403);
        return next(new Error('Only Manager/Admin can cancel transfers'));
      }
      if (transfer.status !== 'Pending') {
        await session.abortTransaction();
        res.status(400);
        return next(new Error('Can only cancel Pending transfers'));
      }
      transfer.status = 'Cancelled';
      await transfer.save({ session });
    } else {
      await session.abortTransaction();
      res.status(400);
      return next(new Error('Invalid status'));
    }

    await session.commitTransaction();

    await transfer.populate('toStoreId', 'storeName address');
    await transfer.populate('createdBy', 'fullName username');
    await transfer.populate({
      path: 'items.batchId',
      select: 'batchCode productId mfgDate expDate currentQuantity',
      populate: {
        path: 'productId',
        select: 'name sku',
      },
    });

    res.status(200).json({
      success: true,
      message: `Transfer ${status.toLowerCase()} successfully`,
      data: transfer,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

const deleteTransfer = async (req, res, next) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      res.status(404);
      return next(new Error('Transfer not found'));
    }
    if (transfer.status !== 'Pending') {
      res.status(400);
      return next(new Error('Can only delete Pending transfers'));
    }
    await transfer.deleteOne();
    res.status(200).json({
      success: true,
      message: 'Transfer deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransfers,
  getTransferById,
  createTransfer,
  updateTransferStatus,
  deleteTransfer,
};
