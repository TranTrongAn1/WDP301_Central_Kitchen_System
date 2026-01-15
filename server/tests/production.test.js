const request = require('supertest');
const app = require('../app');
const Role = require('../models/Role');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const ProductionPlan = require('../models/ProductionPlan');
const Batch = require('../models/BatchModel');

describe('Production & Batch Management Integration Tests', () => {
  let authToken;
  let kitchenUser;
  let testCategory;
  let testProduct;
  let testPlan;

  beforeEach(async () => {
    await Role.deleteMany({});
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await ProductionPlan.deleteMany({});
    await Batch.deleteMany({});
  });

  const setupTestData = async () => {
    const kitchenRole = await Role.create({
      roleName: 'KitchenStaff',
    });

    kitchenUser = await User.create({
      username: 'test_kitchen',
      passwordHash: 'test123',
      fullName: 'Test Kitchen Staff',
      email: 'test_kitchen@test.com',
      roleId: kitchenRole._id,
      isActive: true,
    });

    testCategory = await Category.create({
      name: 'Test Category',
      description: 'Category for testing',
    });

    testProduct = await Product.create({
      name: 'Test Mooncake',
      sku: 'TEST-MOON-001',
      categoryId: testCategory._id,
      price: 100000,
      shelfLifeDays: 10,
      recipe: [],
      bundleItems: [],
    });
  };

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
      expect(response.body.user.role).toBe('KitchenStaff');

      authToken = response.body.token;
    });
  });

  describe('Scenario 2: Create Production Plan', () => {
    beforeEach(async () => {
      await setupTestData();
      
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
      expect(response.body.data.planCode).toBe('TEST-PLAN-001');
      expect(response.body.data.status).toBe('Planned');

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

  describe('Scenario 3-4: Complete Production Item', () => {
    beforeEach(async () => {
      await setupTestData();
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test_kitchen',
          password: 'test123',
        });
      authToken = loginResponse.body.token;

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

      const response = await request(app)
        .post(`/api/production/${testPlan._id}/complete-item`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          actualQuantity: actualQuantity,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.batch).toBeDefined();

      const batch = response.body.data.batch;

      expect(batch.batchCode).toMatch(/^BATCH-\d{8}-TEST-MOON-001/);
      expect(batch.initialQuantity).toBe(actualQuantity);
      expect(batch.currentQuantity).toBe(actualQuantity);

      const batchMfgDate = new Date(batch.mfgDate);
      const batchExpDate = new Date(batch.expDate);
      const daysDifference = Math.round(
        (batchExpDate - batchMfgDate) / (1000 * 60 * 60 * 24)
      );
      expect(daysDifference).toBe(10);

      const plan = response.body.data.plan;
      expect(plan.status).toBe('Completed');
      expect(plan.details[0].actualQuantity).toBe(actualQuantity);
      expect(plan.details[0].status).toBe('Completed');
    });
  });

  describe('Scenario 5: Database Verification', () => {
    beforeEach(async () => {
      await setupTestData();
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test_kitchen',
          password: 'test123',
        });
      authToken = loginResponse.body.token;

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
      const response = await request(app)
        .post(`/api/production/${testPlan._id}/complete-item`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          actualQuantity: 48,
        });

      const batchCode = response.body.data.batch.batchCode;

      const batchInDb = await Batch.findOne({ batchCode: batchCode })
        .populate('productId');

      expect(batchInDb).not.toBeNull();
      expect(batchInDb.batchCode).toBe(batchCode);
      expect(batchInDb.initialQuantity).toBe(48);
      expect(batchInDb.currentQuantity).toBe(48);
    });

    it('should update production plan status to Completed when all items done', async () => {
      await request(app)
        .post(`/api/production/${testPlan._id}/complete-item`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          actualQuantity: 50,
        });

      const planInDb = await ProductionPlan.findById(testPlan._id);
      expect(planInDb.status).toBe('Completed');
      expect(planInDb.details[0].status).toBe('Completed');
      expect(planInDb.details[0].actualQuantity).toBe(50);
    });
  });
});
