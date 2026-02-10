const mongoose = require('mongoose');
const Order = require('../models/Order');
const DeliveryTrip = require('../models/DeliveryTrip');
const Batch = require('../models/BatchModel');
const StoreInventory = require('../models/StoreInventory');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');

/**
 * @desc    Create a new order
 * @route   POST /api/logistics/orders
 * @access  Private (Store Staff, Manager)
 */
const createOrder = async (req, res, next) => {
  try {
    const { storeId, items, notes, requestedDeliveryDate } = req.body;

    // STEP 1: Validation - Basic Input
    // ========================================
    
    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400);
      return next(new Error('Order must contain at least one item'));
    }

    // Validate storeId
    if (!storeId) {
      res.status(400);
      return next(new Error('Store ID is required'));
    }

    // Validate requestedDeliveryDate
    if (!requestedDeliveryDate) {
      res.status(400);
      return next(new Error('Requested delivery date is required'));
    }

    // STEP 2: Validate Store Existence & Status
    // ========================================
    const store = await Store.findById(storeId);
    if (!store) {
      res.status(404);
      return next(new Error('Store not found'));
    }

    if (store.status !== 'Active') {
      res.status(400);
      return next(new Error(`Store is ${store.status}. Only Active stores can place orders.`));
    }

    // ========================================
    // STEP 3: Validate Delivery Date
    // ========================================
    const deliveryDate = new Date(requestedDeliveryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (deliveryDate < today) {
      res.status(400);
      return next(new Error('Requested delivery date cannot be in the past'));
    }

    // ========================================
    // STEP 4: Auto-generate Order Number
    // ========================================
    const timestamp = Date.now();
    const orderNumber = `ORD-${timestamp}`;

    // Double-check uniqueness (unlikely collision but good practice)
    const existingOrder = await Order.findOne({ orderNumber });
    if (existingOrder) {
      // Add random suffix if collision
      const orderNumberUnique = `${orderNumber}-${Math.floor(Math.random() * 1000)}`;
      return createOrder({ 
        body: { storeId, requestedDeliveryDate, items, notes, _orderNumber: orderNumberUnique } 
      }, res, next);
    }

    // ========================================
    // STEP 5: Process Order Items - Fetch Prices & Calculate
    // ========================================
    const orderItems = [];
    // Validate items
    if (!items || items.length === 0) {
      res.status(400);
      return next(new Error('Order must have at least one item'));
    }

    // Process items: fetch real prices from Product collection
    const enrichedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const { productId, quantityRequested } = item;

      // Validate quantity
      if (!quantityRequested || quantityRequested < 1) {
        res.status(400);
        return next(
          new Error(`Invalid quantity for product: ${productId}`)
        );
      }

      // Fetch product to get real price
      const product = await Product.findById(productId);
      if (!product) {
        res.status(400);
        return next(new Error(`Product not found: ${productId}`));
      }

      // Calculate pricing
      const unitPrice = product.price || 0;
      const subtotal = unitPrice * quantityRequested;

      // Accumulate total
      totalAmount += subtotal;

      // Build enriched item with pricing data
      enrichedItems.push({
        productId: product._id,
        quantity: quantityRequested,
        unitPrice,
        subtotal,
      });
    }

    // ========================================
    // STEP 6: Create Order Document
    // ========================================
    const order = await Order.create({
      storeId,
      createdBy: req.user._id,
      requestedDeliveryDate: new Date(requestedDeliveryDate),
      items: enrichedItems,
      totalAmount,
      notes: notes || '',
    });

    // ========================================
    // STEP 7: Populate and Return Response
    // ========================================
    await order.populate([
      { path: 'storeId', select: 'storeName storeCode address' },
      { path: 'createdBy', select: 'username fullName email' },
      { path: 'items.productId', select: 'name sku price unit' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve order and create shipping trip
 * @route   POST /api/logistics/orders/:orderId/approve-and-ship
 * @access  Private (Manager, Admin)
 */
const approveAndShipOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.params;
    const { driverId, vehicleNumber, items } = req.body;

    // Find order
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      res.status(404);
      return next(new Error('Order not found'));
    }

    // Check status
    if (order.status !== 'Pending') {
      await session.abortTransaction();
      res.status(400);
      return next(new Error('Can only approve orders with Pending status'));
    }

    // Validate and assign batches to items
    if (!items || items.length !== order.items.length) {
      await session.abortTransaction();
      res.status(400);
      return next(new Error('Must provide batch assignments for all items'));
    }

    // Process each item and deduct from batch
    for (let i = 0; i < items.length; i++) {
      const { batchId } = items[i];
      const orderItem = order.items[i];

      const batch = await Batch.findById(batchId).session(session);
      if (!batch) {
        await session.abortTransaction();
        res.status(400);
        return next(new Error(`Batch not found: ${batchId}`));
      }

      // Check if batch has enough quantity
      if (orderItem.quantity > batch.currentQuantity) {
        await session.abortTransaction();
        res.status(400);
        return next(
          new Error(
            `Insufficient quantity for batch ${batch.batchCode}. Available: ${batch.currentQuantity}, Required: ${orderItem.quantity}`
          )
        );
      }

      // Deduct from batch
      batch.currentQuantity -= orderItem.quantity;
      await batch.save({ session });

      // Assign batchId to order item
      orderItem.batchId = batchId;
    }

    // Update order status to Approved
    order.status = 'Approved';
    order.approvedBy = req.user._id;
    order.approvedDate = new Date();
    await order.save({ session });

    // Create delivery trip
    const trip = await DeliveryTrip.create(
      [
        {
          driverId,
          vehicleNumber,
          orders: [orderId],
          status: 'In_Transit',
          departureTime: new Date(),
        },
      ],
      { session }
    );

    // Create invoice for the order
    const invoice = await Invoice.create(
      [
        {
          orderId: order._id,
          storeId: order.storeId,
          totalAmount: order.totalAmount,
          items: order.items.map(item => ({
            productId: item.productId,
            batchId: item.batchId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
          status: 'Pending',
          issueDate: new Date(),
        },
      ],
      { session }
    );

    // Update order status to In_Transit
    order.status = 'In_Transit';
    order.shippedDate = new Date();
    await order.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate and return
    await order.populate([
      { path: 'storeId', select: 'storeName storeCode address' },
      { path: 'createdBy', select: 'username fullName email' },
      { path: 'approvedBy', select: 'username fullName email' },
      { path: 'items.productId', select: 'name sku price' },
      { path: 'items.batchId', select: 'batchCode mfgDate expDate' },
    ]);

    await trip[0].populate([
      { path: 'driverId', select: 'username fullName email' },
      { path: 'orders' },
    ]);

    await invoice[0].populate([
      { path: 'orderId', select: 'orderNumber totalAmount' },
      { path: 'storeId', select: 'storeName storeCode' },
      { path: 'items.productId', select: 'name sku' },
      { path: 'items.batchId', select: 'batchCode' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Order approved and shipped successfully',
      data: {
        order,
        trip: trip[0],
        invoice: invoice[0],
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    session.endSession();
  }
};



/**
 * @desc    Reject/Cancel order with reason
 * @route   POST /api/logistics/orders/:orderId/reject
 * @access  Private (Manager, Admin)
 */
const rejectOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    // Validate reason
    if (!reason || reason.trim() === '') {
      res.status(400);
      return next(new Error('Cancellation reason is required'));
    }

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    // Check if order can be cancelled
    if (order.status !== 'Pending') {
      res.status(400);
      return next(
        new Error(
          `Cannot cancel order with status: ${order.status}. Only Pending orders can be cancelled.`
        )
      );
    }

    // Update order status
    order.status = 'Cancelled';
    order.cancellationReason = reason.trim();
    order.cancelledDate = new Date();
    await order.save();

    // Populate references
    await order.populate([
      { path: 'storeId', select: 'storeName storeCode address' },
      { path: 'createdBy', select: 'username fullName email' },
      { path: 'items.productId', select: 'name sku price' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Receive order (QR scan or manual confirmation)
 * @route   POST /api/logistics/orders/:orderId/receive
 * @access  Private (Store Staff, Manager)
 */
const receiveOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.params;

    // Find the order
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      res.status(404);
      return next(new Error('Order not found'));
    }

    // Check order status
    if (order.status !== 'In_Transit') {
      await session.abortTransaction();
      res.status(400);
      return next(
        new Error(
          `Cannot receive order with status: ${order.status}. Order must be In_Transit.`
        )
      );
    }

    // Find the active delivery trip for this order
    const trip = await DeliveryTrip.findOne({
      orders: orderId,
      status: 'In_Transit',
    }).session(session);

    if (!trip) {
      await session.abortTransaction();
      res.status(404);
      return next(
        new Error('No active delivery trip found for this order')
      );
    }

    // Verify store staff can only receive orders for their store
    if (req.user.roleId?.roleName === 'StoreStaff') {
      // Safely extract store IDs for comparison
      const userStoreId = req.user.storeId?._id 
        ? req.user.storeId._id.toString() 
        : req.user.storeId?.toString();
      
      const orderStoreId = order.storeId?._id 
        ? order.storeId._id.toString() 
        : order.storeId?.toString();

      console.log('🔍 Store ID Comparison (receiveOrder):');
      console.log('  User Store ID:', userStoreId);
      console.log('  Order Store ID:', orderStoreId);

      if (!userStoreId || userStoreId !== orderStoreId) {
        await session.abortTransaction();
        res.status(403);
        return next(
          new Error('You can only receive orders for your assigned store')
        );
      }
    }

    // Add items to store inventory
    for (const item of order.items) {
      if (!item.batchId) {
        continue; // Skip items without batch assignment
      }

      const batch = await Batch.findById(item.batchId).session(session);
      if (!batch) {
        continue;
      }

      // Check if store inventory entry exists
      const existingInventory = await StoreInventory.findOne({
        storeId: order.storeId,
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
              storeId: order.storeId,
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

    // Update order status
    order.status = 'Received';
    order.receivedDate = new Date();
    await order.save({ session });

    // Check if all orders in the trip are received
    const allOrders = await Order.find({
      _id: { $in: trip.orders },
    }).session(session);

    const allReceived = allOrders.every((o) => o.status === 'Received');

    if (allReceived) {
      trip.status = 'Completed';
      trip.completedTime = new Date();
      await trip.save({ session });
    }

    await session.commitTransaction();

    // Populate and return
    await order.populate([
      { path: 'storeId', select: 'storeName storeCode address' },
      { path: 'createdBy', select: 'username fullName email' },
      { path: 'items.productId', select: 'name sku price' },
      { path: 'items.batchId', select: 'batchCode mfgDate expDate' },
    ]);

    await trip.populate([
      { path: 'driverId', select: 'username fullName email' },
      { path: 'orders', select: 'orderCode status' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Order received successfully',
      data: {
        order,
        trip,
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get all orders
 * @route   GET /api/logistics/orders
 * @access  Private
 */
const getOrders = async (req, res, next) => {
  try {
    const { status, storeId } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (storeId) {
      filter.storeId = storeId;
    }

    // If user is store staff, only show orders for their store
    if (req.user.roleId?.roleName === 'StoreStaff' && req.user.storeId) {
      filter.storeId = req.user.storeId;
    }

    const orders = await Order.find(filter)
      .populate('storeId', 'storeName storeCode address')
      .populate('createdBy', 'username fullName email')
      .populate('approvedBy', 'username fullName email')
      .populate('items.productId', 'name sku price')
      .populate('items.batchId', 'batchCode mfgDate expDate')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single order by ID
 * @route   GET /api/logistics/orders/:id
 * @access  Private
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('storeId', 'storeName storeCode address phone')
      .populate('createdBy', 'username fullName email')
      .populate('approvedBy', 'username fullName email')
      .populate('items.productId', 'name sku price')
      .populate('items.batchId', 'batchCode mfgDate expDate currentQuantity');

    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    // If user is store staff, verify they can only view their store's orders
    if (req.user.roleId?.roleName === 'StoreStaff') {
      // Safely extract store IDs for comparison
      // Handle both populated objects (with _id) and unpopulated ObjectIds
      const userStoreId = req.user.storeId?._id 
        ? req.user.storeId._id.toString() 
        : req.user.storeId?.toString();
      
      const orderStoreId = order.storeId?._id 
        ? order.storeId._id.toString() 
        : order.storeId?.toString();

      // Debug logging
      console.log('🔍 Store ID Comparison Debug:');
      console.log('  User Store ID:', userStoreId);
      console.log('  Order Store ID:', orderStoreId);
      console.log('  Match:', userStoreId === orderStoreId);

      if (!userStoreId || userStoreId !== orderStoreId) {
        res.status(403);
        return next(
          new Error('You can only view orders for your assigned store')
        );
      }
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all delivery trips
 * @route   GET /api/logistics/trips
 * @access  Private
 */
const getTrips = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    const trips = await DeliveryTrip.find(filter)
      .populate('driverId', 'username fullName email')
      .populate({
        path: 'orders',
        populate: [
          { path: 'storeId', select: 'storeName storeCode' },
          { path: 'items.productId', select: 'name sku' },
        ],
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: trips.length,
      data: trips,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single trip by ID
 * @route   GET /api/logistics/trips/:id
 * @access  Private
 */
const getTripById = async (req, res, next) => {
  try {
    const trip = await DeliveryTrip.findById(req.params.id)
      .populate('driverId', 'username fullName email phone')
      .populate({
        path: 'orders',
        populate: [
          { path: 'storeId', select: 'storeName storeCode address phone' },
          { path: 'items.productId', select: 'name sku price' },
          { path: 'items.batchId', select: 'batchCode mfgDate expDate' },
        ],
      });

    if (!trip) {
      res.status(404);
      return next(new Error('Delivery trip not found'));
    }

    res.status(200).json({
      success: true,
      data: trip,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Aggregate daily demand for production planning
 * @route   GET /api/logistics/orders/aggregate
 * @access  Private (Manager, Admin)
 */
const aggregateDailyDemand = async (req, res, next) => {
  try {
    const { requestedDeliveryDate, startDate, endDate } = req.query;

    // Build match stage for filtering
    const matchStage = {
      status: { $in: ['Pending', 'Approved'] }, // Not yet shipped/completed
    };

    // Optional: Filter by requested delivery date
    if (requestedDeliveryDate) {
      const targetDate = new Date(requestedDeliveryDate);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      matchStage.createdAt = {
        $gte: targetDate,
        $lt: nextDay,
      };
    } else if (startDate || endDate) {
      // Alternative: filter by date range
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate);
      }
    } else {
      // Default: today and tomorrow (next 48 hours)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const twoDaysLater = new Date(today);
      twoDaysLater.setDate(twoDaysLater.getDate() + 2);

      matchStage.createdAt = {
        $gte: today,
        $lt: twoDaysLater,
      };
    }

    // MongoDB Aggregation Pipeline
    const aggregationPipeline = [
      // Stage 1: Filter orders by status and date
      {
        $match: matchStage,
      },

      // Stage 2: Unwind the items array
      {
        $unwind: '$items',
      },

      // Stage 3: Group by productId and sum quantities
      {
        $group: {
          _id: '$items.productId',
          totalQuantityNeeded: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 }, // Count how many orders need this product
          orders: {
            $push: {
              orderId: '$_id',
              orderCode: '$orderCode',
              storeId: '$storeId',
              quantity: '$items.quantity',
            },
          },
        },
      },

      // Stage 4: Lookup product details
      {
        $lookup: {
          from: 'products', // Collection name in MongoDB
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails',
        },
      },

      // Stage 5: Unwind product details
      {
        $unwind: {
          path: '$productDetails',
          preserveNullAndEmptyArrays: false,
        },
      },

      // Stage 6: Project final structure
      {
        $project: {
          _id: 1,
          productId: '$_id',
          productName: '$productDetails.name',
          sku: '$productDetails.sku',
          unit: '$productDetails.unit',
          totalQuantityNeeded: 1,
          orderCount: 1,
          orders: 1,
        },
      },

      // Stage 7: Sort by total quantity needed (descending)
      {
        $sort: { totalQuantityNeeded: -1 },
      },
    ];

    // Execute aggregation
    const demandData = await Order.aggregate(aggregationPipeline);

    // Calculate summary statistics
    const summary = {
      totalProducts: demandData.length,
      totalQuantityAllProducts: demandData.reduce(
        (sum, item) => sum + item.totalQuantityNeeded,
        0
      ),
      totalOrders: await Order.countDocuments(matchStage),
      dateRange: matchStage.createdAt
        ? {
            from: matchStage.createdAt.$gte || 'N/A',
            to: matchStage.createdAt.$lt || matchStage.createdAt.$lte || 'N/A',
          }
        : 'All time',
    };

    res.status(200).json({
      success: true,
      summary,
      count: demandData.length,
      data: demandData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  approveAndShipOrder,
  receiveOrder,
  rejectOrder,
  getOrders,
  getOrderById,
  getTrips,
  getTripById,
  aggregateDailyDemand,
};
