const mongoose = require('mongoose');
const Order = require('../models/Order');
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
    }

    // Validate requestedDeliveryDate
    if (!requestedDeliveryDate) {
      res.status(400);
      return next(new Error('Requested delivery date is required'));
    }

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
    let totalAmount = 0;

    for (const item of items) {
      const { productId, quantityRequested } = item;

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
    ]);

    res.status(201).json({
      success: true,
      message: 'Order created successfully. Awaiting approval from Kitchen Manager.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve order and deduct inventory
 * @route   POST /api/logistics/orders/:orderId/approve
 * @access  Private (Admin, Manager)
 */
const approveAndShipOrder = async (req, res, next) => {
  // Start transaction for data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  let transactionAborted = false;

  try {
    const { orderId } = req.params;
    const { items: batchAssignments } = req.body;

    // ========================================
    // STEP 1: Validation - Fetch Order
    // ========================================
    const order = await Order.findById(orderId)
      .populate('storeId')
      .populate('items.productId')
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
      throw new Error(`Order status is '${order.status}'. Only 'Pending' orders can be approved.`);
    }

    // Validate batch assignments
    if (!batchAssignments || !Array.isArray(batchAssignments)) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Batch assignments are required');
    }

    // Ensure batch assignments match order items count
    if (batchAssignments.length !== order.items.length) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error(
        `Batch assignments count (${batchAssignments.length}) must match order items count (${order.items.length})`
      );
    }

    // ========================================
    // STEP 2: Fetch System Settings
    // ========================================
    const shippingCostSetting = await SystemSetting.findOne({ 
      key: 'SHIPPING_COST_BASE' 
    }).session(session);

    const shippingCost = shippingCostSetting 
      ? parseFloat(shippingCostSetting.value) 
      : 0;

    const taxRateSetting = await SystemSetting.findOne({ 
      key: 'TAX_RATE' 
    }).session(session);

    const taxRate = taxRateSetting 
      ? parseFloat(taxRateSetting.value) * 100 // Convert 0.08 to 8
      : 0;

    // ========================================
    // STEP 3: Process Items - Assign Batches & Deduct Inventory
    // ========================================
    const batchUpdates = [];

    for (let i = 0; i < order.items.length; i++) {
      const orderItem = order.items[i];
      const batchAssignment = batchAssignments[i];
      const requiredQuantity = orderItem.quantity;

      // Validate batchId is provided
      if (!batchAssignment.batchId) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(400);
        throw new Error(`Batch ID is required for item ${i + 1}`);
      }

      // Fetch the batch
      const batch = await Batch.findById(batchAssignment.batchId).session(session);

      if (!batch) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(404);
        throw new Error(`Batch not found: ${batchAssignment.batchId}`);
      }

      // Verify batch has enough stock
      if (batch.currentQuantity < requiredQuantity) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(400);
        throw new Error(
          `Insufficient stock in batch ${batch.batchCode}. ` +
          `Required: ${requiredQuantity}, Available: ${batch.currentQuantity}`
        );
      }

      // Verify batch is for the correct product
      if (batch.productId.toString() !== orderItem.productId._id.toString()) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(400);
        throw new Error(
          `Batch ${batch.batchCode} is for a different product than ordered`
        );
      }

      // Check if batch is expired
      if (batch.expDate < new Date()) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(400);
        throw new Error(`Batch ${batch.batchCode} is expired`);
      }

      // Assign batchId to order item
      orderItem.batchId = batch._id;

      // Prepare batch update (deduct inventory)
      batchUpdates.push({
        batchId: batch._id,
        batchCode: batch.batchCode,
        productName: orderItem.productId.name,
        quantityDeducted: requiredQuantity,
        newQuantity: batch.currentQuantity - requiredQuantity,
      });
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
    // STEP 5: Update Order Status to Approved
    // ========================================
    order.status = 'Approved';
    order.approvedBy = req.user ? req.user._id : null;
    order.approvedAt = new Date();
    await order.save({ session });

    // ========================================
    // STEP 6: Create Invoice
    // ========================================
    const invoiceNumber = `INV-${order.orderCode || order.orderNumber || order._id}`;
    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms

    // Include shipping cost in subtotal
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
        },
      ],
      { session }
    );

    // ========================================
    // STEP 7: Commit Transaction
    // ========================================
    await session.commitTransaction();

    // Populate response data
    await order.populate([
      { path: 'storeId', select: 'storeName storeCode address' },
      { path: 'items.productId', select: 'name sku' },
      { path: 'items.batchId', select: 'batchCode mfgDate expDate' },
      { path: 'approvedBy', select: 'fullName email' },
    ]);

    await invoice[0].populate([
      { path: 'orderId', select: 'orderCode orderNumber' },
      { path: 'storeId', select: 'storeName storeCode' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Order approved successfully. Inventory deducted and invoice created.',
      data: {
        order,
        invoice: invoice[0],
        batchUpdates,
        itemsProcessed: batchUpdates.length,
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
    session.endSession();
  }
};

/**
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

    // Check if delivery trip is transferred to kitchen
    if (deliveryTrip.status !== 'Transferred_To_Kitchen') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error(
        `Delivery trip status is '${deliveryTrip.status}'. Only 'Transferred_To_Kitchen' trips can be received.`
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
              lastUpdated: new Date(),
            },
          ],
          { session }
        );

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
    ]);

    res.status(200).json({
      success: true,
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
    session.endSession();
  }
};

/**
 * @desc    Add multiple approved orders to an existing delivery trip
 * @route   PATCH /api/logistics/trips/:id/add-orders
 * @access  Private (Coordinator, Manager, Admin)
 */
const addOrdersToTrip = async (req, res, next) => {
  // Start transaction for data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  let transactionAborted = false;

  try {
    const { id } = req.params;
    const { orderIds } = req.body;

    // ========================================
    // STEP 1: Validation - Input
    // ========================================
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('orderIds must be a non-empty array');
    }

    // ========================================
    // STEP 2: Fetch Delivery Trip
    // ========================================
    const trip = await DeliveryTrip.findById(id).session(session);
    if (!trip) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('Delivery trip not found');
    }

    // Check trip status - can only add orders during Planning phase
    if (trip.status !== 'Planning') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error(
        `Cannot add orders to trip with status '${trip.status}'. Only 'Planning' trips can be modified.`
      );
    }

    // ========================================
    // STEP 3: Validate Orders Existence & Status
    // ========================================
    const orders = await Order.find({ 
      _id: { $in: orderIds } 
    }).session(session);

    // Validate all orders exist
    if (orders.length !== orderIds.length) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('One or more orders not found');
    }

    // Validate all orders have 'Approved' status
    const invalidOrders = orders.filter(order => order.status !== 'Approved');
    if (invalidOrders.length > 0) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      const invalidOrderNumbers = invalidOrders
        .map(o => o.orderNumber || o._id)
        .join(', ');
      throw new Error(
        `All orders must have 'Approved' status. Invalid orders: ${invalidOrderNumbers}`
      );
    }

    // ========================================
    // STEP 4: Use Set to Prevent Duplicate Order IDs
    // ========================================
    const existingOrderIds = new Set(
      trip.orders.map(orderId => orderId.toString())
    );
    
    const newOrderIds = [];
    let duplicateCount = 0;

    for (const orderId of orderIds) {
      const orderIdStr = orderId.toString();
      if (!existingOrderIds.has(orderIdStr)) {
        newOrderIds.push(orderId);
        existingOrderIds.add(orderIdStr);
      } else {
        duplicateCount++;
      }
    }

    // ========================================
    // STEP 5: Add New Orders to Trip
    // ========================================
    if (newOrderIds.length > 0) {
      trip.orders.push(...newOrderIds);
      await trip.save({ session });
    }

    // ========================================
    // STEP 6: Commit Transaction
    // ========================================
    await session.commitTransaction();

    // Populate response data
    await trip.populate([
      {
        path: 'orders',
        populate: [
          { path: 'storeId', select: 'storeName storeCode address' },
          { path: 'items.productId', select: 'name sku' },
        ],
      },
    ]);

    res.status(200).json({
      success: true,
      message: `Added ${newOrderIds.length} orders to delivery trip${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ''}`,
      data: {
        trip,
        ordersAdded: newOrderIds.length,
        duplicatesSkipped: duplicateCount,
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
    session.endSession();
  }
};

/**
 * @desc    Remove specific orders from a delivery trip (set back to Approved)
 * @route   PATCH /api/logistics/trips/:id/remove-orders
 * @access  Private (Coordinator, Manager, Admin)
 */
const removeOrdersFromTrip = async (req, res, next) => {
  // Start transaction for data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  let transactionAborted = false;

  try {
    const { id } = req.params;
    const { orderIds } = req.body;

    // ========================================
    // STEP 1: Validation - Input
    // ========================================
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('orderIds must be a non-empty array');
    }

    // ========================================
    // STEP 2: Fetch Delivery Trip
    // ========================================
    const trip = await DeliveryTrip.findById(id).session(session);
    if (!trip) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('Delivery trip not found');
    }

    // Check trip status - cannot remove orders from active or completed trips
    if (trip.status === 'Transferred_To_Kitchen') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Cannot remove orders from a trip that has been transferred to kitchen');
    }

    if (trip.status === 'Completed') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Cannot remove orders from a Completed trip');
    }

    // ========================================
    // STEP 3: Filter Out Orders to be Removed
    // ========================================
    const orderIdsToRemove = new Set(orderIds.map(id => id.toString()));

    const remainingOrders = trip.orders.filter(
      orderId => !orderIdsToRemove.has(orderId.toString())
    );

    // Check if any orders were actually removed
    const removedCount = trip.orders.length - remainingOrders.length;
    if (removedCount === 0) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('None of the specified orders were found in this trip');
    }

    // ========================================
    // STEP 4: Update Trip Orders Array
    // ========================================
    trip.orders = remainingOrders;
    await trip.save({ session });

    // ========================================
    // STEP 5: Set Removed Orders Back to 'Approved' Status
    // ========================================
    // This is NOT a rejection - just removing from current trip
    // Orders can be reassigned to another trip later
    const updateResult = await Order.updateMany(
      { _id: { $in: orderIds } },
      {
        $set: {
          status: 'Approved',
        },
        $unset: {
          shippedDate: 1, // Clear shipped date if it was set
        },
      },
      { session }
    );

    // ========================================
    // STEP 6: Commit Transaction
    // ========================================
    await session.commitTransaction();

    // Populate response data
    await trip.populate([
      {
        path: 'orders',
        populate: [
          { path: 'storeId', select: 'storeName storeCode address' },
          { path: 'items.productId', select: 'name sku' },
        ],
      },
    ]);

    res.status(200).json({
      success: true,
      message: `Removed ${removedCount} orders from delivery trip. Orders set back to 'Approved' status for reassignment.`,
      data: {
        trip,
        ordersRemoved: removedCount,
        ordersUpdated: updateResult.modifiedCount,
        remainingOrders: trip.orders.length,
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
    session.endSession();
  }
};

/**
 * @desc    Finalize delivery plan - start shipping process
 * @route   POST /api/logistics/trips/:id/finalize
 * @access  Private (Coordinator, Manager, Admin)
 */
const finalizeDeliveryPlan = async (req, res, next) => {
  // Start transaction for data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  let transactionAborted = false;

  try {
    const { id } = req.params;

    // ========================================
    // STEP 1: Fetch Delivery Trip
    // ========================================
    const trip = await DeliveryTrip.findById(id).session(session);
    if (!trip) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('Delivery trip not found');
    }

    // ========================================
    // STEP 2: Validate Trip Status
    // ========================================
    if (trip.status === 'Transferred_To_Kitchen') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Trip is already transferred to kitchen');
    }

    if (trip.status === 'Completed') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Trip is already Completed');
    }

    // ========================================
    // STEP 3: Validate Trip Has Orders
    // ========================================
    if (!trip.orders || trip.orders.length === 0) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Cannot finalize a trip with no orders');
    }

    // ========================================
    // STEP 4: Update All Orders to 'Transferred_To_Kitchen' Status
    // ========================================
    const shippedDate = new Date();
    
    const updateResult = await Order.updateMany(
      { _id: { $in: trip.orders } },
      {
        $set: {
          status: 'Transferred_To_Kitchen',
          shippedDate: shippedDate,
        },
      },
      { session }
    );

    // ========================================
    // STEP 5: Update Trip Status to 'Transferred_To_Kitchen'
    // ========================================
    trip.status = 'Transferred_To_Kitchen';
    trip.departureTime = shippedDate;
    await trip.save({ session });

    // ========================================
    // STEP 6: Commit Transaction
    // ========================================
    await session.commitTransaction();

    // Populate response data
    await trip.populate([
      {
        path: 'orders',
        populate: [
          { path: 'storeId', select: 'storeName storeCode address' },
          { path: 'items.productId', select: 'name sku' },
          { path: 'items.batchId', select: 'batchCode mfgDate expDate' },
        ],
      },
    ]);

    res.status(200).json({
      success: true,
      message: `Trip finalized and transferred to kitchen for production. ${updateResult.modifiedCount} orders updated.`,
      data: {
        trip,
        ordersUpdated: updateResult.modifiedCount,
        shippedDate,
        totalOrders: trip.orders.length,
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
    session.endSession();
  }
};

/**
 * @desc    Reject an order and reverse inventory if needed
 * @route   POST /api/logistics/orders/:orderId/reject
 * @access  Private (Manager, Admin)
 */
const rejectOrder = async (req, res, next) => {
  // Start transaction for data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  let transactionAborted = false;

  try {
    const { orderId } = req.params;
    const { cancellationReason } = req.body;

    // ========================================
    // STEP 1: Validation - Fetch Order
    // ========================================
    const order = await Order.findById(orderId)
      .populate('storeId')
      .populate('items.productId')
      .session(session);

    if (!order) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('Order not found');
    }

    // Check if order can be rejected
    if (order.status === 'Cancelled') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Order is already cancelled');
    }

    if (order.status === 'Received') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Cannot reject a received order');
    }

    // Validate cancellation reason
    if (!cancellationReason || cancellationReason.trim() === '') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Cancellation reason is required');
    }

    // ========================================
    // STEP 2: Inventory Reversal (if Approved or Shipped)
    // ========================================
    let batchesReversed = 0;

    if (order.status === 'Approved' || order.status === 'Shipped') {
      // Loop through order items and add quantities back to batches
      for (const item of order.items) {
        if (item.batchId) {
          // Find the batch
          const batch = await Batch.findById(item.batchId).session(session);

          if (batch) {
            // Add quantity back to batch
            batch.currentQuantity += item.quantity;
            await batch.save({ session });
            batchesReversed++;
          } else {
            // Log warning if batch not found, but continue
            console.warn(
              `Warning: Batch ${item.batchId} not found during inventory reversal for order ${order.orderNumber}`
            );
          }
        }
      }
    }

    // ========================================
    // STEP 3: Update Order Status to Cancelled
    // ========================================
    order.status = 'Cancelled';
    order.cancellationReason = cancellationReason;
    order.cancelledBy = req.user ? req.user._id : null;
    order.cancelledAt = new Date();
    await order.save({ session });

    // ========================================
    // STEP 4: Update Invoice Status (if exists)
    // ========================================
    const invoice = await Invoice.findOne({ orderId: order._id }).session(session);

    if (invoice && invoice.paymentStatus === 'Pending') {
      invoice.paymentStatus = 'Cancelled';
      await invoice.save({ session });
    }

    // ========================================
    // STEP 5: Commit Transaction
    // ========================================
    await session.commitTransaction();

    // Populate response data
    await order.populate([
      { path: 'storeId', select: 'storeName storeCode address' },
      { path: 'items.productId', select: 'name sku' },
      { path: 'cancelledBy', select: 'fullName email' },
    ]);

    res.status(200).json({
      success: true,
      message: `Order rejected successfully${batchesReversed > 0 ? `. ${batchesReversed} batches reversed.` : ''}`,
      data: {
        order,
        batchesReversed,
        inventoryReversed: batchesReversed > 0,
        invoice: invoice ? {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          paymentStatus: invoice.paymentStatus,
        } : null,
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
    session.endSession();
  }
};

/**
 * @desc    Record payment for an invoice
 * @route   POST /api/logistics/invoices/:invoiceId/record-payment
 * @access  Private (Accountant, Manager, Admin)
 */
const recordPayment = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { amount, paymentMethod, paymentNotes } = req.body;

    // ========================================
    // STEP 1: Validation - Input
    // ========================================
    if (!amount || amount <= 0) {
      res.status(400);
      throw new Error('Payment amount must be greater than 0');
    }

    if (!paymentMethod) {
      res.status(400);
      throw new Error('Payment method is required');
    }

    // ========================================
    // STEP 2: Fetch Invoice
    // ========================================
    const invoice = await Invoice.findById(invoiceId)
      .populate('orderId', 'orderNumber')
      .populate('storeId', 'storeName storeCode');

    if (!invoice) {
      res.status(404);
      throw new Error('Invoice not found');
    }

    // Check if invoice is already paid
    if (invoice.paymentStatus === 'Paid') {
      res.status(400);
      throw new Error('Invoice is already fully paid');
    }

    // Check if invoice is cancelled
    if (invoice.paymentStatus === 'Cancelled') {
      res.status(400);
      throw new Error('Cannot record payment for a cancelled invoice');
    }

    // ========================================
    // STEP 3: Update Payment Amount
    // ========================================
    const previousPaidAmount = invoice.paidAmount || 0;
    const newPaidAmount = previousPaidAmount + amount;

    // Prevent overpayment
    if (newPaidAmount > invoice.totalAmount) {
      res.status(400);
      throw new Error(
        `Payment amount exceeds invoice total. ` +
        `Total: ${invoice.totalAmount}, Paid: ${previousPaidAmount}, ` +
        `Attempting to add: ${amount}`
      );
    }

    // Update invoice
    invoice.paidAmount = newPaidAmount;
    invoice.paymentDate = new Date();
    invoice.paymentMethod = paymentMethod;

    // Add payment notes if provided
    if (paymentNotes) {
      if (!invoice.paymentNotes) {
        invoice.paymentNotes = [];
      }
      invoice.paymentNotes.push({
        amount,
        method: paymentMethod,
        date: new Date(),
        notes: paymentNotes,
        recordedBy: req.user ? req.user._id : null,
      });
    }

    // ========================================
    // STEP 4: Determine Payment Status
    // ========================================
    if (newPaidAmount >= invoice.totalAmount) {
      invoice.paymentStatus = 'Paid';
    } else {
      invoice.paymentStatus = 'Partial';
    }

    // ========================================
    // STEP 5: Save Invoice
    // ========================================
    await invoice.save();

    res.status(200).json({
      success: true,
      message: `Payment of ${amount} recorded successfully. Invoice status: ${invoice.paymentStatus}`,
      data: {
        invoice,
        amountPaid: amount,
        totalPaid: newPaidAmount,
        remainingBalance: invoice.totalAmount - newPaidAmount,
        paymentStatus: invoice.paymentStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all orders
 * @route   GET /api/logistics/orders
 * @access  Private
 */
const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('storeId', 'storeName storeCode')
      .populate('items.productId', 'name sku')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order by ID
 * @route   GET /api/logistics/orders/:id
 * @access  Private
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('storeId', 'storeName storeCode address')
      .populate('items.productId', 'name sku price')
      .populate('createdBy', 'fullName email');
    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }
    res.status(200).json({ success: true, data: order });
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
    const trips = await DeliveryTrip.find()
      .populate({
        path: 'orders',
        populate: { path: 'storeId', select: 'storeName storeCode' }
      })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: trips.length, data: trips });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get delivery trip by ID
 * @route   GET /api/logistics/trips/:id
 * @access  Private
 */
const getTripById = async (req, res, next) => {
  try {
    const trip = await DeliveryTrip.findById(req.params.id)
      .populate({
        path: 'orders',
        populate: [
          { path: 'storeId', select: 'storeName storeCode address' },
          { path: 'items.productId', select: 'name sku' }
        ]
      });
    if (!trip) {
      res.status(404);
      return next(new Error('Delivery trip not found'));
    }
    res.status(200).json({ success: true, data: trip });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new delivery trip with multiple orders
 * @route   POST /api/logistics/trips/create
 * @access  Private (Coordinator, Manager, Admin)
 */
const createDeliveryTrip = async (req, res, next) => {
  // Start transaction for data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  let transactionAborted = false;

  try {
    const { orderIds, notes } = req.body;

    // ========================================
    // STEP 1: Validation - Input
    // ========================================
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('orderIds must be a non-empty array');
    }

    // ========================================
    // STEP 2: Fetch and Validate Orders
    // ========================================
    const orders = await Order.find({ 
      _id: { $in: orderIds } 
    }).session(session);

    // Validate all orders exist
    if (orders.length !== orderIds.length) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('One or more orders not found');
    }

    // Validate all orders have 'Approved' status
    const invalidOrders = orders.filter(order => order.status !== 'Approved');
    if (invalidOrders.length > 0) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      const invalidOrderCodes = invalidOrders
        .map(o => o.orderCode || o.orderNumber || o._id)
        .join(', ');
      throw new Error(
        `All orders must have 'Approved' status. Invalid orders: ${invalidOrderCodes}`
      );
    }

    // ========================================
    // STEP 3: Create Delivery Trip
    // ========================================
    const deliveryTrip = await DeliveryTrip.create(
      [
        {
          orders: orderIds,
          status: 'Planning',
          notes: notes || '',
        },
      ],
      { session }
    );

    // ========================================
    // STEP 4: Commit Transaction
    // ========================================
    await session.commitTransaction();

    // Populate response data
    await deliveryTrip[0].populate([
      {
        path: 'orders',
        populate: [
          { path: 'storeId', select: 'storeName storeCode address' },
          { path: 'items.productId', select: 'name sku' },
          { path: 'items.batchId', select: 'batchCode mfgDate expDate' },
        ],
      },
    ]);

    res.status(201).json({
      success: true,
      message: `Delivery trip created successfully with ${orderIds.length} orders in Planning status.`,
      data: {
        trip: deliveryTrip[0],
        totalOrders: orderIds.length,
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
    session.endSession();
  }
};

/**
 * @desc    Update an existing order
 * @route   PATCH /api/logistics/orders/:orderId
 * @access  Private (Manager, Admin)
 */
const updateOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const updates = req.body;

    // Find and update order
    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Prevent updating certain fields
    delete updates._id;
    delete updates.createdBy;
    delete updates.createdAt;

    // Apply updates
    Object.assign(order, updates);
    await order.save();

    // Populate response
    await order.populate([
      { path: 'storeId', select: 'storeName storeCode address' },
      { path: 'items.productId', select: 'name sku' },
      { path: 'items.batchId', select: 'batchCode mfgDate expDate' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Aggregate daily demand across all stores
 * @route   GET /api/logistics/demand/daily
 * @access  Private (Manager, Admin)
 */
const aggregateDailyDemand = async (req, res, next) => {
  try {
    const { date } = req.query;

    // Default to today if no date provided
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Aggregate orders by requested delivery date
    const demand = await Order.aggregate([
      {
        $match: {
          requestedDeliveryDate: {
            $gte: targetDate,
            $lt: nextDay,
          },
          status: { $in: ['Pending', 'Approved', 'Transferred_To_Kitchen'] },
        },
      },
      {
        $unwind: '$items',
      },
      {
        $group: {
          _id: '$items.productId',
          totalQuantity: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $project: {
          _id: 1,
          productName: '$product.name',
          productSku: '$product.sku',
          totalQuantity: 1,
          orderCount: 1,
        },
      },
      {
        $sort: { totalQuantity: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      date: targetDate,
      count: demand.length,
      data: demand,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Order Management
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  approveAndShipOrder,
  approveOrder: approveAndShipOrder, // Map approveOrder to approveAndShipOrder for Swagger compatibility
  rejectOrder,
  
  // Delivery Trip Management
  createDeliveryTrip,
  getTrips,
  getTripById,
  addOrdersToTrip,
  removeOrdersFromTrip,
  finalizeDeliveryPlan,
  receiveOrder,
  
  // Invoice & Payment
  recordPayment,
  
  // Analytics
  aggregateDailyDemand,
};
