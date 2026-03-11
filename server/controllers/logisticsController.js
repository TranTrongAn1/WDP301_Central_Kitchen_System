const mongoose = require('mongoose');
const Order = require('../models/Order');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Batch = require('../models/BatchModel');
const DeliveryTrip = require('../models/DeliveryTrip');
const Invoice = require('../models/Invoice');
const SystemSetting = require('../models/SystemSetting');
const StoreInventory = require('../models/StoreInventory');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const { getSettingNumber } = require('../utils/settingHelper');
/**
 * @desc    Create new order from store
 * @route   POST /api/logistics/orders
 * @access  Private (Store Manager, Admin)
 */
const createOrder = async (req, res, next) => {
  // Start transaction for wallet payments
  const session = await mongoose.startSession();
  session.startTransaction();

  let transactionAborted = false;

  try {
    const { storeId, requestedDeliveryDate, items, notes, paymentMethod, recipientName, recipientPhone, address } = req.body;

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
    // Validate recipient name
    if (!recipientName || recipientName.trim() === '') {
      res.status(400);
      return next(new Error('Recipient name is required'));
    }

    // Validate recipient phone
    if (!recipientPhone || !/^(0|\+84)[0-9]{9,10}$/.test(recipientPhone)) {
      res.status(400);
      return next(new Error('Valid recipient phone is required'));
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

    // Extract store address for historical record
    const storeAddress = store.address;

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
      const order = await Order.create([{
        orderNumber,
        storeId,
        orderDate: new Date(),
        requestedDeliveryDate: deliveryDate,
        address: address || store.address,
        recipientName,
        recipientPhone,
        items: orderItems,
        totalAmount,
        status: 'Pending',
        notes: notes || '',
        createdBy: req.user ? req.user._id : null,
      }], { session });

      // ========================================
      // STEP 7: Fetch System Settings for Invoice Calculation
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
        ? parseFloat(taxRateSetting.value) * 100 
        : 0;

      // Calculate full invoice total (subtotal + shipping + tax)
      const subtotal = totalAmount + shippingCost;
      const taxAmount = (subtotal * taxRate) / 100;
      const fullInvoiceTotal = subtotal + taxAmount;

      // ========================================
      // STEP 8: Handle Wallet Payment (if specified)
      // ========================================
      let invoice = null;
      let walletPaymentInfo = null;

      if (paymentMethod === 'Wallet') {
        // Find or create wallet for the store
        let wallet = await Wallet.findOne({ storeId }).session(session);

      if (!wallet) {
        // Create new wallet if it doesn't exist
        wallet = new Wallet({
          storeId,
          balance: 0,
          status: 'Active',
        });
        await wallet.save({ session });
      }

      // Check if wallet is locked
      if (wallet.status === 'Locked') {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(403);
        throw new Error('Store wallet is locked and cannot be used for payments');
      }

      // Check if wallet has sufficient balance for FULL amount
      if (wallet.balance < fullInvoiceTotal) {
        transactionAborted = true;
        await session.abortTransaction();
        res.status(400);
        throw new Error(
          `Insufficient wallet balance. Required: ${fullInvoiceTotal.toFixed(2)} (Subtotal: ${totalAmount}, Shipping: ${shippingCost}, Tax: ${taxAmount.toFixed(2)}), Available: ${wallet.balance}`
        );
      }

      // Deduct FULL amount from wallet
      wallet.balance -= fullInvoiceTotal;
      await wallet.save({ session });

      // Create Payment transaction record
      const transaction = new WalletTransaction({
        walletId: wallet._id,
        amount: -fullInvoiceTotal, // Negative for payment - FULL amount
        type: 'Payment',
        description: `Payment for order ${orderNumber}`,
        orderId: order[0]._id,
        timestamp: new Date(),
      });
      await transaction.save({ session });

        walletPaymentInfo = {
          walletId: wallet._id,
          amountPaid: fullInvoiceTotal,
          newBalance: wallet.balance,
          transactionId: transaction._id,
        };
      }

      // ========================================
      // STEP 9: Create Invoice for All Payment Methods
      // ========================================
      const invoiceNumber = `INV-${orderNumber}`;
      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);

      invoice = await Invoice.create([{
        invoiceNumber,
        orderId: order[0]._id,
        storeId: order[0].storeId,
        invoiceDate,
        dueDate,
        subtotal: totalAmount + shippingCost, // Subtotal includes shipping
        taxRate,
        paymentStatus: paymentMethod === 'Wallet' ? 'Paid' : 'Pending',
        paidAmount: paymentMethod === 'Wallet' ? fullInvoiceTotal : 0,
        paymentDate: paymentMethod === 'Wallet' ? invoiceDate : null,
        paymentMethod: paymentMethod || 'Pending',
      }], { session });

      // ========================================
      // STEP 10: Commit Transaction
      // ========================================
      await session.commitTransaction();

      // ========================================
      // STEP 11: Populate and Return Response
      // ========================================
      await order[0].populate([
        { path: 'storeId', select: 'storeName storeCode address phone' },
        { path: 'items.productId', select: 'name sku price unit categoryId' },
        { path: 'createdBy', select: 'fullName email' },
      ]);

      const responseData = {
        order: order[0],
        invoice: invoice[0], // Always return invoice for all payment methods
      };

      if (walletPaymentInfo) {
        responseData.walletPayment = walletPaymentInfo;
      }

      res.status(201).json({
        success: true,
        message: paymentMethod === 'Wallet' 
          ? 'Order created and paid via Wallet successfully.' 
          : 'Order created successfully. Invoice created with Pending status. Awaiting approval from Kitchen Manager.',
        data: responseData,
      });
    } catch (error) {
      if (!transactionAborted) {
        await session.abortTransaction();
      }
      next(error);
    } finally {
      session.endSession();
    }
  };

