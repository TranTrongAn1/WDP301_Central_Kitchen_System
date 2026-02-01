/**
 * Integration Test: Feature 4 - Logistics & Supply Chain
 * Tests the complete order fulfillment workflow with FEFO logic and inventory management
 * 
 * Test Coverage:
 * 1. Order Creation (Store requests products)
 * 2. Order Approval & Shipping (FEFO algorithm for batch allocation)
 * 3. Order Reception (Store inventory update)
 * 4. Traceability & Batch Tracking
 * 5. Invoice Generation
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const { connectDB, clearDB, closeDB } = require('./setup');

// Import Models
const User = require('../models/User');
const Role = require('../models/Role');
const Store = require('../models/Store');
const Supplier = require('../models/Supplier');
const Ingredient = require('../models/Ingredient');
const IngredientBatch = require('../models/IngredientBatch');
const Category = require('../models/Category');
const Product = require('../models/Product');
const ProductionPlan = require('../models/ProductionPlan');
const Batch = require('../models/BatchModel');
const Order = require('../models/Order');
const DeliveryTrip = require('../models/DeliveryTrip');
const Invoice = require('../models/Invoice');
const StoreInventory = require('../models/StoreInventory');
const SystemSetting = require('../models/SystemSetting');

describe('Feature 4: Logistics & Supply Chain - Integration Tests', () => {
  let adminToken;
  let adminUser;
  let adminRole;
  let storeId;
  let supplierId;
  let ingredientId;
  let categoryId;
  let productId;
  let productionPlanId;
  let batchAId; // Early expiry batch (will be used first by FEFO)
  let batchBId; // Late expiry batch (will be used second)
  let orderId;
  let deliveryTripId;
  let invoiceId;

  // ============================================================
  // SETUP: Initialize Database, Authentication, and Test Data
  // ============================================================
  beforeAll(async () => {
    // Connect to test database
    await connectDB();

    // Clear all collections
    await clearDB();

    console.log('🧪 Starting Feature 4: Logistics Test Suite');
    console.log('===============================================');

    // Create Admin Role
    adminRole = await Role.create({
      roleName: 'Admin',
    });

    // Create Admin User
    adminUser = await User.create({
      username: 'admintest',
      passwordHash: 'password123',
      fullName: 'Test Admin User',
      email: 'admin@test.com',
      roleId: adminRole._id,
      isActive: true,
    });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admintest',
        password: 'password123',
      });

    if (!loginResponse.body.success || !loginResponse.body.token) {
      throw new Error(`Login failed: ${loginResponse.body.message || 'Unknown error'}`);
    }

    adminToken = loginResponse.body.token;
    console.log('✅ Test Setup: Admin authenticated');

    // Seed System Settings
    await SystemSetting.create([
      {
        key: 'SHIPPING_COST_BASE',
        value: '50000',
        description: 'Base shipping cost for deliveries (VND)',
        isPublic: true,
      },
      {
        key: 'TAX_RATE',
        value: '0.08',
        description: 'Tax rate for invoices (8%)',
        isPublic: true,
      },
    ]);
    console.log('✅ Test Setup: System settings seeded (Shipping: 50000, Tax: 8%)');

    // Create Store
    const storeResponse = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        storeName: 'Central Store',
        storeCode: 'CS-001',
        address: '123 Main Street, District 1, HCMC',
        phone: '+84-28-12345678',
        standardDeliveryMinutes: 60,
        status: 'Active',
      });

    storeId = storeResponse.body.data._id;
    console.log(`✅ Test Setup: Store created (ID: ${storeId})`);

    // Create Supplier
    const supplierResponse = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Premium Flour Supplier',
        email: 'contact@flourcompany.com',
        phone: '+84-28-88888888',
        address: 'Industrial Zone, Binh Duong',
        status: 'Active',
      });

    supplierId = supplierResponse.body.data._id;
    console.log(`✅ Test Setup: Supplier created (ID: ${supplierId})`);

    // Create Ingredient "Flour"
    const ingredientResponse = await request(app)
      .post('/api/ingredients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ingredientName: 'Flour',
        unit: 'kg',
        costPrice: 20000,
        warningThreshold: 30,
      });

    ingredientId = ingredientResponse.body.data._id;
    console.log(`✅ Test Setup: Ingredient "Flour" created (Total: 0 kg)`);

    // Import Ingredient Batch A (Early Expiry - 2026-03-01, 50kg)
    const ingredientBatchAResponse = await request(app)
      .post(`/api/ingredients/${ingredientId}/batches`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: supplierId,
        batchCode: 'FLOUR-A-EARLY',
        initialQuantity: 50,
        expiryDate: '2026-03-01', // Early expiry
        price: 18000,
      });

    console.log('✅ Test Setup: Ingredient Batch A (Early Expiry 2026-03-01, 50kg) imported');

    // Import Ingredient Batch B (Late Expiry - 2026-12-31, 100kg)
    const ingredientBatchBResponse = await request(app)
      .post(`/api/ingredients/${ingredientId}/batches`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: supplierId,
        batchCode: 'FLOUR-B-LATE',
        initialQuantity: 100,
        expiryDate: '2026-12-31', // Late expiry
        price: 19000,
      });

    console.log('✅ Test Setup: Ingredient Batch B (Late Expiry 2026-12-31, 100kg) imported');
    console.log('✅ Test Setup: Total Flour Inventory = 150kg');

    // Create Category
    const categoryResponse = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        categoryName: 'Mooncake',
      });

    categoryId = categoryResponse.body.data._id;
    console.log('✅ Test Setup: Category "Mooncake" created');

    // Create Product "Mooncake" with Recipe (1 cake = 0.5kg Flour)
    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Traditional Mooncake',
        sku: 'MOON-001',
        categoryId: categoryId,
        price: 150000,
        shelfLifeDays: 30,
        recipe: [
          {
            ingredientId: ingredientId,
            quantity: 0.5, // Each mooncake requires 0.5kg of flour
          },
        ],
      });

    productId = productResponse.body.data._id;
    console.log('✅ Test Setup: Product "Mooncake" created (Recipe: 1 cake = 0.5kg Flour, Price: 150,000 VND)');

    // Create Production Plan to make 100 Mooncakes
    const planResponse = await request(app)
      .post('/api/production')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        planCode: 'PLAN-2026-LOG-001',
        planDate: '2026-01-29',
        note: 'Production for logistics testing - FEFO validation',
        details: [
          {
            productId: productId,
            plannedQuantity: 100,
          },
        ],
      });

    productionPlanId = planResponse.body.data._id;
    console.log('✅ Test Setup: Production Plan created (100 Mooncakes planned)');

    // Complete Production (This will create 2 batches of Mooncakes using FEFO)
    const productionResponse = await request(app)
      .post(`/api/production/${productionPlanId}/complete-item`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: productId,
        actualQuantity: 100, // Produce 100 mooncakes
      });

    expect(productionResponse.status).toBeGreaterThanOrEqual(200);
    expect(productionResponse.status).toBeLessThan(300);
    console.log('✅ Test Setup: Production completed (100 Mooncakes manufactured)');

    // Fetch the created product batches
    const batchesResponse = await request(app)
      .get('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ productId: productId });

    const batches = batchesResponse.body.data;
    expect(batches.length).toBeGreaterThanOrEqual(1);

    // Sort batches by expiry date to identify which is which
    batches.sort((a, b) => new Date(a.expDate) - new Date(b.expDate));
    
    batchAId = batches[0]._id; // Earlier expiry
    batchBId = batches.length > 1 ? batches[1]._id : batches[0]._id; // Later expiry

    console.log(`✅ Test Setup: Product Batch A (Early Expiry) ID: ${batchAId}`);
    console.log(`✅ Test Setup: Product Batch B (Late Expiry) ID: ${batchBId}`);
    console.log('===============================================\n');
  });

  afterAll(async () => {
    await clearDB();
    await closeDB();
  });

  // ============================================================
  // TEST CASE 1: Store Creates Order for 50 Mooncakes
  // ============================================================
  describe('Test Case 1: Store Creates Order', () => {
    it('should create an order for 50 Mooncakes successfully', async () => {
      const orderData = {
        orderNumber: 'ORD-2026-001',
        storeId: storeId,
        requestedDeliveryDate: '2026-02-05',
        items: [
          {
            productId: productId,
            batchId: batchAId, // Initially request from Batch A
            quantity: 50,
          },
        ],
        notes: 'Test order for logistics workflow',
      };

      const response = await request(app)
        .post('/api/logistics/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderData);

      if (response.status !== 201) {
        console.log('❌ Order creation failed - Status:', response.status);
        console.log('Error:', response.body);
        throw new Error(`Order creation failed with status ${response.status}: ${JSON.stringify(response.body)}`);
      }

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.orderNumber).toBe('ORD-2026-001');
      expect(response.body.data.status).toBe('Pending');
      expect(response.body.data.orderItems).toHaveLength(1);
      expect(response.body.data.orderItems[0].quantity).toBe(50);
      expect(response.body.data.orderItems[0].unitPrice).toBe(150000);
      expect(response.body.data.totalAmount).toBe(50 * 150000); // 7,500,000 VND

      orderId = response.body.data._id;

      console.log('✅ Test Case 1: Order created successfully');
      console.log(`   Order ID: ${orderId}`);
      console.log(`   Status: ${response.body.data.status}`);
      console.log(`   Total Amount: ${response.body.data.totalAmount.toLocaleString()} VND`);
    });

    it('should retrieve the created order', async () => {
      const response = await request(app)
        .get(`/api/logistics/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('Pending');
      expect(response.body.data.orderNumber).toBe('ORD-2026-001');
    });
  });

  // ============================================================
  // TEST CASE 2: Kitchen Approves Order (FEFO Algorithm Test)
  // ============================================================
  describe('Test Case 2: Kitchen Approves and Ships Order (FEFO Validation)', () => {
    it('should approve and ship the order using FEFO algorithm', async () => {
      const approvalData = {
        tripNumber: 'TRIP-2026-001',
        vehicleNumber: 'TRUCK-001',
        notes: 'Test delivery trip',
      };

      const response = await request(app)
        .post(`/api/logistics/orders/${orderId}/approve-ship`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(approvalData);

      if (response.status !== 200) {
        console.log('❌ Order approval failed - Status:', response.status);
        console.log('Error:', response.body);
        throw new Error(`Order approval failed with status ${response.status}: ${JSON.stringify(response.body)}`);
      }

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('approved and shipped successfully');
      
      // Check Order Status
      expect(response.body.data.order.status).toBe('Shipped');
      expect(response.body.data.order.approvedBy).toBeDefined();
      expect(response.body.data.order.approvedAt).toBeDefined();

      // Check DeliveryTrip Created
      expect(response.body.data.deliveryTrip).toBeDefined();
      expect(response.body.data.deliveryTrip.tripNumber).toBe('TRIP-2026-001');
      expect(response.body.data.deliveryTrip.status).toBe('In_Transit');
      expect(response.body.data.deliveryTrip.exportDetails).toBeDefined();
      expect(response.body.data.deliveryTrip.exportDetails.length).toBeGreaterThan(0);

      deliveryTripId = response.body.data.deliveryTrip._id;

      // Check Invoice Created
      expect(response.body.data.invoice).toBeDefined();
      expect(response.body.data.invoice.invoiceNumber).toContain('INV-ORD-2026-001');
      expect(response.body.data.invoice.paymentStatus).toBe('Pending');
      
      invoiceId = response.body.data.invoice._id;

      console.log('✅ Test Case 2: Order approved and shipped');
      console.log(`   Delivery Trip ID: ${deliveryTripId}`);
      console.log(`   Delivery Status: ${response.body.data.deliveryTrip.status}`);
      console.log(`   Invoice ID: ${invoiceId}`);
      console.log(`   Batches Updated: ${response.body.data.batchesUpdated}`);
    });

    it('should verify FEFO algorithm - Batch A (early expiry) was deducted first', async () => {
      // Fetch Batch A details
      const batchAResponse = await request(app)
        .get(`/api/batches/${batchAId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const batchA = batchAResponse.body.data;
      
      // Batch A should have been deducted (initial: 100, should be less now)
      // Since we ordered 50 mooncakes, and FEFO should use the earliest batch first
      expect(batchA.currentQuantity).toBeLessThan(batchA.initialQuantity);

      console.log('✅ FEFO Verification: Batch A deducted first');
      console.log(`   Batch A Initial: ${batchA.initialQuantity}, Current: ${batchA.currentQuantity}`);
      console.log(`   Batch A Expiry: ${new Date(batchA.expDate).toLocaleDateString()}`);
    });

    it('should verify exportDetails contain correct batch traceability', async () => {
      const deliveryTripResponse = await request(app)
        .get(`/api/logistics/trips/${deliveryTripId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const trip = deliveryTripResponse.body.data;
      
      expect(trip.exportDetails).toBeDefined();
      expect(trip.exportDetails.length).toBeGreaterThan(0);

      // Verify export details have proper structure
      trip.exportDetails.forEach((detail) => {
        expect(detail).toHaveProperty('productId');
        expect(detail).toHaveProperty('batchId');
        expect(detail).toHaveProperty('quantity');
        expect(detail.quantity).toBeGreaterThan(0);
      });

      // Calculate total quantity exported
      const totalExported = trip.exportDetails.reduce(
        (sum, detail) => sum + detail.quantity,
        0
      );
      expect(totalExported).toBe(50); // Should match order quantity

      console.log('✅ Export Details Verification Passed');
      console.log(`   Total Items Exported: ${totalExported}`);
      console.log(`   Number of Batch Allocations: ${trip.exportDetails.length}`);
    });

    it('should verify order status changed to Shipped', async () => {
      const orderResponse = await request(app)
        .get(`/api/logistics/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(orderResponse.body.data.status).toBe('Shipped');
      expect(orderResponse.body.data.approvedBy).toBeDefined();
      expect(orderResponse.body.data.approvedAt).toBeDefined();

      console.log('✅ Order Status Updated: Shipped');
    });
  });

  // ============================================================
  // TEST CASE 3: Store Receives the Order
  // ============================================================
  describe('Test Case 3: Store Receives Order and Inventory Update', () => {
    it('should receive the order and update store inventory', async () => {
      const response = await request(app)
        .post(`/api/logistics/trips/${deliveryTripId}/receive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('received successfully');

      // Check DeliveryTrip Status
      expect(response.body.data.deliveryTrip.status).toBe('Completed');
      expect(response.body.data.deliveryTrip.actualArrival).toBeDefined();

      // Check Order Status
      expect(response.body.data.order.status).toBe('Received');

      // Check Inventory Updates
      expect(response.body.data.inventoryUpdates).toBeDefined();
      expect(response.body.data.inventoryUpdates.length).toBeGreaterThan(0);
      expect(response.body.data.itemsReceived).toBe(response.body.data.inventoryUpdates.length);

      console.log('✅ Test Case 3: Order received at store');
      console.log(`   Delivery Status: ${response.body.data.deliveryTrip.status}`);
      console.log(`   Order Status: ${response.body.data.order.status}`);
      console.log(`   Items Received: ${response.body.data.itemsReceived}`);
    });

    it('should verify StoreInventory has 50 Mooncakes with correct batch IDs', async () => {
      // Query store inventory for this store and product
      const inventory = await StoreInventory.find({
        storeId: storeId,
        productId: productId,
      }).populate('batchId');

      expect(inventory.length).toBeGreaterThan(0);

      // Calculate total quantity in store inventory
      const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
      expect(totalQuantity).toBe(50); // Should have 50 mooncakes total

      console.log('✅ Store Inventory Verification Passed');
      console.log(`   Total Mooncakes in Store: ${totalQuantity}`);
      console.log(`   Number of Batch Records: ${inventory.length}`);

      // Log batch details
      inventory.forEach((item, index) => {
        console.log(`   Batch ${index + 1}: ${item.batchId.batchCode}, Quantity: ${item.quantity}, Expiry: ${new Date(item.batchId.expDate).toLocaleDateString()}`);
      });
    });

    it('should verify order status is Received', async () => {
      const orderResponse = await request(app)
        .get(`/api/logistics/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(orderResponse.body.data.status).toBe('Received');

      console.log('✅ Order Status Updated: Received');
    });

    it('should verify delivery trip status is Completed', async () => {
      const tripResponse = await request(app)
        .get(`/api/logistics/trips/${deliveryTripId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(tripResponse.body.data.status).toBe('Completed');
      expect(tripResponse.body.data.actualArrival).toBeDefined();

      console.log('✅ Delivery Trip Status: Completed');
    });

    it('should verify invoice is in Pending status (ready for payment)', async () => {
      const invoiceResponse = await request(app)
        .get(`/api/logistics/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(invoiceResponse.body.data.paymentStatus).toBe('Pending');
      expect(invoiceResponse.body.data.totalAmount).toBeGreaterThan(0);
      expect(invoiceResponse.body.data.subtotal).toBeGreaterThan(0);

      console.log('✅ Invoice Status: Pending (Ready for Payment)');
      console.log(`   Subtotal: ${invoiceResponse.body.data.subtotal.toLocaleString()} VND`);
      console.log(`   Tax: ${invoiceResponse.body.data.taxAmount.toLocaleString()} VND`);
      console.log(`   Total: ${invoiceResponse.body.data.totalAmount.toLocaleString()} VND`);
    });
  });

  // ============================================================
  // TEST CASE 4: End-to-End Traceability Verification
  // ============================================================
  describe('Test Case 4: End-to-End Traceability', () => {
    it('should verify complete traceability chain', async () => {
      // 1. Check Order
      const order = await Order.findById(orderId)
        .populate('orderItems.productId')
        .populate('orderItems.batchId');

      expect(order).toBeDefined();
      expect(order.status).toBe('Received');

      // 2. Check DeliveryTrip with exportDetails
      const deliveryTrip = await DeliveryTrip.findById(deliveryTripId)
        .populate('exportDetails.productId')
        .populate('exportDetails.batchId');

      expect(deliveryTrip).toBeDefined();
      expect(deliveryTrip.status).toBe('Completed');
      expect(deliveryTrip.exportDetails.length).toBeGreaterThan(0);

      // 3. Check StoreInventory
      const storeInventory = await StoreInventory.find({
        storeId: storeId,
        productId: productId,
      }).populate('batchId');

      expect(storeInventory.length).toBeGreaterThan(0);

      // 4. Check Invoice
      const invoice = await Invoice.findById(invoiceId);
      expect(invoice).toBeDefined();
      expect(invoice.orderId.toString()).toBe(orderId.toString());

      console.log('✅ End-to-End Traceability Verified');
      console.log('   ✓ Order tracked from creation to reception');
      console.log('   ✓ Delivery trip with batch-level export details');
      console.log('   ✓ Store inventory updated with specific batches');
      console.log('   ✓ Invoice generated and linked to order');
    });
  });

  // ============================================================
  // TEST CASE 5: Negative Test Cases
  // ============================================================
  describe('Test Case 5: Validation & Negative Tests', () => {
    it('should reject order approval if order is not in Pending status', async () => {
      const response = await request(app)
        .post(`/api/logistics/orders/${orderId}/approve-ship`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tripNumber: 'TRIP-2026-002',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Pending');

      console.log('✅ Validation: Cannot approve non-Pending orders');
    });

    it('should reject receiving if delivery trip is not In_Transit', async () => {
      const response = await request(app)
        .post(`/api/logistics/trips/${deliveryTripId}/receive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('In_Transit');

      console.log('✅ Validation: Cannot receive non-In_Transit deliveries');
    });

    it('should reject order with insufficient inventory', async () => {
      // Try to create order for 1000 mooncakes (more than available)
      const response = await request(app)
        .post('/api/logistics/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderNumber: 'ORD-2026-999',
          storeId: storeId,
          requestedDeliveryDate: '2026-02-10',
          items: [
            {
              productId: productId,
              batchId: batchAId,
              quantity: 1000, // Way more than available
            },
          ],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient stock');

      console.log('✅ Validation: Insufficient inventory check passed');
    });
  });
});
