const express = require('express');
const {
  createOrder,
  approveAndShipOrder,
  receiveOrder,
  rejectOrder,
  getOrders,
  getOrderById,
  getTrips,
  getTripById,
  aggregateDailyDemand,
} = require('../controllers/logisticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Parse JSON request bodies
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

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

// Receive order (QR scan or manual confirmation) (Store Staff, Manager, Admin)
router.post(
  '/orders/:orderId/receive',
  authorize('StoreStaff', 'Manager', 'Admin'),
  receiveOrder
);

// ===== DELIVERY TRIP ROUTES =====

// Get all delivery trips
router.get('/delivery-trips', getTrips);

// Get single delivery trip by ID
router.get('/delivery-trips/:id', getTripById);

module.exports = router;
