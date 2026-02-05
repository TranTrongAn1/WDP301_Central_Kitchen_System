const express = require('express');
const {
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
} = require('../controllers/logisticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

<<<<<<< Updated upstream
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
=======
// ===== ORDER ROUTES =====

// Aggregate daily demand for production planning (Kitchen Staff, Manager, Admin)
router.get('/orders/aggregate', authorize('KitchenStaff', 'Manager', 'Admin'), aggregateDailyDemand);

// Get all orders (filtered by user role)
router.get('/orders', getOrders);

// Get single order by ID
router.get('/orders/:id', getOrderById);

// Create new order (Store Staff, Manager, Admin)
router.post('/orders', authorize('StoreStaff', 'Manager', 'Admin'), createOrder);

// Approve and ship order (Kitchen Staff, Manager, Admin)
router.post(
  '/orders/:orderId/approve-and-ship',
  authorize('KitchenStaff', 'Manager', 'Admin'),
  approveAndShipOrder
);

// Reject/Cancel order (Kitchen Staff, Manager, Admin)
router.post(
  '/orders/:orderId/reject',
  authorize('KitchenStaff', 'Manager', 'Admin'),
  rejectOrder
);

// Receive order by QR code scan (Store Staff, Manager, Admin)
router.post(
  '/orders/:orderId/receive-by-qr',
  authorize('StoreStaff', 'Manager', 'Admin'),
  receiveOrderByQr
);

// ===== DELIVERY TRIP ROUTES =====

// Get all trips
router.get('/trips', getTrips);

// Get single trip by ID
router.get('/trips/:id', getTripById);

// Receive order by trip ID (Store Staff, Manager, Admin)
router.post(
  '/trips/:tripId/receive',
  authorize('StoreStaff', 'Manager', 'Admin'),
  receiveOrder
);
>>>>>>> Stashed changes

module.exports = router;
