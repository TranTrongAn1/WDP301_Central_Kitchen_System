const mongoose = require('mongoose');
const Order = require('../models/Order');
<<<<<<< Updated upstream
const Store = require('../models/Store');
const Product = require('../models/Product');
const Batch = require('../models/BatchModel');
const DeliveryTrip = require('../models/DeliveryTrip');
const Invoice = require('../models/Invoice');
const SystemSetting = require('../models/SystemSetting');
const StoreInventory = require('../models/StoreInventory');

/**
 * @desc    Create new order from store
 * @route   POST /api/logistics/orders
 * @access  Private (Store Manager, Admin)
 */
const createOrder = async (req, res, next) => {
  try {
    const { storeId, requestedDeliveryDate, items, notes } = req.body;

    // ========================================
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
=======
const DeliveryTrip = require('../models/DeliveryTrip');
const Batch = require('../models/BatchModel');
const StoreInventory = require('../models/StoreInventory');
const Store = require('../models/Store');

/**
 * @desc    Create a new order
 * @route   POST /api/logistics/orders
 * @access  Private (Store Staff, Manager)
 */
const createOrder = async (req, res, next) => {
  try {
    const { storeId, items, notes, requestedDeliveryDate } = req.body;

    // Validate store
    const store = await Store.findById(storeId);
    if (!store) {
      res.status(400);
      return next(new Error('Invalid store'));
>>>>>>> Stashed changes
    }

    // Validate requestedDeliveryDate
    if (!requestedDeliveryDate) {
      res.status(400);
      return next(new Error('Requested delivery date is required'));
    }

<<<<<<< Updated upstream
    // ========================================
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
=======
    // Validate items
    if (!items || items.length === 0) {
      res.status(400);
      return next(new Error('Order must have at least one item'));
    }

    // Process items: fetch real prices from Product collection
    const Product = require('../models/Product');
    const enrichedItems = [];
>>>>>>> Stashed changes
    let totalAmount = 0;

    for (const item of items) {
      const { productId, quantityRequested } = item;

<<<<<<< Updated upstream
      // Validate item fields
      if (!productId) {
        res.status(400);
        return next(new Error('Each item must have productId'));
      }

      if (!quantityRequested || quantityRequested < 1) {
        res.status(400);
        return next(new Error('Each item must have quantityRequested of at least 1'));
      }

      // Fetch product to get current price (NEVER trust client-sent prices)
      const product = await Product.findById(productId);
      if (!product) {
        res.status(404);
        return next(new Error(`Product not found: ${productId}`));
      }

      // Calculate subtotal using current product price
      const unitPrice = product.price;
      const subtotal = unitPrice * quantityRequested;

      // Add to order items
      // NOTE: batchId is NOT set at this stage - assigned during approval/shipment
      orderItems.push({
        productId,
        quantityRequested,
        quantity: quantityRequested, // Initially same as requested
        unitPrice,
        subtotal,
        // batchId: will be assigned during fulfillment (approve/ship phase)
      });

      // Add to total amount
      totalAmount += subtotal;
    }

    // ========================================
    // STEP 6: Create Order Document
    // ========================================
    const order = await Order.create({
      orderNumber,
      storeId,
      orderDate: new Date(),
      requestedDeliveryDate: deliveryDate,
      items: orderItems, // Note: using 'items' field name per model
      totalAmount,
      status: 'Pending',
      notes: notes || '',
      createdBy: req.user ? req.user._id : null, // Track who created the order
    });

    // ========================================
    // STEP 7: Populate and Return Response
    // ========================================
    await order.populate([
      { path: 'storeId', select: 'storeName storeCode address phone' },
      { path: 'items.productId', select: 'name sku price unit categoryId' },
      { path: 'createdBy', select: 'fullName email' },
=======
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

    // Create order with calculated data
    const order = await Order.create({
      storeId,
      createdBy: req.user._id,
      requestedDeliveryDate: new Date(requestedDeliveryDate),
      items: enrichedItems,
      totalAmount,
      notes: notes || '',
    });

    // Populate references
    await order.populate([
      { path: 'storeId', select: 'storeName storeCode address' },
      { path: 'createdBy', select: 'username fullName email' },
      { path: 'items.productId', select: 'name sku price unit' },
>>>>>>> Stashed changes
    ]);

    res.status(201).json({
      success: true,
<<<<<<< Updated upstream
      message: 'Order created successfully. Awaiting approval from Kitchen Manager.',
=======
      message: 'Order created successfully',
>>>>>>> Stashed changes
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
<<<<<<< Updated upstream
 * @desc    Approve and ship order using FEFO algorithm
 * @route   POST /api/logistics/orders/:orderId/approve-ship
 * @access  Private (Admin, Manager)
 */
const approveAndShipOrder = async (req, res, next) => {
  // Start transaction for data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  let transactionAborted = false;

  try {
    const { orderId } = req.params;
    const { tripNumber, vehicleNumber, estimatedArrival, notes } = req.body;

    // ========================================
    // STEP 1: Validation - Fetch Order
    // ========================================
    const order = await Order.findById(orderId)
      .populate('storeId')
      .populate('orderItems.productId')
      .session(session);

    if (!order) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('Order not found');
    }

    // Check if order is in Pending status
    if (order.status !== 'Pending') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error(`Order status is '${order.status}'. Only 'Pending' orders can be approved and shipped.`);
    }

    // Validate tripNumber
    if (!tripNumber) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Trip number is required');
    }

    // Check if tripNumber already exists
    const existingTrip = await DeliveryTrip.findOne({ 
      tripNumber: tripNumber.toUpperCase() 
    }).session(session);

    if (existingTrip) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error(`Delivery trip with number '${tripNumber}' already exists`);
    }

    // ========================================
    // STEP 2: Fetch SHIPPING_COST from SystemSetting
    // ========================================
    const shippingCostSetting = await SystemSetting.findOne({ 
      key: 'SHIPPING_COST_BASE' 
    }).session(session);

    const shippingCost = shippingCostSetting 
      ? parseFloat(shippingCostSetting.value) 
      : 0;

    // Fetch TAX_RATE from SystemSetting
    const taxRateSetting = await SystemSetting.findOne({ 
      key: 'TAX_RATE' 
    }).session(session);

    const taxRate = taxRateSetting 
      ? parseFloat(taxRateSetting.value) * 100 // Convert 0.08 to 8
      : 0;

    // ========================================
    // STEP 3: FEFO Algorithm - Process Order Items
    // ========================================
    const exportDetails = [];
    const batchUpdates = [];

    for (const orderItem of order.orderItems) {
      const { productId, quantity: requiredQuantity } = orderItem;
      
      let remainingQuantity = requiredQuantity;

      // Fetch all available batches for this product, sorted by expDate ASC (FEFO)
      const availableBatches = await Batch.find({
        productId: productId._id,
        currentQuantity: { $gt: 0 },
        expDate: { $gte: new Date() }, // Only non-expired batches
      })
        .sort({ expDate: 1 }) // FEFO: First Expired First Out
        .session(session);

      // Check if we have enough total stock
      const totalAvailable = availableBatches.reduce(
        (sum, batch) => sum + batch.currentQuantity, 
        0
      );

      if (totalAvailable < requiredQuantity) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(400);
        throw new Error(
          `Insufficient stock for product '${productId.name}'. ` +
          `Required: ${requiredQuantity}, Available: ${totalAvailable}`
        );
      }

      // Loop through batches to deduct quantity (FEFO)
      for (const batch of availableBatches) {
        if (remainingQuantity === 0) break;

        const quantityToDeduct = Math.min(batch.currentQuantity, remainingQuantity);

        // Record for export details (traceability)
        exportDetails.push({
          productId: productId._id,
          batchId: batch._id,
          quantity: quantityToDeduct,
        });

        // Prepare batch update
        batchUpdates.push({
          batchId: batch._id,
          newQuantity: batch.currentQuantity - quantityToDeduct,
        });

        remainingQuantity -= quantityToDeduct;
      }

      // Double check we fulfilled the requirement
      if (remainingQuantity > 0) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(500);
        throw new Error(
          `Failed to allocate sufficient stock for product '${productId.name}'`
        );
      }
    }

    // ========================================
    // STEP 4: Update Batch Quantities
    // ========================================
    for (const update of batchUpdates) {
      await Batch.findByIdAndUpdate(
        update.batchId,
        { currentQuantity: update.newQuantity },
        { session }
      );
    }

    // ========================================
    // STEP 5: Create DeliveryTrip (Export Slip)
    // ========================================
    const departureDate = new Date();
    
    // Calculate estimated arrival if not provided
    let estimatedArrivalDate;
    if (estimatedArrival) {
      estimatedArrivalDate = new Date(estimatedArrival);
    } else {
      // Use store's standard delivery minutes
      const deliveryMinutes = order.storeId.standardDeliveryMinutes || 30;
      estimatedArrivalDate = new Date(departureDate.getTime() + deliveryMinutes * 60000);
    }

    const deliveryTrip = await DeliveryTrip.create(
      [
        {
          tripNumber: tripNumber.toUpperCase(),
          orderId: order._id,
          storeId: order.storeId._id,
          driverId: req.user ? req.user._id : null,
          exportDetails,
          departureDate,
          estimatedArrival: estimatedArrivalDate,
          status: 'In_Transit',
          vehicleNumber: vehicleNumber || '',
          notes: notes || '',
        },
      ],
      { session }
    );

    // ========================================
    // STEP 6: Update Order Status to Shipped
    // ========================================
    order.status = 'Shipped';
    order.approvedBy = req.user ? req.user._id : null;
    order.approvedAt = new Date();
    await order.save({ session });

    // ========================================
    // STEP 7: Create Invoice
    // ========================================
    const invoiceNumber = `INV-${order.orderNumber}`;
    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms

    const subtotal = order.totalAmount + shippingCost;

    const invoice = await Invoice.create(
      [
        {
          invoiceNumber,
          orderId: order._id,
          storeId: order.storeId._id,
          invoiceDate,
          dueDate,
          subtotal,
          taxRate,
          paymentStatus: 'Pending',
          paidAmount: 0,
=======
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

    // Update order status
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
>>>>>>> Stashed changes
        },
      ],
      { session }
    );

<<<<<<< Updated upstream
    // ========================================
    // STEP 8: Commit Transaction
    // ========================================
    await session.commitTransaction();

    // Populate response data
    await deliveryTrip[0].populate([
      { path: 'orderId', select: 'orderNumber orderDate totalAmount' },
      { path: 'storeId', select: 'storeName storeCode address' },
      { path: 'driverId', select: 'fullName email' },
      { path: 'exportDetails.productId', select: 'name sku' },
      { path: 'exportDetails.batchId', select: 'batchCode mfgDate expDate' },
    ]);

    await invoice[0].populate([
      { path: 'orderId', select: 'orderNumber orderDate' },
      { path: 'storeId', select: 'storeName storeCode' },
=======
    // Update order status to In_Transit
    order.status = 'In_Transit';
    order.shippedDate = new Date();
    await order.save({ session });

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
>>>>>>> Stashed changes
    ]);

    res.status(200).json({
      success: true,
      message: 'Order approved and shipped successfully',
      data: {
<<<<<<< Updated upstream
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          approvedBy: order.approvedBy,
          approvedAt: order.approvedAt,
        },
        deliveryTrip: deliveryTrip[0],
        invoice: invoice[0],
        batchesUpdated: batchUpdates.length,
        shippingCost,
        taxRate,
      },
    });
  } catch (error) {
    // Abort transaction if not already aborted
    if (!transactionAborted) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    // End session
=======
        order,
        trip: trip[0],
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
>>>>>>> Stashed changes
    session.endSession();
  }
};

/**
<<<<<<< Updated upstream
 * @desc    Receive order at store and update inventory
 * @route   POST /api/logistics/trips/:tripId/receive
 * @access  Private (Store Staff, Store Manager, Admin)
 */
const receiveOrder = async (req, res, next) => {
  // Start transaction for data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  let transactionAborted = false;

  try {
    const { tripId } = req.params;

    // ========================================
    // STEP 1: Validation - Fetch DeliveryTrip
    // ========================================
    const deliveryTrip = await DeliveryTrip.findById(tripId)
      .populate('orderId')
      .populate('storeId')
      .populate('exportDetails.productId')
      .populate('exportDetails.batchId')
      .session(session);

    if (!deliveryTrip) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('Delivery trip not found');
    }

    // Check if delivery trip is In_Transit
    if (deliveryTrip.status !== 'In_Transit') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error(
        `Delivery trip status is '${deliveryTrip.status}'. Only 'In_Transit' trips can be received.`
      );
    }

    // ========================================
    // STEP 2: Update Store Inventory
    // ========================================
    const inventoryUpdates = [];

    for (const exportDetail of deliveryTrip.exportDetails) {
      const { productId, batchId, quantity } = exportDetail;

      // Find existing inventory record for this store + product + batch
      const existingInventory = await StoreInventory.findOne({
        storeId: deliveryTrip.storeId._id,
        productId: productId._id,
        batchId: batchId._id,
      }).session(session);

      if (existingInventory) {
        // Update existing inventory (add quantity)
        existingInventory.quantity += quantity;
        existingInventory.lastUpdated = new Date();
        await existingInventory.save({ session });

        inventoryUpdates.push({
          action: 'updated',
          productId: productId._id,
          productName: productId.name,
          batchId: batchId._id,
          batchCode: batchId.batchCode,
          quantityAdded: quantity,
          newQuantity: existingInventory.quantity,
        });
      } else {
        // Insert new inventory record
        const newInventory = await StoreInventory.create(
          [
            {
              storeId: deliveryTrip.storeId._id,
              productId: productId._id,
              batchId: batchId._id,
              quantity,
=======
 * @desc    Receive order by trip ID
 * @route   POST /api/logistics/trips/:tripId/receive
 * @access  Private (Store Staff, Manager)
 */
const receiveOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { tripId } = req.params;

    // Find trip
    const trip = await DeliveryTrip.findById(tripId).session(session);
    if (!trip) {
      await session.abortTransaction();
      res.status(404);
      return next(new Error('Delivery trip not found'));
    }

    // Check trip status
    if (trip.status !== 'In_Transit') {
      await session.abortTransaction();
      res.status(400);
      return next(
        new Error('Can only receive trips with In_Transit status')
      );
    }

    // Process all orders in the trip
    const orders = await Order.find({ _id: { $in: trip.orders } }).session(
      session
    );

    for (const order of orders) {
      if (order.status !== 'In_Transit') {
        continue; // Skip already processed orders
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
    }

    // Update trip status
    trip.status = 'Completed';
    trip.completedTime = new Date();
    await trip.save({ session });

    await session.commitTransaction();

    // Populate and return
    await trip.populate([
      { path: 'driverId', select: 'username fullName email' },
      {
        path: 'orders',
        populate: [
          { path: 'storeId', select: 'storeName storeCode' },
          { path: 'items.productId', select: 'name sku' },
          { path: 'items.batchId', select: 'batchCode' },
        ],
      },
    ]);

    res.status(200).json({
      success: true,
      message: 'Orders received successfully',
      data: trip,
    });
  } catch (error) {
    await session.abortTransaction();
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
 * @desc    Receive order by QR code (orderId)
 * @route   POST /api/logistics/orders/:orderId/receive-by-qr
 * @access  Private (Store Staff, Manager)
 */
const receiveOrderByQr = async (req, res, next) => {
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
      if (
        !req.user.storeId ||
        req.user.storeId.toString() !== order.storeId.toString()
      ) {
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
>>>>>>> Stashed changes
              lastUpdated: new Date(),
            },
          ],
          { session }
        );
<<<<<<< Updated upstream

        inventoryUpdates.push({
          action: 'created',
          productId: productId._id,
          productName: productId.name,
          batchId: batchId._id,
          batchCode: batchId.batchCode,
          quantityAdded: quantity,
          newQuantity: quantity,
        });
      }
    }

    // ========================================
    // STEP 3: Update DeliveryTrip Status
    // ========================================
    deliveryTrip.status = 'Completed';
    deliveryTrip.actualArrival = new Date();
    await deliveryTrip.save({ session });

    // ========================================
    // STEP 4: Update Order Status to Received
    // ========================================
    const order = await Order.findById(deliveryTrip.orderId._id).session(session);

    if (!order) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('Order not found');
    }

    order.status = 'Received';
    await order.save({ session });

    // ========================================
    // STEP 5: Update Invoice Status
    // ========================================
    const invoice = await Invoice.findOne({ 
      orderId: order._id 
    }).session(session);

    if (invoice) {
      // Keep status as Pending (ready for payment)
      // The invoice was already created with Pending status
      // No need to change it, but we can add a note if needed
      if (invoice.paymentStatus === 'Pending') {
        // Already in correct status for payment
      }
      // Optionally save if any changes were made
      await invoice.save({ session });
    }

    // ========================================
    // STEP 6: Commit Transaction
    // ========================================
    await session.commitTransaction();

    // Populate response data
    await deliveryTrip.populate([
      { path: 'orderId', select: 'orderNumber orderDate totalAmount status' },
      { path: 'storeId', select: 'storeName storeCode address' },
=======
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
>>>>>>> Stashed changes
    ]);

    res.status(200).json({
      success: true,
<<<<<<< Updated upstream
      message: 'Order received successfully and inventory updated',
      data: {
        deliveryTrip: {
          _id: deliveryTrip._id,
          tripNumber: deliveryTrip.tripNumber,
          status: deliveryTrip.status,
          departureDate: deliveryTrip.departureDate,
          actualArrival: deliveryTrip.actualArrival,
        },
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
        },
        invoice: invoice ? {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          paymentStatus: invoice.paymentStatus,
          totalAmount: invoice.totalAmount,
        } : null,
        inventoryUpdates,
        itemsReceived: inventoryUpdates.length,
      },
    });
  } catch (error) {
    // Abort transaction if not already aborted
    if (!transactionAborted) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    // End session
=======
      message: 'Order received successfully by QR scan',
      data: {
        order,
        trip,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
>>>>>>> Stashed changes
    session.endSession();
  }
};

<<<<<<< Updated upstream
=======
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
      if (
        !req.user.storeId ||
        order.storeId._id.toString() !== req.user.storeId.toString()
      ) {
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

>>>>>>> Stashed changes
module.exports = {
  createOrder,
  approveAndShipOrder,
  receiveOrder,
<<<<<<< Updated upstream
=======
  rejectOrder,
  receiveOrderByQr,
  getOrders,
  getOrderById,
  getTrips,
  getTripById,
  aggregateDailyDemand,
>>>>>>> Stashed changes
};
