const express = require('express');
const {
  createOrder,
  approveAndShipOrder,
  receiveOrder,
} = require('../controllers/logisticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * Order Routes
 */
// Create new order (Store Manager, Admin)
router.post('/orders', authorize('Admin', 'Manager', 'Store_Manager'), createOrder);

// Get specific order (Admin, Manager, Store_Manager)
router.get('/orders/:orderId', authorize('Admin', 'Manager', 'Store_Manager'), async (req, res, next) => {
  try {
    const Order = require('../models/Order');
    const order = await Order.findById(req.params.orderId)
      .populate('storeId', 'storeName storeCode address')
      .populate('orderItems.productId', 'name sku price')
      .populate('orderItems.batchId', 'batchCode mfgDate expDate')
      .populate('approvedBy', 'fullName email');

    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

// Approve and ship order (Admin, Manager)
router.post('/orders/:orderId/approve-ship', authorize('Admin', 'Manager'), approveAndShipOrder);

/**
 * Delivery Trip Routes
 */
// Get specific delivery trip
router.get('/trips/:tripId', authorize('Admin', 'Manager', 'Store_Manager'), async (req, res, next) => {
  try {
    const DeliveryTrip = require('../models/DeliveryTrip');
    const trip = await DeliveryTrip.findById(req.params.tripId)
      .populate('orderId', 'orderNumber orderDate totalAmount')
      .populate('storeId', 'storeName storeCode address')
      .populate('driverId', 'fullName email')
      .populate('exportDetails.productId', 'name sku')
      .populate('exportDetails.batchId', 'batchCode mfgDate expDate');

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
});

// Receive order at store (Store Manager, Admin)
router.post('/trips/:tripId/receive', authorize('Admin', 'Manager', 'Store_Manager'), receiveOrder);

/**
 * Invoice Routes
 */
// Get specific invoice
router.get('/invoices/:invoiceId', authorize('Admin', 'Manager', 'Store_Manager'), async (req, res, next) => {
  try {
    const Invoice = require('../models/Invoice');
    const invoice = await Invoice.findById(req.params.invoiceId)
      .populate('orderId', 'orderNumber orderDate')
      .populate('storeId', 'storeName storeCode');

    if (!invoice) {
      res.status(404);
      return next(new Error('Invoice not found'));
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
