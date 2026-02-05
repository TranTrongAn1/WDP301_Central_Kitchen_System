const express = require('express');
const {
  createOrder,
  approveAndShipOrder,
  receiveOrder,
  rejectOrder,
  receiveOrderByQr,
  getOrders,
  getOrderById,
  getTrips,
  getTripById,
  aggregateDailyDemand,
} = require('../controllers/logisticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

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

module.exports = router;
