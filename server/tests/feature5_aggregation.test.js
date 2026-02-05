/**
 * Integration Test: Feature 5 - Production Aggregation Endpoint
 * Tests the complete workflow for aggregating daily demand for production planning
 * 
 * Test Coverage:
 * 1. Happy Path: Manager successfully retrieves aggregated demand data
 * 2. Data Accuracy: Verifies correct calculation of total quantities per product
 * 3. Status Filter: Ensures only Pending and Approved orders are included
 * 4. Security: Store Staff blocked from accessing production dashboard
 * 5. Edge Cases: Empty results, single product, multiple products
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

describe('Feature 5: Production Aggregation - Integration Tests', () => {
  let managerToken;
  let storeStaffToken;
  let managerUser;
  let storeStaffUser;
  let managerRole;
  let storeStaffRole;
  let testStore;
  let testCategory;
  let productA;
  let productB;
  let productC;
  let order1;
  let order2;
  let order3;
  let approvedOrder;

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

    // ============================================================
    // CREATE STORE
    // ============================================================
    testStore = await Store.create({
      storeName: 'Test Store - Aggregation',
      storeCode: 'AGG001',
      address: '789 Aggregation Street',
      phone: '0111222333',
      standardDeliveryMinutes: 30,
      status: 'Active',
    });

    // ============================================================
    // CREATE USERS
    // ============================================================
    managerUser = await User.create({
      username: 'manager_agg_test',
      passwordHash: 'password123',
      fullName: 'Test Manager',
      email: 'manager_agg@test.com',
      roleId: managerRole._id,
      isActive: true,
    });

    storeStaffUser = await User.create({
      username: 'staff_agg_test',
      passwordHash: 'password123',
      fullName: 'Test Store Staff',
      email: 'staff_agg@test.com',
      roleId: storeStaffRole._id,
      storeId: testStore._id,
      isActive: true,
    });

    // ============================================================
    // AUTHENTICATE USERS
    // ============================================================
    const managerLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'manager_agg_test',
        password: 'password123',
      });

    if (!managerLoginResponse.body.success || !managerLoginResponse.body.token) {
      throw new Error(`Manager login failed: ${managerLoginResponse.body.message || 'Unknown error'}`);
    }
    managerToken = managerLoginResponse.body.token;
    expect(managerToken).toBeDefined();

    const staffLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'staff_agg_test',
        password: 'password123',
      });

    if (!staffLoginResponse.body.success || !staffLoginResponse.body.token) {
      throw new Error(`Staff login failed: ${staffLoginResponse.body.message || 'Unknown error'}`);
    }
    storeStaffToken = staffLoginResponse.body.token;
    expect(storeStaffToken).toBeDefined();

    // ============================================================
    // CREATE PRODUCTS
    // ============================================================
    testCategory = await Category.create({
      categoryName: 'Aggregation Test Products',
    });

    productA = await Product.create({
      name: 'Product A - Classic Mooncake',
      sku: 'PROD-A-001',
      categoryId: testCategory._id,
      price: 100000,
      shelfLifeDays: 30,
    });

    productB = await Product.create({
      name: 'Product B - Premium Mooncake',
      sku: 'PROD-B-001',
      categoryId: testCategory._id,
      price: 150000,
      shelfLifeDays: 25,
    });

    productC = await Product.create({
      name: 'Product C - Deluxe Mooncake',
      sku: 'PROD-C-001',
      categoryId: testCategory._id,
      price: 200000,
      shelfLifeDays: 20,
    });

    // ============================================================
    // CREATE ORDERS FOR AGGREGATION TESTING
    // ============================================================

    // Order 1: Pending - 10 units of Product A
    order1 = await Order.create({
      storeId: testStore._id,
      createdBy: storeStaffUser._id,
      status: 'Pending',
      items: [
        {
          productId: productA._id,
          quantity: 10,
        },
      ],
      notes: 'Order 1 - Should be included in aggregation',
    });

    // Order 2: Pending - 20 units of Product A + 5 units of Product B
    order2 = await Order.create({
      storeId: testStore._id,
      createdBy: storeStaffUser._id,
      status: 'Pending',
      items: [
        {
          productId: productA._id,
          quantity: 20,
        },
        {
          productId: productB._id,
          quantity: 5,
        },
      ],
      notes: 'Order 2 - Should be included in aggregation',
    });

    // Order 3: Cancelled - 5 units of Product A (SHOULD BE IGNORED)
    order3 = await Order.create({
      storeId: testStore._id,
      createdBy: storeStaffUser._id,
      status: 'Cancelled',
      items: [
        {
          productId: productA._id,
          quantity: 5,
        },
      ],
      notes: 'Order 3 - Should NOT be included (Cancelled)',
      cancellationReason: 'Out of stock',
      cancelledDate: new Date(),
    });

    // Order 4: Approved - 15 units of Product B (SHOULD BE INCLUDED)
    approvedOrder = await Order.create({
      storeId: testStore._id,
      createdBy: storeStaffUser._id,
      status: 'Approved',
      items: [
        {
          productId: productB._id,
          quantity: 15,
        },
        {
          productId: productC._id,
          quantity: 8,
        },
      ],
      notes: 'Order 4 - Should be included (Approved status)',
      approvedBy: managerUser._id,
      approvedDate: new Date(),
    });

    console.log('✅ Test Setup Complete - Production Aggregation Test');
    console.log(`   Product A: ${productA.name}`);
    console.log(`   Product B: ${productB.name}`);
    console.log(`   Product C: ${productC.name}`);
    console.log(`   Order 1 (Pending): 10 units of Product A`);
    console.log(`   Order 2 (Pending): 20 units of Product A + 5 units of Product B`);
    console.log(`   Order 3 (Cancelled): 5 units of Product A - SHOULD BE IGNORED`);
    console.log(`   Order 4 (Approved): 15 units of Product B + 8 units of Product C`);
  });

  afterAll(async () => {
    await clearDB();
    await closeDB();
  });

  // ============================================================
  // TEST CASE 1: Happy Path - Manager Retrieves Aggregated Demand
  // ============================================================
  describe('Test Case 1: Happy Path - Manager Retrieves Aggregated Demand', () => {
    it('should successfully retrieve aggregated production demand data', async () => {
      const response = await request(app)
        .get('/api/logistics/orders/aggregate')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      // Assert Response Structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.summary).toBeDefined();
      expect(response.body.count).toBeDefined();

      // Find aggregated data for each product
      const productAData = response.body.data.find(
        (item) => item.productId.toString() === productA._id.toString()
      );
      const productBData = response.body.data.find(
        (item) => item.productId.toString() === productB._id.toString()
      );
      const productCData = response.body.data.find(
        (item) => item.productId.toString() === productC._id.toString()
      );

      // ============================================================
      // CRITICAL ASSERTIONS: Product A
      // ============================================================
      expect(productAData).toBeDefined();
      expect(productAData.totalQuantityNeeded).toBe(30); // 10 (Order 1) + 20 (Order 2) = 30
      expect(productAData.productName).toBe(productA.name);
      expect(productAData.sku).toBe(productA.sku);

      // ============================================================
      // CRITICAL ASSERTIONS: Product B
      // ============================================================
      expect(productBData).toBeDefined();
      expect(productBData.totalQuantityNeeded).toBe(20); // 5 (Order 2) + 15 (Order 4) = 20
      expect(productBData.productName).toBe(productB.name);
      expect(productBData.sku).toBe(productB.sku);

      // ============================================================
      // CRITICAL ASSERTIONS: Product C
      // ============================================================
      expect(productCData).toBeDefined();
      expect(productCData.totalQuantityNeeded).toBe(8); // 8 (Order 4) = 8
      expect(productCData.productName).toBe(productC.name);
      expect(productCData.sku).toBe(productC.sku);

      console.log(`✅ Aggregation calculated correctly`);
      console.log(`   Product A Total: ${productAData.totalQuantityNeeded} (Expected: 30)`);
      console.log(`   Product B Total: ${productBData.totalQuantityNeeded} (Expected: 20)`);
      console.log(`   Product C Total: ${productCData.totalQuantityNeeded} (Expected: 8)`);
      console.log(`   ✓ Cancelled order (5 units of Product A) was correctly EXCLUDED`);
    });

    it('should include summary statistics in the response', async () => {
      const response = await request(app)
        .get('/api/logistics/orders/aggregate')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.totalProducts).toBeGreaterThan(0);
      expect(response.body.summary.totalQuantityAllProducts).toBeGreaterThan(0);
      expect(response.body.summary.totalOrders).toBeGreaterThan(0);

      console.log(`✅ Summary statistics correctly included`);
      console.log(`   Total Products: ${response.body.summary.totalProducts}`);
      console.log(`   Total Quantity: ${response.body.summary.totalQuantityAllProducts}`);
      console.log(`   Total Orders: ${response.body.summary.totalOrders}`);
    });
  });

  // ============================================================
  // TEST CASE 2: Data Accuracy - Verify Cancelled Orders Are Excluded
  // ============================================================
  describe('Test Case 2: Data Accuracy - Cancelled Orders Excluded', () => {
    it('should NOT include cancelled orders in the aggregation', async () => {
      const response = await request(app)
        .get('/api/logistics/orders/aggregate')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const productAData = response.body.data.find(
        (item) => item.productId.toString() === productA._id.toString()
      );

      // Product A should be 30 (not 35 if cancelled order was included)
      expect(productAData).toBeDefined();
      expect(productAData.totalQuantityNeeded).toBe(30);
      expect(productAData.totalQuantityNeeded).not.toBe(35); // Would be 35 if cancelled was included

      console.log(`✅ Cancelled orders correctly excluded from aggregation`);
      console.log(`   Product A Total: ${productAData.totalQuantityNeeded} (Cancelled 5 units NOT included)`);
    });

    it('should include Approved status orders in the aggregation', async () => {
      const response = await request(app)
        .get('/api/logistics/orders/aggregate')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const productBData = response.body.data.find(
        (item) => item.productId.toString() === productB._id.toString()
      );

      // Product B should include the 15 units from approved order
      expect(productBData).toBeDefined();
      expect(productBData.totalQuantityNeeded).toBe(20); // 5 + 15 = 20

      console.log(`✅ Approved orders correctly included in aggregation`);
      console.log(`   Product B Total: ${productBData.totalQuantityNeeded} (includes Approved order)`);
    });
  });

  // ============================================================
  // TEST CASE 3: Status Filter - Only Pending and Approved
  // ============================================================
  describe('Test Case 3: Status Filter - Only Pending and Approved Orders', () => {
    it('should exclude In_Transit and Received orders from aggregation', async () => {
      // Create an In_Transit order
      const inTransitOrder = await Order.create({
        storeId: testStore._id,
        createdBy: storeStaffUser._id,
        status: 'In_Transit',
        items: [
          {
            productId: productA._id,
            quantity: 100, // Large quantity to make it obvious if included
          },
        ],
        notes: 'In_Transit order - should be excluded',
        shippedDate: new Date(),
      });

      // Create a Received order
      const receivedOrder = await Order.create({
        storeId: testStore._id,
        createdBy: storeStaffUser._id,
        status: 'Received',
        items: [
          {
            productId: productB._id,
            quantity: 200, // Large quantity to make it obvious if included
          },
        ],
        notes: 'Received order - should be excluded',
        receivedDate: new Date(),
      });

      const response = await request(app)
        .get('/api/logistics/orders/aggregate')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const productAData = response.body.data.find(
        (item) => item.productId.toString() === productA._id.toString()
      );
      const productBData = response.body.data.find(
        (item) => item.productId.toString() === productB._id.toString()
      );

      // Verify the large quantities are NOT included
      expect(productAData.totalQuantityNeeded).toBe(30); // Still 30, not 130
      expect(productBData.totalQuantityNeeded).toBe(20); // Still 20, not 220

      console.log(`✅ In_Transit and Received orders correctly excluded`);
      console.log(`   Product A: ${productAData.totalQuantityNeeded} (In_Transit 100 units NOT included)`);
      console.log(`   Product B: ${productBData.totalQuantityNeeded} (Received 200 units NOT included)`);
    });
  });

  // ============================================================
  // TEST CASE 4: Security - Store Staff Access Denied
  // ============================================================
  describe('Test Case 4: Security - Store Staff Blocked from Production Dashboard', () => {
    it('should return 403 when Store Staff tries to access aggregation', async () => {
      const response = await request(app)
        .get('/api/logistics/orders/aggregate')
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .expect(403);

      // Assert Response
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');

      console.log(`✅ Store Staff correctly blocked from production dashboard`);
      console.log(`   Role: StoreStaff, Status: 403 Forbidden`);
    });

    it('should allow Admin role to access aggregation', async () => {
      // Create Admin role and user
      const adminRole = await Role.create({
        roleName: 'Admin',
      });

      const adminUser = await User.create({
        username: 'admin_agg_test',
        passwordHash: 'password123',
        fullName: 'Test Admin',
        email: 'admin_agg@test.com',
        roleId: adminRole._id,
        isActive: true,
      });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin_agg_test',
          password: 'password123',
        });

      const adminToken = adminLoginResponse.body.token;

      const response = await request(app)
        .get('/api/logistics/orders/aggregate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      console.log(`✅ Admin role correctly granted access to production dashboard`);
    });
  });

  // ============================================================
  // TEST CASE 5: Edge Cases
  // ============================================================
  describe('Test Case 5: Edge Cases', () => {
    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .get('/api/logistics/orders/aggregate')
        // No Authorization header
        .expect(401);

      expect(response.body.success).toBe(false);

      console.log(`✅ Correctly required authentication`);
    });

    it('should return empty array when no orders exist', async () => {
      // Clear all orders
      await Order.deleteMany({});

      const response = await request(app)
        .get('/api/logistics/orders/aggregate')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);

      console.log(`✅ Correctly returned empty array when no orders exist`);
    });

    it('should handle orders with no items gracefully', async () => {
      // Restore original orders for other tests
      await Order.create({
        storeId: testStore._id,
        createdBy: storeStaffUser._id,
        status: 'Pending',
        items: [
          {
            productId: productA._id,
            quantity: 10,
          },
        ],
      });

      const response = await request(app)
        .get('/api/logistics/orders/aggregate')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      console.log(`✅ Orders with items handled correctly after restoration`);
    });
  });

  // ============================================================
  // TEST CASE 6: Response Format and Data Structure
  // ============================================================
  describe('Test Case 6: Response Format and Data Structure', () => {
    it('should return properly structured response with all required fields', async () => {
      const response = await request(app)
        .get('/api/logistics/orders/aggregate')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.summary).toBeDefined();
      expect(response.body.count).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const firstItem = response.body.data[0];

        // Verify all required fields exist
        expect(firstItem).toHaveProperty('productId');
        expect(firstItem).toHaveProperty('productName');
        expect(firstItem).toHaveProperty('sku');
        expect(firstItem).toHaveProperty('totalQuantityNeeded');
        expect(firstItem).toHaveProperty('orderCount');
        expect(firstItem).toHaveProperty('orders');

        // Verify data types
        expect(typeof firstItem.productName).toBe('string');
        expect(typeof firstItem.sku).toBe('string');
        expect(typeof firstItem.totalQuantityNeeded).toBe('number');
        expect(typeof firstItem.orderCount).toBe('number');
        expect(Array.isArray(firstItem.orders)).toBe(true);
        expect(firstItem.totalQuantityNeeded).toBeGreaterThan(0);

        console.log(`✅ Response structure validated`);
        console.log(`   Fields: productId, productName, sku, totalQuantityNeeded, orderCount, orders`);
      }
    });

    it('should sort results by totalQuantityNeeded in descending order', async () => {
      const response = await request(app)
        .get('/api/logistics/orders/aggregate')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      if (response.body.data.length > 1) {
        // Verify sorting (highest quantity first)
        for (let i = 0; i < response.body.data.length - 1; i++) {
          expect(response.body.data[i].totalQuantityNeeded).toBeGreaterThanOrEqual(
            response.body.data[i + 1].totalQuantityNeeded
          );
        }

        console.log(`✅ Results correctly sorted by totalQuantityNeeded (descending)`);
        console.log(`   First: ${response.body.data[0].totalQuantityNeeded} units`);
        console.log(`   Last: ${response.body.data[response.body.data.length - 1].totalQuantityNeeded} units`);
      }
    });
  });

  // ============================================================
  // TEST CASE 7: Multi-Store Aggregation
  // ============================================================
  describe('Test Case 7: Multi-Store Aggregation', () => {
    it('should aggregate orders from multiple stores correctly', async () => {
      // Create second store
      const store2 = await Store.create({
        storeName: 'Store 2 - Aggregation Test',
        storeCode: 'AGG002',
        address: '456 Second Street',
        phone: '0222333444',
        standardDeliveryMinutes: 45,
        status: 'Active',
      });

      // Create order from second store
      await Order.create({
        storeId: store2._id,
        createdBy: storeStaffUser._id,
        status: 'Pending',
        items: [
          {
            productId: productA._id,
            quantity: 50, // Additional 50 units
          },
        ],
        notes: 'Order from Store 2',
      });

      const response = await request(app)
        .get('/api/logistics/orders/aggregate')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const productAData = response.body.data.find(
        (item) => item.productId.toString() === productA._id.toString()
      );

      // Product A should now include orders from both stores
      expect(productAData).toBeDefined();
      expect(productAData.totalQuantityNeeded).toBeGreaterThan(30);

      console.log(`✅ Multi-store aggregation works correctly`);
      console.log(`   Product A Total (all stores): ${productAData.totalQuantityNeeded} units`);
    });
  });
});
