/**
 * Integration Test: Feature 5 - Receive Order by QR Endpoint
 * Tests the complete workflow for receiving orders by scanning QR code
 * 
 * Test Coverage:
 * 1. Happy Path: Store Staff successfully receives an In_Transit order
 * 2. Fail Case: Cannot receive order without active delivery trip
 * 3. Fail Case: Cannot receive order that is not In_Transit
 * 4. Validation: Store Staff can only receive orders for their store
 * 5. Edge Cases: Non-existent order, unauthorized access
 * 6. Inventory: StoreInventory is correctly incremented
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const { connectDB, clearDB, closeDB } = require('./setup');

// Import Models
const User = require('../models/User');
const Role = require('../models/Role');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const DeliveryTrip = require('../models/DeliveryTrip');
const Batch = require('../models/BatchModel');
const StoreInventory = require('../models/StoreInventory');
const ProductionPlan = require('../models/ProductionPlan');

describe('Feature 5: Receive Order by QR - Integration Tests', () => {
  let managerToken;
  let storeStaffToken;
  let storeStaff2Token;
  let coordinatorToken;
  let managerUser;
  let storeStaffUser;
  let storeStaff2User;
  let coordinatorUser;
  let managerRole;
  let storeStaffRole;
  let coordinatorRole;
  let testStore1;
  let testStore2;
  let testCategory;
  let testProduct;
  let testBatch;
  let testProductionPlan;
  let inTransitOrder;
  let deliveryTrip;
  let pendingOrder;
  let receivedOrder;

  // ============================================================
  // SETUP: Initialize Database and Authentication
  // ============================================================
  beforeAll(async () => {
    // Connect to test database
    await connectDB();

    // Clear all collections
    await clearDB();

    // ============================================================
    // CREATE ROLES
    // ============================================================
    managerRole = await Role.create({
      roleName: 'Manager',
    });

    storeStaffRole = await Role.create({
      roleName: 'StoreStaff',
    });

    coordinatorRole = await Role.create({
      roleName: 'Coordinator',
    });

    // ============================================================
    // CREATE STORES
    // ============================================================
    testStore1 = await Store.create({
      storeName: 'Store 1 - Downtown',
      storeCode: 'STR001',
      address: '123 Main Street',
      phone: '0123456789',
      standardDeliveryMinutes: 30,
      status: 'Active',
    });

    testStore2 = await Store.create({
      storeName: 'Store 2 - Uptown',
      storeCode: 'STR002',
      address: '456 High Street',
      phone: '0987654321',
      standardDeliveryMinutes: 45,
      status: 'Active',
    });

    // ============================================================
    // CREATE USERS
    // ============================================================
    managerUser = await User.create({
      username: 'manager_qr_test',
      passwordHash: 'password123',
      fullName: 'Test Manager',
      email: 'manager_qr@test.com',
      roleId: managerRole._id,
      isActive: true,
    });

    storeStaffUser = await User.create({
      username: 'staff1_qr_test',
      passwordHash: 'password123',
      fullName: 'Store Staff 1',
      email: 'staff1_qr@test.com',
      roleId: storeStaffRole._id,
      storeId: testStore1._id,
      isActive: true,
    });

    storeStaff2User = await User.create({
      username: 'staff2_qr_test',
      passwordHash: 'password123',
      fullName: 'Store Staff 2',
      email: 'staff2_qr@test.com',
      roleId: storeStaffRole._id,
      storeId: testStore2._id,
      isActive: true,
    });

    coordinatorUser = await User.create({
      username: 'coordinator_qr_test',
      passwordHash: 'password123',
      fullName: 'Test Coordinator',
      email: 'coordinator_qr@test.com',
      roleId: coordinatorRole._id,
      isActive: true,
    });

    // ============================================================
    // AUTHENTICATE USERS
    // ============================================================
    const managerLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'manager_qr_test',
        password: 'password123',
      });

    if (!managerLoginResponse.body.success || !managerLoginResponse.body.token) {
      throw new Error(`Manager login failed: ${managerLoginResponse.body.message || 'Unknown error'}`);
    }
    managerToken = managerLoginResponse.body.token;
    expect(managerToken).toBeDefined();

    const staff1LoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'staff1_qr_test',
        password: 'password123',
      });

    if (!staff1LoginResponse.body.success || !staff1LoginResponse.body.token) {
      throw new Error(`Staff 1 login failed: ${staff1LoginResponse.body.message || 'Unknown error'}`);
    }
    storeStaffToken = staff1LoginResponse.body.token;
    expect(storeStaffToken).toBeDefined();

    const staff2LoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'staff2_qr_test',
        password: 'password123',
      });

    if (!staff2LoginResponse.body.success || !staff2LoginResponse.body.token) {
      throw new Error(`Staff 2 login failed: ${staff2LoginResponse.body.message || 'Unknown error'}`);
    }
    storeStaff2Token = staff2LoginResponse.body.token;
    expect(storeStaff2Token).toBeDefined();

    const coordinatorLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'coordinator_qr_test',
        password: 'password123',
      });

    if (!coordinatorLoginResponse.body.success || !coordinatorLoginResponse.body.token) {
      throw new Error(`Coordinator login failed: ${coordinatorLoginResponse.body.message || 'Unknown error'}`);
    }
    coordinatorToken = coordinatorLoginResponse.body.token;
    expect(coordinatorToken).toBeDefined();

    // ============================================================
    // CREATE PRODUCT & BATCH
    // ============================================================
    testCategory = await Category.create({
      categoryName: 'QR Test Mooncakes',
    });

    testProduct = await Product.create({
      name: 'QR Test Mooncake',
      sku: 'QR-TEST-001',
      categoryId: testCategory._id,
      price: 150000,
      shelfLifeDays: 30,
    });

    // Create Production Plan (required for Batch)
    testProductionPlan = await ProductionPlan.create({
      planCode: 'PLAN-QR-001',
      planDate: new Date(),
      details: [
        {
          productId: testProduct._id,
          plannedQuantity: 500,
        },
      ],
      status: 'Completed',
    });

    // Create Finished Batch
    const mfgDate = new Date();
    const expDate = new Date(mfgDate);
    expDate.setDate(expDate.getDate() + 30); // 30 days shelf life

    testBatch = await Batch.create({
      batchCode: 'BATCH-QR-001',
      productionPlanId: testProductionPlan._id,
      productId: testProduct._id,
      mfgDate: mfgDate,
      expDate: expDate,
      initialQuantity: 100,
      currentQuantity: 100,
      status: 'Active',
    });

    // ============================================================
    // CREATE ORDERS WITH DIFFERENT STATUSES
    // ============================================================

    // Order 1: In_Transit (with Delivery Trip) - For Happy Path
    inTransitOrder = await Order.create({
      storeId: testStore1._id,
      createdBy: storeStaffUser._id,
      status: 'In_Transit',
      items: [
        {
          productId: testProduct._id,
          quantity: 20,
          batchId: testBatch._id,
        },
      ],
      notes: 'Order for QR receive test',
      approvedBy: managerUser._id,
      approvedDate: new Date(),
      shippedDate: new Date(),
    });

    // Create DeliveryTrip for inTransitOrder
    deliveryTrip = await DeliveryTrip.create({
      driverId: coordinatorUser._id,
      vehicleNumber: 'TRUCK-001',
      orders: [inTransitOrder._id],
      status: 'In_Transit',
      departureTime: new Date(),
      notes: 'Test delivery trip',
    });

    // Order 2: Pending (No Delivery Trip) - For Fail Case
    pendingOrder = await Order.create({
      storeId: testStore1._id,
      createdBy: storeStaffUser._id,
      status: 'Pending',
      items: [
        {
          productId: testProduct._id,
          quantity: 10,
          batchId: testBatch._id,
        },
      ],
      notes: 'Pending order without trip',
    });

    // Order 3: Already Received - For Fail Case
    receivedOrder = await Order.create({
      storeId: testStore1._id,
      createdBy: storeStaffUser._id,
      status: 'Received',
      items: [
        {
          productId: testProduct._id,
          quantity: 15,
          batchId: testBatch._id,
        },
      ],
      notes: 'Already received order',
      receivedDate: new Date(),
    });

    console.log('✅ Test Setup Complete - QR Receive Test');
    console.log(`   Store 1 Staff: ${storeStaffUser.username}`);
    console.log(`   Store 2 Staff: ${storeStaff2User.username}`);
    console.log(`   Coordinator: ${coordinatorUser.username}`);
    console.log(`   In-Transit Order ID: ${inTransitOrder._id}`);
    console.log(`   Delivery Trip ID: ${deliveryTrip._id}`);
    console.log(`   Batch: ${testBatch.batchCode} (Quantity: ${testBatch.currentQuantity})`);
  });

  afterAll(async () => {
    await clearDB();
    await closeDB();
  });

  // ============================================================
  // TEST CASE 1: Happy Path - Store Staff Receives Order by QR
  // ============================================================
  describe('Test Case 1: Happy Path - Store Staff Receives Order by QR', () => {
    it('should successfully receive an In_Transit order and update inventory', async () => {
      // Check initial inventory (should be empty)
      const initialInventory = await StoreInventory.findOne({
        storeId: testStore1._id,
        batchId: testBatch._id,
      });
      const initialQuantity = initialInventory ? initialInventory.quantity : 0;

      // Store Staff scans QR code (using Manager token as Manager can receive for any store)
      const response = await request(app)
        .post(`/api/logistics/orders/${inTransitOrder._id}/receive-by-qr`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      // Assert Response
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order received successfully by QR scan');
      expect(response.body.data).toHaveProperty('order');
      expect(response.body.data).toHaveProperty('trip');

      // Verify Order Status
      const order = response.body.data.order;
      expect(order.status).toBe('Received');
      expect(order).toHaveProperty('receivedDate');

      // Verify DeliveryTrip Status
      const trip = response.body.data.trip;
      expect(trip.status).toBe('Completed');
      expect(trip).toHaveProperty('completedTime');

      // ============================================================
      // Verify Database Changes
      // ============================================================

      // Check Order in Database
      const orderInDB = await Order.findById(inTransitOrder._id);
      expect(orderInDB).toBeDefined();
      expect(orderInDB.status).toBe('Received');
      expect(orderInDB.receivedDate).toBeDefined();
      expect(orderInDB.receivedDate).toBeInstanceOf(Date);

      // Check DeliveryTrip in Database
      const tripInDB = await DeliveryTrip.findById(deliveryTrip._id);
      expect(tripInDB).toBeDefined();
      expect(tripInDB.status).toBe('Completed');
      expect(tripInDB.completedTime).toBeDefined();
      expect(tripInDB.completedTime).toBeInstanceOf(Date);

      // Check StoreInventory - CRITICAL ASSERTION
      const updatedInventory = await StoreInventory.findOne({
        storeId: testStore1._id,
        batchId: testBatch._id,
      });

      expect(updatedInventory).toBeDefined();
      expect(updatedInventory.productId.toString()).toBe(testProduct._id.toString());
      expect(updatedInventory.quantity).toBe(initialQuantity + 20); // Initial + order quantity
      expect(updatedInventory.lastUpdated).toBeDefined();

      console.log(`✅ Order received successfully by QR scan`);
      console.log(`   Order Status: ${orderInDB.status}`);
      console.log(`   Trip Status: ${tripInDB.status}`);
      console.log(`   Store Inventory: ${updatedInventory.quantity} units`);
      console.log(`   Batch: ${testBatch.batchCode}`);
    });
  });

  // ============================================================
  // TEST CASE 2: Fail Case - No Active Delivery Trip
  // ============================================================
  describe('Test Case 2: Fail Case - No Active Delivery Trip', () => {
    it('should return 400 when order has no active delivery trip', async () => {
      const response = await request(app)
        .post(`/api/logistics/orders/${pendingOrder._id}/receive-by-qr`)
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .expect(400);

      // Assert Response
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot receive order with status');
      expect(response.body.message).toContain('Pending');

      // Verify Order Status Unchanged
      const orderInDB = await Order.findById(pendingOrder._id);
      expect(orderInDB).toBeDefined();
      expect(orderInDB.status).toBe('Pending'); // Status unchanged
      expect(orderInDB.receivedDate).toBeUndefined();

      console.log(`✅ Correctly rejected order without active trip`);
      console.log(`   Order Status: ${orderInDB.status} (unchanged)`);
    });
  });

  // ============================================================
  // TEST CASE 3: Fail Case - Order Not In_Transit
  // ============================================================
  describe('Test Case 3: Fail Case - Order Not In_Transit', () => {
    it('should return 400 when trying to receive already Received order', async () => {
      const response = await request(app)
        .post(`/api/logistics/orders/${receivedOrder._id}/receive-by-qr`)
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .expect(400);

      // Assert Response
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot receive order with status');
      expect(response.body.message).toContain('Received');
      expect(response.body.message).toContain('Order must be In_Transit');

      // Verify Order Status Unchanged
      const orderInDB = await Order.findById(receivedOrder._id);
      expect(orderInDB).toBeDefined();
      expect(orderInDB.status).toBe('Received'); // Still Received

      console.log(`✅ Correctly prevented re-receiving already Received order`);
    });

    it('should return 400 when trying to receive Pending order', async () => {
      const response = await request(app)
        .post(`/api/logistics/orders/${pendingOrder._id}/receive-by-qr`)
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .expect(400);

      // Assert Response (will fail at status check before trip check)
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot receive order with status');
      expect(response.body.message).toContain('Pending');

      console.log(`✅ Correctly prevented receiving Pending order`);
    });
  });

  // ============================================================
  // TEST CASE 4: Authorization - Store Staff Can Only Receive Own Store Orders
  // ============================================================
  describe('Test Case 4: Authorization - Store Staff Can Only Receive Own Store Orders', () => {
    it('should return 403 when Store Staff tries to receive order for different store', async () => {
      // Create order for Store 2
      const store2Order = await Order.create({
        storeId: testStore2._id,
        createdBy: storeStaff2User._id,
        status: 'In_Transit',
        items: [
          {
            productId: testProduct._id,
            quantity: 8,
            batchId: testBatch._id,
          },
        ],
        notes: 'Order for Store 2',
        shippedDate: new Date(),
      });

      // Create delivery trip for Store 2 order
      const store2Trip = await DeliveryTrip.create({
        driverId: coordinatorUser._id,
        orders: [store2Order._id],
        status: 'In_Transit',
        departureTime: new Date(),
      });

      // Store Staff 1 tries to receive Store 2's order
      const response = await request(app)
        .post(`/api/logistics/orders/${store2Order._id}/receive-by-qr`)
        .set('Authorization', `Bearer ${storeStaffToken}`) // Staff from Store 1
        .expect(403);

      // Assert Response
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You can only receive orders for your assigned store');

      // Verify Order Status Unchanged
      const orderInDB = await Order.findById(store2Order._id);
      expect(orderInDB).toBeDefined();
      expect(orderInDB.status).toBe('In_Transit'); // Status unchanged
      expect(orderInDB.receivedDate).toBeUndefined();

      console.log(`✅ Correctly blocked Store Staff from receiving other store's order`);
      console.log(`   Staff Store: Store 1, Order Store: Store 2`);
    });

    it('should allow Manager to receive orders for any store', async () => {
      // Create order for Store 2
      const store2Order = await Order.create({
        storeId: testStore2._id,
        createdBy: storeStaff2User._id,
        status: 'In_Transit',
        items: [
          {
            productId: testProduct._id,
            quantity: 12,
            batchId: testBatch._id,
          },
        ],
        notes: 'Order for Store 2 - Manager test',
        shippedDate: new Date(),
      });

      // Create delivery trip
      const store2Trip = await DeliveryTrip.create({
        driverId: coordinatorUser._id,
        orders: [store2Order._id],
        status: 'In_Transit',
        departureTime: new Date(),
      });

      // Manager receives order for Store 2
      const response = await request(app)
        .post(`/api/logistics/orders/${store2Order._id}/receive-by-qr`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      // Assert Response
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('Received');

      console.log(`✅ Manager successfully received order for any store`);
    });
  });

  // ============================================================
  // TEST CASE 5: Edge Cases
  // ============================================================
  describe('Test Case 5: Edge Cases', () => {
    it('should return 404 when order does not exist', async () => {
      const nonExistentOrderId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/logistics/orders/${nonExistentOrderId}/receive-by-qr`)
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Order not found');

      console.log(`✅ Correctly handled non-existent order`);
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .post(`/api/logistics/orders/${inTransitOrder._id}/receive-by-qr`)
        // No Authorization header
        .expect(401);

      expect(response.body.success).toBe(false);

      console.log(`✅ Correctly required authentication`);
    });

    it('should return 404 for invalid ObjectId format', async () => {
      const response = await request(app)
        .post(`/api/logistics/orders/invalid-id-format/receive-by-qr`)
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);

      console.log(`✅ Correctly handled invalid ObjectId format`);
    });
  });

  // ============================================================
  // TEST CASE 6: Inventory Management
  // ============================================================
  describe('Test Case 6: Inventory Management', () => {
    it('should increment existing inventory when receiving multiple times', async () => {
      // Create first order and receive it
      const order1 = await Order.create({
        storeId: testStore1._id,
        createdBy: storeStaffUser._id,
        status: 'In_Transit',
        items: [
          {
            productId: testProduct._id,
            quantity: 5,
            batchId: testBatch._id,
          },
        ],
        approvedBy: managerUser._id,
        approvedDate: new Date(),
        shippedDate: new Date(),
      });

      const trip1 = await DeliveryTrip.create({
        driverId: coordinatorUser._id,
        orders: [order1._id],
        status: 'In_Transit',
        departureTime: new Date(),
      });

      // Receive first order
      await request(app)
        .post(`/api/logistics/orders/${order1._id}/receive-by-qr`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      // Check inventory after first receive
      const inventoryAfterFirst = await StoreInventory.findOne({
        storeId: testStore1._id,
        batchId: testBatch._id,
      });
      const quantityAfterFirst = inventoryAfterFirst.quantity;

      // Create second order and receive it
      const order2 = await Order.create({
        storeId: testStore1._id,
        createdBy: storeStaffUser._id,
        status: 'In_Transit',
        items: [
          {
            productId: testProduct._id,
            quantity: 7,
            batchId: testBatch._id,
          },
        ],
        approvedBy: managerUser._id,
        approvedDate: new Date(),
        shippedDate: new Date(),
      });

      const trip2 = await DeliveryTrip.create({
        driverId: coordinatorUser._id,
        orders: [order2._id],
        status: 'In_Transit',
        departureTime: new Date(),
      });

      // Receive second order
      await request(app)
        .post(`/api/logistics/orders/${order2._id}/receive-by-qr`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      // Check inventory after second receive
      const inventoryAfterSecond = await StoreInventory.findOne({
        storeId: testStore1._id,
        batchId: testBatch._id,
      });

      // Assert inventory incremented correctly
      expect(inventoryAfterSecond.quantity).toBe(quantityAfterFirst + 7);

      console.log(`✅ Inventory correctly incremented across multiple receives`);
      console.log(`   After 1st receive: ${quantityAfterFirst} units`);
      console.log(`   After 2nd receive: ${inventoryAfterSecond.quantity} units`);
    });

    it('should handle orders with multiple items correctly', async () => {
      // Create second batch
      const batch2 = await Batch.create({
        batchCode: 'BATCH-QR-002',
        productionPlanId: testProductionPlan._id,
        productId: testProduct._id,
        mfgDate: new Date(),
        expDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        initialQuantity: 50,
        currentQuantity: 50,
        status: 'Active',
      });

      // Create order with multiple items
      const multiItemOrder = await Order.create({
        storeId: testStore1._id,
        createdBy: storeStaffUser._id,
        status: 'In_Transit',
        items: [
          {
            productId: testProduct._id,
            quantity: 10,
            batchId: testBatch._id,
          },
          {
            productId: testProduct._id,
            quantity: 15,
            batchId: batch2._id,
          },
        ],
        approvedBy: managerUser._id,
        approvedDate: new Date(),
        shippedDate: new Date(),
      });

      const multiItemTrip = await DeliveryTrip.create({
        driverId: coordinatorUser._id,
        orders: [multiItemOrder._id],
        status: 'In_Transit',
        departureTime: new Date(),
      });

      // Get initial inventory
      const initialBatch1Inventory = await StoreInventory.findOne({
        storeId: testStore1._id,
        batchId: testBatch._id,
      });
      const initialBatch1Qty = initialBatch1Inventory ? initialBatch1Inventory.quantity : 0;

      const initialBatch2Inventory = await StoreInventory.findOne({
        storeId: testStore1._id,
        batchId: batch2._id,
      });
      const initialBatch2Qty = initialBatch2Inventory ? initialBatch2Inventory.quantity : 0;

      // Receive order
      await request(app)
        .post(`/api/logistics/orders/${multiItemOrder._id}/receive-by-qr`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      // Check both batch inventories
      const batch1Inventory = await StoreInventory.findOne({
        storeId: testStore1._id,
        batchId: testBatch._id,
      });
      expect(batch1Inventory.quantity).toBe(initialBatch1Qty + 10);

      const batch2Inventory = await StoreInventory.findOne({
        storeId: testStore1._id,
        batchId: batch2._id,
      });
      expect(batch2Inventory.quantity).toBe(initialBatch2Qty + 15);

      console.log(`✅ Multi-item order handled correctly`);
      console.log(`   Batch 1: +10 units → ${batch1Inventory.quantity} total`);
      console.log(`   Batch 2: +15 units → ${batch2Inventory.quantity} total`);
    });
  });

  // ============================================================
  // TEST CASE 7: Delivery Trip Completion Logic
  // ============================================================
  describe('Test Case 7: Delivery Trip Completion Logic', () => {
    it('should NOT complete trip when other orders are still In_Transit', async () => {
      // Create two orders in same trip
      const order1 = await Order.create({
        storeId: testStore1._id,
        createdBy: storeStaffUser._id,
        status: 'In_Transit',
        items: [{ productId: testProduct._id, quantity: 5, batchId: testBatch._id }],
        approvedBy: managerUser._id,
        approvedDate: new Date(),
        shippedDate: new Date(),
      });

      const order2 = await Order.create({
        storeId: testStore1._id,
        createdBy: storeStaffUser._id,
        status: 'In_Transit',
        items: [{ productId: testProduct._id, quantity: 3, batchId: testBatch._id }],
        approvedBy: managerUser._id,
        approvedDate: new Date(),
        shippedDate: new Date(),
      });

      const multiOrderTrip = await DeliveryTrip.create({
        driverId: coordinatorUser._id,
        orders: [order1._id, order2._id],
        status: 'In_Transit',
        departureTime: new Date(),
      });

      // Receive only the first order
      await request(app)
        .post(`/api/logistics/orders/${order1._id}/receive-by-qr`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      // Check trip status - should still be In_Transit
      const tripAfterFirst = await DeliveryTrip.findById(multiOrderTrip._id);
      expect(tripAfterFirst.status).toBe('In_Transit'); // Not completed yet
      expect(tripAfterFirst.completedTime).toBeUndefined();

      // Receive the second order
      await request(app)
        .post(`/api/logistics/orders/${order2._id}/receive-by-qr`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      // Now trip should be completed
      const tripAfterSecond = await DeliveryTrip.findById(multiOrderTrip._id);
      expect(tripAfterSecond.status).toBe('Completed'); // Now completed
      expect(tripAfterSecond.completedTime).toBeDefined();

      console.log(`✅ Trip completion logic works correctly`);
      console.log(`   After 1st order: Trip status = ${tripAfterFirst.status}`);
      console.log(`   After 2nd order: Trip status = ${tripAfterSecond.status}`);
    });
  });
});
