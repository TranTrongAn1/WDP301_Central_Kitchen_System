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
    const { orderNumber, storeId, requestedDeliveryDate, items, notes } = req.body;

    // Validation: Check if items array is not empty
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400);
      return next(new Error('Order must contain at least one item'));
    }

    // Validation: Check if storeId is provided
    if (!storeId) {
      res.status(400);
      return next(new Error('Store ID is required'));
    }

    // Validation: Check if storeId exists
    const store = await Store.findById(storeId);
    if (!store) {
      res.status(404);
      return next(new Error('Store not found'));
    }

    // Validation: Check if store is active
    if (store.status !== 'Active') {
      res.status(400);
      return next(new Error(`Store is ${store.status}. Only Active stores can place orders.`));
    }

    // Validation: Check if orderNumber is provided
    if (!orderNumber) {
      res.status(400);
      return next(new Error('Order number is required'));
    }

    // Check if orderNumber already exists
    const existingOrder = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });
    if (existingOrder) {
      res.status(400);
      return next(new Error(`Order with number '${orderNumber}' already exists`));
    }

    // Validation: Check if requestedDeliveryDate is provided and valid
    if (!requestedDeliveryDate) {
      res.status(400);
      return next(new Error('Requested delivery date is required'));
    }

    const deliveryDate = new Date(requestedDeliveryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (deliveryDate < today) {
      res.status(400);
      return next(new Error('Requested delivery date cannot be in the past'));
    }

    // Process order items - fetch product prices and validate
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const { productId, batchId, quantity } = item;

      // Validate item fields
      if (!productId || !batchId || !quantity) {
        res.status(400);
        return next(new Error('Each item must have productId, batchId, and quantity'));
      }

      // Validate quantity
      if (quantity < 1) {
        res.status(400);
        return next(new Error('Quantity must be at least 1'));
      }

      // Fetch product to get price
      const product = await Product.findById(productId);
      if (!product) {
        res.status(404);
        return next(new Error(`Product not found: ${productId}`));
      }

      // Validate batch exists and belongs to the product
      const batch = await Batch.findById(batchId);
      if (!batch) {
        res.status(404);
        return next(new Error(`Batch not found: ${batchId}`));
      }

      if (batch.productId.toString() !== productId.toString()) {
        res.status(400);
        return next(new Error(`Batch ${batch.batchCode} does not belong to product ${product.name}`));
      }

      // Check if batch has enough quantity
      if (batch.currentQuantity < quantity) {
        res.status(400);
        return next(new Error(
          `Insufficient stock for batch ${batch.batchCode}. Available: ${batch.currentQuantity}, Requested: ${quantity}`
        ));
      }

      // Check if batch is not expired
      const now = new Date();
      if (batch.expDate < now) {
        res.status(400);
        return next(new Error(`Batch ${batch.batchCode} has expired on ${batch.expDate.toLocaleDateString()}`));
      }

      // Calculate subtotal
      const unitPrice = product.price;
      const subtotal = unitPrice * quantity;

      // Add to order items
      orderItems.push({
        productId,
        batchId,
        quantity,
        unitPrice,
        subtotal,
      });

      // Add to total amount
      totalAmount += subtotal;
    }

    // Create order document with status Pending
    const order = await Order.create({
      orderNumber: orderNumber.toUpperCase(),
      storeId,
      orderDate: new Date(),
      requestedDeliveryDate: deliveryDate,
      orderItems,
      totalAmount,
      status: 'Pending',
      notes: notes || '',
    });

    // Populate order details
    await order.populate([
      { path: 'storeId', select: 'storeName storeCode address phone' },
      { path: 'orderItems.productId', select: 'name sku price categoryId' },
      { path: 'orderItems.batchId', select: 'batchCode mfgDate expDate currentQuantity' },
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
        },
      ],
      { session }
    );

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
    ]);

    res.status(200).json({
      success: true,
      message: 'Order approved and shipped successfully',
      data: {
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

module.exports = {
  createOrder,
  approveAndShipOrder,
  receiveOrder,
};
