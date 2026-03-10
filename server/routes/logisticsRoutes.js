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
  updateDeliveryTrip,
  aggregateDailyDemand,
  recordPayment,
  addOrdersToTrip,
  removeOrdersFromTrip,
  startShipping,
  deleteDeliveryTrip,
  getInvoices,
  getInvoiceById,
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

// Approve order (assign batches, deduct inventory) (Coordinator, Manager, Admin)
router.post(
  '/orders/:orderId/approve',
  authorize('Coordinator', 'Manager', 'Admin'),
  approveOrder
);

// Reject/Cancel order (Coordinator, Manager, Admin)
router.post(
  '/orders/:orderId/reject',
  authorize('Coordinator', 'Manager', 'Admin'),
  rejectOrder
);

// Receive order at store (Store Staff, Manager, Admin)
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

// Start shipping process (Coordinator, Manager, Admin)
router.post(
  '/trips/:id/start-shipping',
  authorize('Coordinator', 'Manager', 'Admin'),
  startShipping
);

// Get all delivery trips
router.get('/trips', getTrips);

// Get single delivery trip by ID
router.get('/trips/:id', getTripById);

// Update delivery trip vehicleType and/or notes (Coordinator, Manager, Admin)
router.patch(
  '/trips/:id',
  authorize('Coordinator', 'Manager', 'Admin'),
  updateDeliveryTrip
);

// Delete delivery trip (only if status is Planning) (Coordinator, Manager, Admin)
router.delete(
  '/trips/:id',
  authorize('Coordinator', 'Manager', 'Admin'),
  deleteDeliveryTrip
);

// ===== INVOICE ROUTES =====

// Get all invoices
router.get('/invoices', getInvoices);

// Get single invoice by ID
router.get('/invoices/:id', getInvoiceById);

// Record payment for an invoice (Store Staff, Manager, Admin)
router.post(
  '/invoices/:id/payment',
  authorize('StoreStaff', 'Manager', 'Admin'),
  recordPayment
);

module.exports = router;