/**
 * @desc    Approve order and deduct inventory
 * @route   POST /api/logistics/orders/:orderId/approve
 * @access  Private (Admin, Manager)
 */
const approveAndShipOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let transactionAborted = false;

  try {
    const { orderId } = req.params;

    // ========================================
    // STEP 1: Fetch & Validate Order
    // ========================================
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('Order not found');
    }

    if (order.status !== 'Pending') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error(`Order status is '${order.status}'. Only 'Pending' orders can be approved.`);
    }

    // ========================================
    // STEP 2: Update Order Status to Approved
    // ========================================
    order.status = 'Approved';
    order.approvedBy = req.user ? req.user._id : null;
    order.approvedAt = new Date();
    await order.save({ session });

    // ========================================
    // STEP 3: Update Related Invoice Due Date
    // ========================================
    const invoice = await Invoice.findOne({ orderId: order._id }).session(session);

    if (invoice) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30-day payment terms from approval
      invoice.dueDate = dueDate;
      await invoice.save({ session });
    }

    // ========================================
    // STEP 4: Commit Transaction
    // ========================================
    await session.commitTransaction();

    // Populate response data
    await order.populate([
      { path: 'storeId', select: 'storeName storeCode address' },
      { path: 'items.productId', select: 'name sku' },
      { path: 'approvedBy', select: 'fullName email' },
    ]);

    if (invoice) {
      await invoice.populate([
        { path: 'orderId', select: 'orderCode orderNumber' },
        { path: 'storeId', select: 'storeName storeCode' },
      ]);
    }

    res.status(200).json({
      success: true,
      message: 'Order approved successfully. Awaiting production by the kitchen.',
      data: {
        order,
        invoice: invoice || null,
      },
    });
  } catch (error) {
    if (!transactionAborted) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Receive order at store and update inventory
 * @route   POST /api/logistics/orders/:orderId/receive
 * @access  Private (Store Staff, Store Manager, Admin)
 */
const receiveOrder = async (req, res, next) => {
  // Start transaction for data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  let transactionAborted = false;

  try {
    const { orderId } = req.params;

    // ========================================
    // STEP 1: Validation - Find Order
    // ========================================
    const order = await Order.findById(orderId)
      .populate('storeId')
      .populate('items.productId')
      .populate('items.batchId')
      .session(session);

    if (!order) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('Order not found');
    }

    // ========================================
    // STEP 2: Find DeliveryTrip Containing This Order
    // ========================================
    const deliveryTrip = await DeliveryTrip.findOne({
      orders: orderId
    }).session(session);

    if (!deliveryTrip) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(404);
      throw new Error('Delivery trip containing this order not found');
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

    // Check if order is already received
    if (order.status === 'Received') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Order has already been received');
    }

    // Validate order is in correct status for receiving
    if (order.status !== 'In_Transit') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error(
        `Order status is '${order.status}'. Only 'In_Transit' orders can be received.`
      );
    }

    // ========================================
    // STEP 3: Update Store Inventory for This Order
    // ========================================
    const inventoryUpdates = [];

    for (const item of order.items) {
      if (!item.batchId) {
        // Skip items without batch assignment (shouldn't happen in production)
        continue;
      }

      const { productId, batchId, quantity } = item;

      // Find existing inventory record for this store + product + batch
      const existingInventory = await StoreInventory.findOne({
        storeId: order.storeId._id,
        productId: productId._id,
        batchId: batchId._id,
      }).session(session);

      if (existingInventory) {
        // Update existing inventory
        const previousQuantity = existingInventory.quantity;
        existingInventory.quantity += quantity;
        existingInventory.lastUpdated = new Date();
        await existingInventory.save({ session });

        inventoryUpdates.push({
          productId: productId._id,
          productName: productId.name,
          batchId: batchId._id,
          batchCode: batchId.batchCode,
          quantityAdded: quantity,
          previousQuantity,
          newQuantity: existingInventory.quantity,
          action: 'updated',
        });
      } else {
        // Create new inventory record
        const newInventory = await StoreInventory.create(
          [
            {
              storeId: order.storeId._id,
              productId: productId._id,
              batchId: batchId._id,
              quantity: quantity,
              lastUpdated: new Date(),
            },
          ],
          { session }
        );

        inventoryUpdates.push({
          productId: productId._id,
          productName: productId.name,
          batchId: batchId._id,
          batchCode: batchId.batchCode,
          quantityAdded: quantity,
          previousQuantity: 0,
          newQuantity: quantity,
          action: 'created',
        });
      }
    }

    // ========================================
    // STEP 4: Update Order Status to Received
    // ========================================
    order.status = 'Received';
    order.receivedAt = new Date();
    await order.save({ session });

    // ========================================
    // STEP 5: Check if All Orders in Trip are Received (Auto-Complete Trip)
    // ========================================
    const allOrdersInTrip = await Order.find({
      _id: { $in: deliveryTrip.orders },
    })
      .select('status')
      .session(session);

    const allReceived = allOrdersInTrip.every(o => o.status === 'Received');

    let tripCompleted = false;
    if (allReceived) {
      deliveryTrip.status = 'Completed';
      deliveryTrip.actualArrival = new Date();
      await deliveryTrip.save({ session });
      tripCompleted = true;
    }

    // ========================================
    // STEP 6: Update Invoice Status (if exists)
    // ========================================
    const invoice = await Invoice.findOne({
      orderId: order._id
    }).session(session);

    if (invoice) {
      // Keep status as Pending (ready for payment) or Paid if already paid
      // The invoice was already created during approval
      // No need to change payment status, just save if any updates were made
      await invoice.save({ session });
    }

    // ========================================
    // STEP 7: Commit Transaction
    // ========================================
    await session.commitTransaction();

    // Populate response data
    await order.populate([
      { path: 'storeId', select: 'storeName storeCode address' },
      { path: 'items.productId', select: 'name sku' },
      { path: 'items.batchId', select: 'batchCode mfgDate expDate' },
    ]);

    await deliveryTrip.populate([
      {
        path: 'orders',
        select: 'orderNumber status',
      },
    ]);

    res.status(200).json({
      success: true,
      message: `Order received successfully and inventory updated${tripCompleted ? '. All orders in trip received - trip completed.' : '.'}`,
      data: {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          receivedAt: order.receivedAt,
        },
        deliveryTrip: {
          _id: deliveryTrip._id,
          tripNumber: deliveryTrip.tripNumber,
          status: deliveryTrip.status,
          actualArrival: deliveryTrip.actualArrival,
          totalOrders: deliveryTrip.orders.length,
          receivedOrders: allOrdersInTrip.filter(o => o.status === 'Received').length,
          tripCompleted,
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

    // Validate all orders have 'Ready_For_Shipping' status
    const invalidOrders = orders.filter(order => order.status !== 'Ready_For_Shipping');
    if (invalidOrders.length > 0) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      const invalidOrderNumbers = invalidOrders
        .map(o => o.orderNumber || o._id)
        .join(', ');
      throw new Error(
        `All orders must have 'Ready_For_Shipping' status. Invalid orders: ${invalidOrderNumbers}`
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
    // STEP 4.5: Validate MAX Orders Limit (After filtering duplicates)
    // ========================================
    const maxOrdersPerTrip = await getSettingNumber('MAX_ORDERS_PER_TRIP', 100);
    const totalOrdersAfterAdd = trip.orders.length + newOrderIds.length;
    
    if (totalOrdersAfterAdd > maxOrdersPerTrip) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error(
        `Capacity exceeded. Trip has ${trip.orders.length} orders. Adding ${newOrderIds.length} new orders exceeds the limit of ${maxOrdersPerTrip} per trip.`
      );
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

    // Check trip status - cannot remove orders from trips beyond Planning
    if (trip.status === 'Transferred_To_Kitchen') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Cannot remove orders from a trip that has been transferred to kitchen');
    }

    if (trip.status === 'Ready_For_Shipping') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Cannot remove orders from a trip that is ready for shipping');
    }

    if (trip.status === 'In_Transit') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Cannot remove orders from an In_Transit trip');
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
    // STEP 5: Set Removed Orders Back to 'Ready_For_Shipping' Status
    // ========================================
    // This is NOT a rejection - just removing from current trip
    // Orders can be reassigned to another trip later
    const updateResult = await Order.updateMany(
      { _id: { $in: orderIds } },
      {
        $set: {
          status: 'Ready_For_Shipping',
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
      message: `Removed ${removedCount} orders from delivery trip. Orders set back to 'Ready_For_Shipping' status for reassignment.`,
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
 * @desc    Start shipping process (move from Planning to In Transit)
 * @route   POST /api/logistics/trips/:id/start-shipping
 * @access  Private (Coordinator, Manager, Admin)
 */
const startShipping = async (req, res, next) => {
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
    if (trip.status !== 'Planning') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error(
        `Cannot start shipping. Trip must be in 'Planning' status. Current status: '${trip.status}'`
      );
    }

    // ========================================
    // STEP 3: Validate Trip Has ENOUGH Orders
    // ========================================
    const minOrdersPerTrip = await getSettingNumber('MIN_ORDERS_PER_TRIP', 5);
    const currentOrderCount = trip.orders ? trip.orders.length : 0;

    if (currentOrderCount < minOrdersPerTrip) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error(
        `Cannot start shipping. A trip requires at least ${minOrdersPerTrip} orders to depart. Currently has ${currentOrderCount} order(s).`
      );
    }

    // ========================================
    // STEP 4: Update All Orders to 'In_Transit' Status
    // ========================================
    const shippedDate = new Date();

    const updateResult = await Order.updateMany(
      { _id: { $in: trip.orders } },
      {
        $set: {
          status: 'In_Transit',
          shippedDate: shippedDate,
        },
      },
      { session }
    );

    // ========================================
    // STEP 5: Deduct Quantities from FinishedBatches
    // Products physically leave the Central Kitchen at this point.
    // ========================================
    const ordersWithItems = await Order.find({
      _id: { $in: trip.orders },
    }).session(session);

    for (const order of ordersWithItems) {
      for (const item of order.items) {
        if (!item.batchId) continue;

        const batch = await Batch.findById(item.batchId).session(session);
        if (!batch) {
          console.warn(
            `Warning: Batch ${item.batchId} not found during stock deduction for order ${order.orderNumber}`
          );
          continue;
        }

        batch.currentQuantity -= item.quantity;
        if (batch.currentQuantity <= 0) {
          batch.currentQuantity = 0;
          batch.status = 'SoldOut';
        }
        await batch.save({ session });
      }
    }

    // ========================================
    // STEP 6: Update Trip Status to 'In_Transit'
    // ========================================
    trip.status = 'In_Transit';
    trip.departureTime = shippedDate;
    await trip.save({ session });

    // ========================================
    // STEP 7: Commit Transaction
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
      message: `Shipping started successfully. ${updateResult.modifiedCount} orders moved to 'In_Transit' status.`,
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
    const { reason } = req.body;

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
    if (!reason || reason.trim() === '') {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error('Cancellation reason is required');
    }

    // ========================================
    // STEP 2: Inventory Reversal (if order has batches assigned)
    // ========================================
    let batchesReversed = 0;

    // Reverse inventory for all orders that have batches assigned (Approved and beyond)
    const statusesWithBatches = ['Approved', 'Transferred_To_Kitchen', 'Ready_For_Shipping', 'In_Transit'];

    if (statusesWithBatches.includes(order.status)) {
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
    order.cancellationReason = reason;
    order.cancelledBy = req.user ? req.user._id : null;
    order.cancelledAt = new Date();
    await order.save({ session });

    // ========================================
    // STEP 4: Handle Refunds and Update Invoice Status (if exists)
    // ========================================
    const invoice = await Invoice.findOne({ orderId: order._id }).session(session);
    let refundInfo = null;

    if (invoice) {
      // Check if invoice was already paid (via Wallet or PayOS)
      if (invoice.paymentStatus === 'Paid') {
        const refundAmount = invoice.totalAmount || order.totalAmount;

        // Find or create wallet for the store
        let wallet = await Wallet.findOne({ storeId: order.storeId._id }).session(session);

        if (!wallet) {
          // Create new wallet if it doesn't exist
          wallet = new Wallet({
            storeId: order.storeId._id,
            balance: 0,
            status: 'Active',
          });
          await wallet.save({ session });
        }

        // Check if wallet is locked
        if (wallet.status === 'Locked') {
          transactionAborted = true;
          await session.abortTransaction();
          res.status(403);
          throw new Error('Store wallet is locked. Cannot process refund.');
        }

        // Add refund amount to wallet balance
        wallet.balance += refundAmount;
        await wallet.save({ session });

        // Create Refund transaction record
        const refundTransaction = new WalletTransaction({
          walletId: wallet._id,
          amount: refundAmount, // Positive for refund
          type: 'Refund',
          description: `Refund for cancelled order ${order.orderNumber}: ${reason}`,
          orderId: order._id,
          timestamp: new Date(),
        });
        await refundTransaction.save({ session });

        // Update invoice status to Refunded
        invoice.paymentStatus = 'Refunded';
        await invoice.save({ session });

        refundInfo = {
          walletId: wallet._id,
          refundAmount,
          newBalance: wallet.balance,
          transactionId: refundTransaction._id,
          reason: reason,
        };
      } else if (invoice.paymentStatus === 'Pending') {
        // If invoice was not paid yet, just cancel it
        invoice.paymentStatus = 'Cancelled';
        await invoice.save({ session });
      }
    }

    // ========================================
    // STEP 5: Prepare Response Data (before commit for safety)
    // ========================================
    // Populate order data while still in transaction
    await order.populate([
      { path: 'storeId', select: 'storeName storeCode address' },
      { path: 'items.productId', select: 'name sku' },
      { path: 'cancelledBy', select: 'fullName email' },
    ]);

    const responseMessage = `Order rejected successfully${batchesReversed > 0 ? `. ${batchesReversed} batches reversed.` : ''}${refundInfo ? ` Refund of ${refundInfo.refundAmount} added to wallet.` : ''}`;

    const responseData = {
      success: true,
      message: responseMessage,
      data: {
        order,
        batchesReversed,
        inventoryReversed: batchesReversed > 0,
        refund: refundInfo,
        invoice: invoice ? {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          paymentStatus: invoice.paymentStatus,
        } : null,
      },
    };

    // ========================================
    // STEP 6: Commit Transaction
    // ========================================
    await session.commitTransaction();
    transactionAborted = true; // Mark as committed to prevent abort attempts

    // ========================================
    // STEP 7: Send Response (immediately after commit)
    // ========================================
    res.status(200).json(responseData);
  } catch (error) {
    // Abort transaction ONLY if it's still active
    if (session.inTransaction()) {
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
    // Extract status from query parameters
    const { status } = req.query;

    // Build filter object
    const filter = {};
    if (status) {
      filter.status = status;
    }

    // Fetch orders with filter
    const orders = await Order.find(filter)
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
    const { status, vehicleTypeId } = req.query;

    const filter = {};
    if (status) {
      filter.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }
    if (vehicleTypeId) {
      filter.vehicleType = vehicleTypeId;
    }

    const trips = await DeliveryTrip.find(filter)
      .populate('vehicleType')
      .populate({
        path: 'orders',
        populate: { path: 'storeId', select: 'storeName storeCode' },
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
    .populate('vehicleType')
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
    const { orderIds, notes, vehicleTypeId } = req.body;

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
    // STEP 1.5: Validate MAX Orders Limit
    // ========================================
    const maxOrdersPerTrip = await getSettingNumber('MAX_ORDERS_PER_TRIP', 100);
    if (orderIds.length > maxOrdersPerTrip) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      throw new Error(`Exceeded maximum limit. A delivery trip can only have up to ${maxOrdersPerTrip} orders. You provided ${orderIds.length}.`);
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

    // Validate all orders have 'Ready_For_Shipping' status
    const invalidOrders = orders.filter(order => order.status !== 'Ready_For_Shipping');
    if (invalidOrders.length > 0) {
      transactionAborted = true;
      await session.abortTransaction();
      res.status(400);
      const invalidOrderCodes = invalidOrders
        .map(o => o.orderCode || o.orderNumber || o._id)
        .join(', ');
      throw new Error(
        `All orders must have 'Ready_For_Shipping' status. Invalid orders: ${invalidOrderCodes}`
      );
    }

    // ========================================
    // STEP 3: Create Delivery Trip
    // ========================================
    const deliveryTrip = await DeliveryTrip.create(
      [
        {
          orders: orderIds,
          vehicleType: vehicleTypeId,
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
          status: { $in: ['Pending', 'Approved', 'Transferred_To_Kitchen', 'Ready_For_Shipping', 'In_Transit'] },
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

/**
 * @desc    Get all invoices
 * @route   GET /api/logistics/invoices
 * @access  Private
 */
const getInvoices = async (req, res, next) => {
  try {
    const { paymentStatus, storeId, orderId } = req.query;

    const filter = {};
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (storeId) filter.storeId = storeId;
    if (orderId) filter.orderId = orderId;

    const invoices = await Invoice.find(filter)
      .populate('orderId', 'orderNumber status')
      .populate('storeId', 'storeName storeCode')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: invoices.length, data: invoices });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get invoice by ID
 * @route   GET /api/logistics/invoices/:id
 * @access  Private
 */
const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('orderId', 'orderNumber status')
      .populate('storeId', 'storeName storeCode');

    if (!invoice) {
      res.status(404);
      return next(new Error('Invoice not found'));
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update delivery trip (vehicleType and/or notes)
 * @route   PATCH /api/logistics/trips/:id
 * @access  Private (Coordinator, Manager, Admin)
 */
const updateDeliveryTrip = async (req, res, next) => {
  try {
    const { vehicleTypeId, notes } = req.body;

    const trip = await DeliveryTrip.findById(req.params.id);
    if (!trip) {
      res.status(404);
      return next(new Error('Delivery trip not found'));
    }

    const nonEditableStatuses = ['In_Transit', 'Completed'];
    if (nonEditableStatuses.includes(trip.status)) {
      res.status(400);
      return next(
        new Error(
          `Cannot update a delivery trip with status '${trip.status}'`
        )
      );
    }

    if (vehicleTypeId !== undefined) {
      trip.vehicleType = vehicleTypeId;
    }
    if (notes !== undefined) {
      trip.notes = notes;
    }

    await trip.save();

    await trip.populate([
      { path: 'vehicleType', select: 'name description' },
      { path: 'orders', select: 'orderNumber status storeId' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Delivery trip updated successfully',
      data: trip,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Hard delete a delivery trip (only if status is Planning)
 * @route   DELETE /api/logistics/trips/:id
 * @access  Private (Coordinator, Manager, Admin)
 */
const deleteDeliveryTrip = async (req, res, next) => {
  // Start transaction for data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  let transactionAborted = false;

  try {
    const { id } = req.params;

    // ========================================
    // STEP 1: Validation - Fetch Delivery Trip
    // ========================================
    const trip = await DeliveryTrip.findById(id).session(session);

    if (!trip) {
      res.status(404);
      throw new Error('Delivery trip not found');
    }

    // ========================================
    // STEP 2: Validate Trip Status (Only 'Planning' allowed)
    // ========================================
    if (trip.status !== 'Planning') {
      res.status(400);
      throw new Error(
        `Cannot delete delivery trip. Deletion is only allowed for trips in 'Planning' status. Current status: '${trip.status}'`
      );
    }

    // ========================================
    // STEP 3: Hard Delete the DeliveryTrip Document
    // ========================================
    // Note: Orders associated with this trip are NOT modified
    // They will remain in their current status in the database
    await DeliveryTrip.findByIdAndDelete(id).session(session);

    // ========================================
    // STEP 4: Commit Transaction
    // ========================================
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Delivery trip deleted successfully. Associated orders remain unchanged.',
      data: {
        deletedTripId: id,
        deletedTripNumber: trip.tripNumber,
        orderCount: trip.orders ? trip.orders.length : 0,
      },
    });
  } catch (error) {
    // Abort transaction if not already aborted
    if (!transactionAborted) {
      await session.abortTransaction();
      transactionAborted = true;
    }
    next(error);
  } finally {
    // End session
    session.endSession();
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
  updateDeliveryTrip,
  addOrdersToTrip,
  removeOrdersFromTrip,
  startShipping,
  receiveOrder,
  deleteDeliveryTrip,

  // Invoice & Payment
  getInvoices,
  getInvoiceById,
  recordPayment,

  // Analytics
  aggregateDailyDemand,
};
