const request = require('supertest');
const app = require('../app');
const Role = require('../models/Role');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const ProductionPlan = require('../models/ProductionPlan');
const Batch = require('../models/BatchModel');

/**
 * Integration Tests for Feature 3: Production & Batch Management
 * 
 * This test suite covers:
 * 1. Authentication flow
 * 2. Production plan creation
 * 3. Complete production item (auto-create batch)
 * 4. Batch expiration date calculation
 * 5. Database verification
 */
describe('Production & Batch Management Integration Tests', () => {
  let authToken;
  let kitchenUser;
  let testCategory;
  let testProduct;
  let testPlan;

  // Clean up before each test to ensure fresh start
  beforeEach(async () => {
    // Clear all existing data before each test
    await Role.deleteMany({});
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await ProductionPlan.deleteMany({});
    await Batch.deleteMany({});
  });

  // Helper function to create test data
  const setupTestData = async () => {
    // Create Role
    const kitchenRole = await Role.create({
      roleName: 'KitchenStaff',
    });

    // Create User (Kitchen Staff)
    kitchenUser = await User.create({
      username: 'test_kitchen',
      passwordHash: 'test123',
      fullName: 'Test Kitchen Staff',
      email: 'test_kitchen@test.com',
      roleId: kitchenRole._id,
      isActive: true,
    });

    // Create Category
    testCategory = await Category.create({
      name: 'Test Category',
      description: 'Category for testing',
    });

    // Create Product with 10 days shelf life
    testProduct = await Product.create({
      name: 'Test Mooncake',
      sku: 'TEST-MOON-001',
      categoryId: testCategory._id,
      price: 100000,
      shelfLifeDays: 10, // 10 days shelf life for testing
      recipe: [],
      bundleItems: [],
    });
  };

  /**
   * SCENARIO 1: Authentication
   * Test that we can login and get a valid JWT token
   */
  describe('Scenario 1: Authentication', () => {
    beforeEach(async () => {
      await setupTestData();
    });

    it('should login as Kitchen Staff and receive JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test_kitchen',
          password: 'test123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.role).toBe('KitchenStaff');

      // Save token for subsequent tests
      authToken = response.body.token;
    });
  });

  /**
   * SCENARIO 2: Create Production Plan
   * Test creating a new production plan
   */
  describe('Scenario 2: Create Production Plan', () => {
    beforeEach(async () => {
      await setupTestData();
      
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test_kitchen',
          password: 'test123',
        });
      authToken = loginResponse.body.token;
    });

    it('should create a production plan successfully', async () => {
      const response = await request(app)
        .post('/api/production')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planCode: 'TEST-PLAN-001',
          planDate: new Date(),
          note: 'Test production plan',
          details: [
            {
              productId: testProduct._id.toString(),
              plannedQuantity: 100,
            },
          ],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.planCode).toBe('TEST-PLAN-001');
      expect(response.body.data.status).toBe('Planned');
      expect(response.body.data.details).toHaveLength(1);
      expect(response.body.data.details[0].plannedQuantity).toBe(100);

      // Save plan for subsequent tests
      testPlan = response.body.data;
    });

    it('should fail to create plan without authentication', async () => {
      await request(app)
        .post('/api/production')
        .send({
          planCode: 'TEST-PLAN-002',
          details: [
            {
              productId: testProduct._id.toString(),
              plannedQuantity: 100,
            },
          ],
        })
        .expect(401);
    });
  });

  /**
   * SCENARIO 3 & 4: Complete Production Item (Core Test)
   * Test the auto-batch creation logic with expiration date calculation
   */
  describe('Scenario 3-4: Complete Production Item and Auto-Create Batch', () => {
    beforeEach(async () => {
      await setupTestData();
      
      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test_kitchen',
          password: 'test123',
        });
      authToken = loginResponse.body.token;

      // Create production plan
      const planResponse = await request(app)
        .post('/api/production')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planCode: 'TEST-PLAN-003',
          planDate: new Date(),
          note: 'Test plan for batch creation',
          details: [
            {
              productId: testProduct._id.toString(),
              plannedQuantity: 100,
            },
          ],
        });
      testPlan = planResponse.body.data;
    });

    it('should complete production item and auto-create batch with correct expDate', async () => {
      const actualQuantity = 95;
      const mfgDate = new Date();
      const expectedExpDate = new Date(mfgDate);
      expectedExpDate.setDate(expectedExpDate.getDate() + 10); // Product has 10 days shelf life

      const response = await request(app)
        .post(`/api/production/${testPlan._id}/complete-item`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          actualQuantity: actualQuantity,
        })
        .expect(201);

      // Assertions
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('batch created successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.batch).toBeDefined();
      expect(response.body.data.plan).toBeDefined();

      const batch = response.body.data.batch;

      // Check batch code format: BATCH-YYYYMMDD-SKU
      expect(batch.batchCode).toMatch(/^BATCH-\d{8}-TEST-MOON-001/);
      expect(batch.batchCode).toContain('BATCH-');
      expect(batch.batchCode).toContain('TEST-MOON-001');

      // Check quantities
      expect(batch.initialQuantity).toBe(actualQuantity);
      expect(batch.currentQuantity).toBe(actualQuantity);

      // Check dates
      expect(batch.mfgDate).toBeDefined();
      expect(batch.expDate).toBeDefined();

      // Verify expDate is approximately mfgDate + 10 days
      const batchMfgDate = new Date(batch.mfgDate);
      const batchExpDate = new Date(batch.expDate);
      const daysDifference = Math.round(
        (batchExpDate - batchMfgDate) / (1000 * 60 * 60 * 24)
      );
      expect(daysDifference).toBe(10);

      // Check product reference
      expect(batch.productId).toBeDefined();
      expect(batch.productId._id).toBe(testProduct._id.toString());

      // Check production plan updated
      const plan = response.body.data.plan;
      // Note: Since this plan only has 1 item, completing it makes the plan 'Completed' immediately
      expect(plan.status).toBe('Completed'); // All items done -> Completed
      expect(plan.details[0].actualQuantity).toBe(actualQuantity);
      expect(plan.details[0].status).toBe('Completed');
    });

    it('should fail to complete item without authentication', async () => {
      await request(app)
        .post(`/api/production/${testPlan._id}/complete-item`)
        .send({
          productId: testProduct._id.toString(),
          actualQuantity: 95,
        })
        .expect(401);
    });

    it('should fail to complete item with invalid product ID', async () => {
      await request(app)
        .post(`/api/production/${testPlan._id}/complete-item`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: '507f1f77bcf86cd799439011', // Random ObjectId
          actualQuantity: 95,
        })
        .expect(404);
    });

    it('should fail to complete item with zero quantity', async () => {
      await request(app)
        .post(`/api/production/${testPlan._id}/complete-item`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          actualQuantity: 0,
        })
        .expect(400);
    });
  });

  /**
   * SCENARIO 5: Database Verification
   * Verify that batch was actually saved in MongoDB
   */
  describe('Scenario 5: Database Verification', () => {
    beforeEach(async () => {
      await setupTestData();
      
      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test_kitchen',
          password: 'test123',
        });
      authToken = loginResponse.body.token;

      // Create production plan
      const planResponse = await request(app)
        .post('/api/production')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planCode: 'TEST-PLAN-004',
          details: [
            {
              productId: testProduct._id.toString(),
              plannedQuantity: 50,
            },
          ],
        });
      testPlan = planResponse.body.data;
    });

    it('should save batch to database and be queryable', async () => {
      // Complete production item
      const response = await request(app)
        .post(`/api/production/${testPlan._id}/complete-item`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          actualQuantity: 48,
        });

      const batchCode = response.body.data.batch.batchCode;

      // Verify batch exists in database
      const batchInDb = await Batch.findOne({ batchCode: batchCode })
        .populate('productId');

      expect(batchInDb).not.toBeNull();
      expect(batchInDb.batchCode).toBe(batchCode);
      expect(batchInDb.initialQuantity).toBe(48);
      expect(batchInDb.currentQuantity).toBe(48);
      expect(batchInDb.productId._id.toString()).toBe(testProduct._id.toString());

      // Verify expDate calculation
      const daysDiff = Math.round(
        (new Date(batchInDb.expDate) - new Date(batchInDb.mfgDate)) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(10);
    });

    it('should update production plan status to Completed when all items done', async () => {
      // Complete the only item in the plan
      await request(app)
        .post(`/api/production/${testPlan._id}/complete-item`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          actualQuantity: 50,
        });

      // Verify plan status in database
      const planInDb = await ProductionPlan.findById(testPlan._id);
      expect(planInDb.status).toBe('Completed');
      expect(planInDb.details[0].status).toBe('Completed');
      expect(planInDb.details[0].actualQuantity).toBe(50);
    });
  });

  /**
   * Additional Test: Multiple Products in One Plan
   */
  describe('Bonus: Multiple Products in Production Plan', () => {
    let product2;

    beforeEach(async () => {
      await setupTestData();
      
      // Create second product
      product2 = await Product.create({
        name: 'Test Mooncake 2',
        sku: 'TEST-MOON-002',
        categoryId: testCategory._id,
        price: 120000,
        shelfLifeDays: 15, // Different shelf life
        recipe: [],
        bundleItems: [],
      });

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test_kitchen',
          password: 'test123',
        });
      authToken = loginResponse.body.token;

      // Create production plan with 2 products
      const planResponse = await request(app)
        .post('/api/production')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planCode: 'TEST-PLAN-005',
          details: [
            {
              productId: testProduct._id.toString(),
              plannedQuantity: 100,
            },
            {
              productId: product2._id.toString(),
              plannedQuantity: 80,
            },
          ],
        });
      testPlan = planResponse.body.data;
    });

    it('should create separate batches for each product with correct shelf life', async () => {
      // Complete first product
      const response1 = await request(app)
        .post(`/api/production/${testPlan._id}/complete-item`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          actualQuantity: 95,
        })
        .expect(201);

      const batch1 = response1.body.data.batch;
      const daysDiff1 = Math.round(
        (new Date(batch1.expDate) - new Date(batch1.mfgDate)) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff1).toBe(10); // First product: 10 days

      // Complete second product
      const response2 = await request(app)
        .post(`/api/production/${testPlan._id}/complete-item`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: product2._id.toString(),
          actualQuantity: 78,
        })
        .expect(201);

      const batch2 = response2.body.data.batch;
      const daysDiff2 = Math.round(
        (new Date(batch2.expDate) - new Date(batch2.mfgDate)) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff2).toBe(15); // Second product: 15 days

      // Verify plan is now completed
      const plan = response2.body.data.plan;
      expect(plan.status).toBe('Completed');

      // Verify both batches in database
      const batchesInDb = await Batch.find({
        productId: { $in: [testProduct._id, product2._id] },
      });
      expect(batchesInDb).toHaveLength(2);
    });
  });
});
