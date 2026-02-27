const express = require('express');
const {
  createOrder,
  updateOrder,
  approveOrder,
  createDeliveryTrip,
  receiveOrder,
  rejectOrder,
  getOrders,
  getOrderById,
  getTrips,
  getTripById,
  aggregateDailyDemand,
  recordPayment,
  addOrdersToTrip,
  removeOrdersFromTrip,
  finalizeDeliveryPlan,
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

// Update order (Store Staff, Manager, Admin)
router.put('/orders/:id', authorize('StoreStaff', 'Manager', 'Admin'), updateOrder);

// Approve order (assign batches, deduct inventory) (Kitchen Staff, Manager, Admin)
router.post(
  '/orders/:orderId/approve',
  authorize('KitchenStaff', 'Manager', 'Admin'),
  approveOrder
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

// Create delivery trip from multiple approved orders (Manager, Admin, Coordinator)
router.post(
  '/trips/create',
  authorize('Manager', 'Admin', 'Coordinator'),
  createDeliveryTrip
);

// Add orders to an existing trip (Coordinator, Manager, Admin)
router.patch(
  '/trips/:id/add-orders',
  authorize('Coordinator', 'Manager', 'Admin'),
  addOrdersToTrip
);

// Remove orders from a trip (Coordinator, Manager, Admin)
router.patch(
  '/trips/:id/remove-orders',
  authorize('Coordinator', 'Manager', 'Admin'),
  removeOrdersFromTrip
);

// Finalize delivery plan - start shipping (Coordinator, Manager, Admin)
router.post(
  '/trips/:id/finalize',
  authorize('Coordinator', 'Manager', 'Admin'),
  finalizeDeliveryPlan
);

// Get all delivery trips
router.get('/delivery-trips', getTrips);

// Get single delivery trip by ID
router.get('/delivery-trips/:id', getTripById);

// ===== INVOICE ROUTES =====

// Record payment for an invoice (Store Staff, Manager, Admin)
router.post(
  '/invoices/:id/payment',
  authorize('StoreStaff', 'Manager', 'Admin'),
  recordPayment
);

module.exports = router;
