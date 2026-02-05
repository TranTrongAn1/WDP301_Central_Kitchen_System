/**
 * Integration Test: Feature 5 - Reject Order Endpoint
 * Tests the complete workflow for rejecting pending orders
 * 
 * Test Coverage:
 * 1. Happy Path: Manager successfully rejects a Pending order
 * 2. Fail Case: Cannot reject order with non-Pending status (Shipped)
 * 3. Fail Case: Unauthorized access (StoreStaff cannot reject orders)
 * 4. Validation: Reason field is required
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

describe('Feature 5: Reject Order - Integration Tests', () => {
  let managerToken;
  let storeStaffToken;
  let managerUser;
  let storeStaffUser;
  let managerRole;
  let storeStaffRole;
  let testStore;
  let testProduct;
  let testCategory;
  let pendingOrder;
  let shippedOrder;

  // ============================================================
  // SETUP: Initialize Database and Authentication
  // ============================================================
  beforeAll(async () => {
    // Connect to test database
    await connectDB();

    // Clear all collections
    await clearDB();

    // Create Manager Role
    managerRole = await Role.create({
      roleName: 'Manager',
    });

    // Create StoreStaff Role
    storeStaffRole = await Role.create({
      roleName: 'StoreStaff',
    });

    // Create Store
    testStore = await Store.create({
      storeName: 'Test Store',
      storeCode: 'TS001',
      address: '123 Test Street',
      phone: '0123456789',
      standardDeliveryMinutes: 30,
      status: 'Active',
    });

    // Create Manager User
    managerUser = await User.create({
      username: 'managertest',
      passwordHash: 'password123',
      fullName: 'Test Manager',
      email: 'manager@test.com',
      roleId: managerRole._id,
      isActive: true,
    });

    // Create StoreStaff User
    storeStaffUser = await User.create({
      username: 'stafftest',
      passwordHash: 'password123',
      fullName: 'Test Store Staff',
      email: 'staff@test.com',
      roleId: storeStaffRole._id,
      storeId: testStore._id,
      isActive: true,
    });

    // Login Manager to get token
    const managerLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'managertest',
        password: 'password123',
      });

    if (!managerLoginResponse.body.success || !managerLoginResponse.body.token) {
      throw new Error(`Manager login failed: ${managerLoginResponse.body.message || 'Unknown error'}`);
    }

    managerToken = managerLoginResponse.body.token;
    expect(managerToken).toBeDefined();

    // Login StoreStaff to get token
    const staffLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'stafftest',
        password: 'password123',
      });

    if (!staffLoginResponse.body.success || !staffLoginResponse.body.token) {
      throw new Error(`StoreStaff login failed: ${staffLoginResponse.body.message || 'Unknown error'}`);
    }

    storeStaffToken = staffLoginResponse.body.token;
    expect(storeStaffToken).toBeDefined();

    // Create Test Category
    testCategory = await Category.create({
      categoryName: 'Test Mooncake Category',
    });

    // Create Test Product
    testProduct = await Product.create({
      name: 'Test Mooncake',
      sku: 'TEST-001',
      categoryId: testCategory._id,
      price: 100000,
      shelfLifeDays: 30,
      unit: 'Box',
      status: 'Available',
    });

    // Create Pending Order
    pendingOrder = await Order.create({
      storeId: testStore._id,
      createdBy: storeStaffUser._id,
      status: 'Pending',
      items: [
        {
          productId: testProduct._id,
          quantity: 10,
        },
      ],
      notes: 'Test pending order',
    });

    // Create Shipped Order (for negative test)
    shippedOrder = await Order.create({
      storeId: testStore._id,
      createdBy: storeStaffUser._id,
      status: 'In_Transit',
      items: [
        {
          productId: testProduct._id,
          quantity: 5,
        },
      ],
      notes: 'Test shipped order',
      shippedDate: new Date(),
    });

    console.log('✅ Test Setup Complete - Manager and StoreStaff authenticated');
    console.log(`   Pending Order ID: ${pendingOrder._id}`);
    console.log(`   Shipped Order ID: ${shippedOrder._id}`);
  });

  afterAll(async () => {
    await clearDB();
    await closeDB();
  });

  // ============================================================
  // TEST CASE 1: Happy Path - Manager Rejects Pending Order
  // ============================================================
  describe('Test Case 1: Happy Path - Manager Rejects Pending Order', () => {
    it('should successfully reject a Pending order with reason', async () => {
      const rejectionReason = 'Out of stock';

      const response = await request(app)
        .post(`/api/logistics/orders/${pendingOrder._id}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reason: rejectionReason })
        .expect(200);

      // Assert Response
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order cancelled successfully');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.status).toBe('Cancelled');
      expect(response.body.data.cancellationReason).toBe(rejectionReason);
      expect(response.body.data).toHaveProperty('cancelledDate');

      // Verify in Database
      const orderInDB = await Order.findById(pendingOrder._id);
      expect(orderInDB).toBeDefined();
      expect(orderInDB.status).toBe('Cancelled');
      expect(orderInDB.cancellationReason).toBe(rejectionReason);
      expect(orderInDB.cancelledDate).toBeDefined();
      expect(orderInDB.cancelledDate).toBeInstanceOf(Date);

      console.log(`✅ Pending order rejected successfully`);
      console.log(`   Status: ${orderInDB.status}`);
      console.log(`   Reason: ${orderInDB.cancellationReason}`);
      console.log(`   Cancelled Date: ${orderInDB.cancelledDate}`);
    });
  });

  // ============================================================
  // TEST CASE 2: Fail Case - Cannot Reject Non-Pending Order
  // ============================================================
  describe('Test Case 2: Fail Case - Cannot Reject Shipped/In-Transit Order', () => {
    it('should return 400 when trying to reject an In_Transit order', async () => {
      const rejectionReason = 'Changed my mind';

      const response = await request(app)
        .post(`/api/logistics/orders/${shippedOrder._id}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reason: rejectionReason })
        .expect(400);

      // Assert Response
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot cancel order with status');
      expect(response.body.message).toContain('In_Transit');
      expect(response.body.message).toContain('Only Pending orders can be cancelled');

      // Verify order status unchanged in Database
      const orderInDB = await Order.findById(shippedOrder._id);
      expect(orderInDB).toBeDefined();
      expect(orderInDB.status).toBe('In_Transit'); // Status should remain unchanged
      expect(orderInDB.cancellationReason).toBeUndefined(); // No cancellation reason

      console.log(`✅ Correctly prevented rejection of In_Transit order`);
      console.log(`   Order Status: ${orderInDB.status} (unchanged)`);
    });

    it('should return 400 when trying to reject an already Cancelled order', async () => {
      // Create a cancelled order
      const cancelledOrder = await Order.create({
        storeId: testStore._id,
        createdBy: storeStaffUser._id,
        status: 'Cancelled',
        items: [
          {
            productId: testProduct._id,
            quantity: 3,
          },
        ],
        cancellationReason: 'Previously cancelled',
        cancelledDate: new Date(),
      });

      const response = await request(app)
        .post(`/api/logistics/orders/${cancelledOrder._id}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reason: 'Trying to cancel again' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot cancel order with status');
      expect(response.body.message).toContain('Cancelled');

      console.log(`✅ Correctly prevented re-rejection of already Cancelled order`);
    });
  });

  // ============================================================
  // TEST CASE 3: Fail Case - Unauthorized (StoreStaff)
  // ============================================================
  describe('Test Case 3: Fail Case - Unauthorized Access (StoreStaff)', () => {
    it('should return 403 when StoreStaff tries to reject an order', async () => {
      // Create a new pending order for this test
      const newPendingOrder = await Order.create({
        storeId: testStore._id,
        createdBy: storeStaffUser._id,
        status: 'Pending',
        items: [
          {
            productId: testProduct._id,
            quantity: 8,
          },
        ],
        notes: 'Order for unauthorized test',
      });

      const rejectionReason = 'Trying to reject as staff';

      const response = await request(app)
        .post(`/api/logistics/orders/${newPendingOrder._id}/reject`)
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .send({ reason: rejectionReason })
        .expect(403);

      // Assert Response
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');

      // Verify order status unchanged in Database
      const orderInDB = await Order.findById(newPendingOrder._id);
      expect(orderInDB).toBeDefined();
      expect(orderInDB.status).toBe('Pending'); // Status should remain Pending
      expect(orderInDB.cancellationReason).toBeUndefined(); // No cancellation reason
      expect(orderInDB.cancelledDate).toBeUndefined(); // No cancellation date

      console.log(`✅ Correctly blocked StoreStaff from rejecting order`);
      console.log(`   Order Status: ${orderInDB.status} (unchanged)`);
    });
  });

  // ============================================================
  // TEST CASE 4: Validation - Reason Field Required
  // ============================================================
  describe('Test Case 4: Validation - Reason Field Required', () => {
    it('should return 400 when reason is missing', async () => {
      // Create a new pending order for this test
      const newPendingOrder = await Order.create({
        storeId: testStore._id,
        createdBy: storeStaffUser._id,
        status: 'Pending',
        items: [
          {
            productId: testProduct._id,
            quantity: 12,
          },
        ],
        notes: 'Order for validation test',
      });

      const response = await request(app)
        .post(`/api/logistics/orders/${newPendingOrder._id}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({}) // No reason provided
        .expect(400);

      // Assert Response
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cancellation reason is required');

      // Verify order status unchanged in Database
      const orderInDB = await Order.findById(newPendingOrder._id);
      expect(orderInDB).toBeDefined();
      expect(orderInDB.status).toBe('Pending');
      expect(orderInDB.cancellationReason).toBeUndefined();

      console.log(`✅ Correctly validated required reason field`);
    });

    it('should return 400 when reason is empty string', async () => {
      // Create a new pending order for this test
      const newPendingOrder = await Order.create({
        storeId: testStore._id,
        createdBy: storeStaffUser._id,
        status: 'Pending',
        items: [
          {
            productId: testProduct._id,
            quantity: 15,
          },
        ],
        notes: 'Order for empty reason test',
      });

      const response = await request(app)
        .post(`/api/logistics/orders/${newPendingOrder._id}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reason: '   ' }) // Empty/whitespace only
        .expect(400);

      // Assert Response
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cancellation reason is required');

      // Verify order status unchanged in Database
      const orderInDB = await Order.findById(newPendingOrder._id);
      expect(orderInDB).toBeDefined();
      expect(orderInDB.status).toBe('Pending');

      console.log(`✅ Correctly rejected empty/whitespace reason`);
    });
  });

  // ============================================================
  // TEST CASE 5: Edge Cases
  // ============================================================
  describe('Test Case 5: Edge Cases', () => {
    it('should return 404 when order does not exist', async () => {
      const nonExistentOrderId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/logistics/orders/${nonExistentOrderId}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reason: 'Testing non-existent order' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Order not found');

      console.log(`✅ Correctly handled non-existent order`);
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .post(`/api/logistics/orders/${pendingOrder._id}/reject`)
        // No Authorization header
        .send({ reason: 'Testing without auth' })
        .expect(401);

      expect(response.body.success).toBe(false);

      console.log(`✅ Correctly required authentication`);
    });

    it('should handle long rejection reasons (max 500 chars)', async () => {
      // Create a new pending order
      const newPendingOrder = await Order.create({
        storeId: testStore._id,
        createdBy: storeStaffUser._id,
        status: 'Pending',
        items: [
          {
            productId: testProduct._id,
            quantity: 20,
          },
        ],
        notes: 'Order for long reason test',
      });

      const longReason = 'A'.repeat(500); // Exactly 500 characters (max allowed)

      const response = await request(app)
        .post(`/api/logistics/orders/${newPendingOrder._id}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reason: longReason })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cancellationReason).toBe(longReason);

      console.log(`✅ Successfully handled max length (500 chars) reason`);
    });
  });

  // ============================================================
  // TEST CASE 6: Database Consistency
  // ============================================================
  describe('Test Case 6: Database Consistency', () => {
    it('should maintain referential integrity after rejection', async () => {
      // Create a new pending order
      const newPendingOrder = await Order.create({
        storeId: testStore._id,
        createdBy: managerUser._id,
        status: 'Pending',
        items: [
          {
            productId: testProduct._id,
            quantity: 25,
          },
        ],
        notes: 'Order for integrity test',
      });

      await request(app)
        .post(`/api/logistics/orders/${newPendingOrder._id}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reason: 'Integrity test rejection' })
        .expect(200);

      // Verify all relationships still intact
      const orderInDB = await Order.findById(newPendingOrder._id)
        .populate('storeId')
        .populate('createdBy')
        .populate('items.productId');

      expect(orderInDB).toBeDefined();
      expect(orderInDB.storeId).toBeDefined();
      expect(orderInDB.storeId.storeName).toBe('Test Store');
      expect(orderInDB.createdBy).toBeDefined();
      expect(orderInDB.createdBy.username).toBe('managertest');
      expect(orderInDB.items[0].productId).toBeDefined();
      expect(orderInDB.items[0].productId.name).toBe('Test Mooncake');

      console.log(`✅ Referential integrity maintained after rejection`);
    });

    it('should preserve original order data after rejection', async () => {
      // Create a new pending order with specific data
      const originalNotes = 'Original notes for data preservation test';
      const newPendingOrder = await Order.create({
        storeId: testStore._id,
        createdBy: storeStaffUser._id,
        status: 'Pending',
        items: [
          {
            productId: testProduct._id,
            quantity: 30,
          },
        ],
        notes: originalNotes,
      });

      await request(app)
        .post(`/api/logistics/orders/${newPendingOrder._id}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reason: 'Data preservation test' })
        .expect(200);

      // Verify original data is preserved
      const orderInDB = await Order.findById(newPendingOrder._id);

      expect(orderInDB.notes).toBe(originalNotes); // Notes unchanged
      expect(orderInDB.items.length).toBe(1); // Items unchanged
      expect(orderInDB.items[0].quantity).toBe(30); // Quantity unchanged
      expect(orderInDB.storeId.toString()).toBe(testStore._id.toString()); // Store unchanged
      expect(orderInDB.createdBy.toString()).toBe(storeStaffUser._id.toString()); // Creator unchanged

      console.log(`✅ Original order data preserved after rejection`);
    });
  });
});
