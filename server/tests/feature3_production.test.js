/**
 * Integration Test: Feature 3 - Production Workflow
 * Tests the complete production process with FEFO inventory deduction and traceability
 * 
 * Test Coverage:
 * 1. FEFO Inventory Deduction (First Expired First Out)
 * 2. Traceability (Production Plan linking)
 * 3. Insufficient Inventory Validation
 * 4. Production Plan Status Updates
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const { connectDB, clearDB, closeDB } = require('./setup');

// Import Models
const User = require('../models/User');
const Role = require('../models/Role');
const Supplier = require('../models/Supplier');
const Ingredient = require('../models/Ingredient');
const IngredientBatch = require('../models/IngredientBatch');
const Category = require('../models/Category');
const Product = require('../models/Product');
const ProductionPlan = require('../models/ProductionPlan');
const Batch = require('../models/BatchModel');

describe('Feature 3: Production Workflow - Integration Tests', () => {
  let adminToken;
  let adminUser;
  let adminRole;
  let supplierId;
  let ingredientId;
  let batchAId; // Early expiry batch
  let batchBId; // Late expiry batch
  let categoryId;
  let productId;
  let productionPlanId;

  // ============================================================
  // SETUP: Initialize Database, Authentication, and Test Data
  // ============================================================
  beforeAll(async () => {
    // Connect to test database
    await connectDB();

    // Clear all collections
    await clearDB();

    // Create Admin Role
    adminRole = await Role.create({
      roleName: 'Admin',
    });

    // Create Admin User (password will be hashed by pre-save hook)
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

    // CRITICAL: Import Batch A (Early Expiry - 2026-06-01, 50kg)
    const batchAResponse = await request(app)
      .post(`/api/ingredients/${ingredientId}/batches`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: supplierId,
        batchCode: 'FLOUR-A-EARLY',
        initialQuantity: 50,
        expiryDate: '2026-06-01', // Early expiry
        price: 18000,
      });

    batchAId = batchAResponse.body.data.batch._id;
    console.log('✅ Test Setup: Batch A (Early Expiry 2026-06-01, 50kg) imported');

    // CRITICAL: Import Batch B (Late Expiry - 2026-12-31, 100kg)
    const batchBResponse = await request(app)
      .post(`/api/ingredients/${ingredientId}/batches`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: supplierId,
        batchCode: 'FLOUR-B-LATE',
        initialQuantity: 100,
        expiryDate: '2026-12-31', // Late expiry
        price: 19000,
      });

    batchBId = batchBResponse.body.data.batch._id;
    console.log('✅ Test Setup: Batch B (Late Expiry 2026-12-31, 100kg) imported');
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
    console.log('✅ Test Setup: Product "Mooncake" created (Recipe: 1 cake = 0.5kg Flour)');

    // Create Production Plan to make 60 Mooncakes
    const planResponse = await request(app)
      .post('/api/production')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        planCode: 'PLAN-2026-001',
        planDate: '2026-01-29',
        note: 'Production batch for testing FEFO logic',
        details: [
          {
            productId: productId,
            plannedQuantity: 60,
          },
        ],
      });

    productionPlanId = planResponse.body.data._id;
    console.log('✅ Test Setup: Production Plan created (60 Mooncakes planned)');
    console.log('===============================================\n');
  });

  afterAll(async () => {
    await clearDB();
    await closeDB();
  });

  // ============================================================
  // TEST CASE 1: Execute Production (FEFO Verification)
  // ============================================================
  describe('Test Case 1: Execute Production (FEFO Verification)', () => {
    it('should complete production and deduct inventory using FEFO logic', async () => {
      // Calculation: 60 mooncakes * 0.5kg = 30kg Flour needed
      const response = await request(app)
        .post(`/api/production/${productionPlanId}/complete-item`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: productId,
          actualQuantity: 60,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('completed successfully');
      expect(response.body.data).toHaveProperty('plan');
      expect(response.body.data).toHaveProperty('batch');
      expect(response.body.data).toHaveProperty('traceability');

      console.log('✅ Production completed successfully');
    });

    it('should deduct 30kg from Batch A (Early Expiry) using FEFO logic', async () => {
      // CRITICAL ASSERTION: Batch A should be deducted first (FEFO)
      const batchA = await IngredientBatch.findById(batchAId);

      expect(batchA).toBeDefined();
      expect(batchA.currentQuantity).toBe(20); // 50 - 30 = 20kg remaining
      expect(batchA.isActive).toBe(true); // Still active (not fully consumed)

      console.log(`✅ FEFO Logic Verified: Batch A deducted by 30kg (50 → 20kg)`);
    });

    it('should NOT touch Batch B (Late Expiry) - FEFO priority', async () => {
      // CRITICAL ASSERTION: Batch B should remain untouched
      const batchB = await IngredientBatch.findById(batchBId);

      expect(batchB).toBeDefined();
      expect(batchB.currentQuantity).toBe(100); // Unchanged
      expect(batchB.isActive).toBe(true);

      console.log('✅ FEFO Logic Verified: Batch B remains untouched (100kg)');
    });

    it('should update parent Ingredient totalQuantity to 120kg', async () => {
      // CRITICAL ASSERTION: Total inventory should be 150 - 30 = 120kg
      const ingredient = await Ingredient.findById(ingredientId);

      expect(ingredient).toBeDefined();
      expect(ingredient.totalQuantity).toBe(120); // 150 - 30 = 120kg

      console.log(`✅ Parent Ingredient updated: ${ingredient.totalQuantity}kg (150 - 30 = 120)`);
    });

    it('should create Finished Batch with productionPlanId (Traceability)', async () => {
      // CRITICAL ASSERTION: Finished batch must contain productionPlanId
      const finishedBatch = await Batch.findOne({ productionPlanId: productionPlanId });

      expect(finishedBatch).toBeDefined();
      expect(finishedBatch.productionPlanId.toString()).toBe(productionPlanId);
      expect(finishedBatch.productId.toString()).toBe(productId);
      expect(finishedBatch.initialQuantity).toBe(60);
      expect(finishedBatch.currentQuantity).toBe(60);
      expect(finishedBatch.status).toBe('Active');

      // Verify traceability field exists
      expect(finishedBatch.ingredientBatchesUsed).toBeDefined();
      expect(finishedBatch.ingredientBatchesUsed.length).toBeGreaterThan(0);

      // Verify the ingredient batch used is Batch A
      const usedBatch = finishedBatch.ingredientBatchesUsed[0];
      expect(usedBatch.ingredientBatchId.toString()).toBe(batchAId);
      expect(usedBatch.quantityUsed).toBe(30);

      console.log('✅ Traceability Verified: Finished Batch links to Production Plan');
      console.log(`   - Production Plan ID: ${finishedBatch.productionPlanId}`);
      console.log(`   - Ingredient Batches Used: ${finishedBatch.ingredientBatchesUsed.length}`);
      console.log(`   - Batch A used: ${usedBatch.quantityUsed}kg`);
    });

    it('should update Production Plan detail status to "Completed"', async () => {
      // CRITICAL ASSERTION: Production plan detail should be marked as completed
      const plan = await ProductionPlan.findById(productionPlanId);

      expect(plan).toBeDefined();
      expect(plan.details[0].status).toBe('Completed');
      expect(plan.details[0].actualQuantity).toBe(60);
      expect(plan.status).toBe('Completed'); // Overall plan should be completed

      console.log('✅ Production Plan status updated to "Completed"');
    });
  });

  // ============================================================
  // TEST CASE 2: Insufficient Inventory (Validation)
  // ============================================================
  describe('Test Case 2: Insufficient Inventory (Validation)', () => {
    it('should return 400 Bad Request when inventory is insufficient', async () => {
      // Current inventory: 120kg (Batch A: 20kg, Batch B: 100kg)
      // Try to produce 500 mooncakes = 500 * 0.5kg = 250kg needed
      // This should fail because 250kg > 120kg available

      // Create a new production plan for this test
      const newPlanResponse = await request(app)
        .post('/api/production')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          planCode: 'PLAN-2026-002',
          planDate: '2026-01-29',
          note: 'Test insufficient inventory',
          details: [
            {
              productId: productId,
              plannedQuantity: 500, // Requires 250kg flour
            },
          ],
        });

      const newPlanId = newPlanResponse.body.data._id;

      // Try to complete production (should fail)
      const response = await request(app)
        .post(`/api/production/${newPlanId}/complete-item`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: productId,
          actualQuantity: 500,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();

      // Log the error message to debug
      console.log('✅ Validation Verified: Cannot produce with insufficient inventory');
      console.log(`   Error message: ${response.body.message}`);

      // CRITICAL ASSERTION: Error message should mention insufficient inventory or related terms
      const errorMessage = response.body.message.toLowerCase();
      
      expect(
        errorMessage.includes('insufficient') || 
        errorMessage.includes('not enough') ||
        errorMessage.includes('required') ||
        errorMessage.includes('available')
      ).toBe(true);

      // Verify inventory message details
      expect(response.body.message).toContain('Flour');
      expect(response.body.message).toContain('Required');
      expect(response.body.message).toContain('Available');

      console.log('✅ Validation Verified: Cannot produce with insufficient inventory');
      console.log(`   Error message: ${response.body.message}`);
    });

    it('should NOT deduct any inventory when validation fails', async () => {
      // CRITICAL ASSERTION: Inventory should remain unchanged after failed attempt
      const ingredient = await Ingredient.findById(ingredientId);
      const batchA = await IngredientBatch.findById(batchAId);
      const batchB = await IngredientBatch.findById(batchBId);

      // Inventory should still be 120kg (unchanged from Test Case 1)
      expect(ingredient.totalQuantity).toBe(120);
      expect(batchA.currentQuantity).toBe(20);
      expect(batchB.currentQuantity).toBe(100);

      console.log('✅ Data Integrity Verified: No inventory deducted on failed attempt');
      console.log(`   Total: ${ingredient.totalQuantity}kg, Batch A: ${batchA.currentQuantity}kg, Batch B: ${batchB.currentQuantity}kg`);
    });
  });

  // ============================================================
  // TEST CASE 3: Multi-Batch FEFO Deduction
  // ============================================================
  describe('Test Case 3: Multi-Batch FEFO Deduction', () => {
    it('should deduct from multiple batches when first batch is insufficient', async () => {
      // Current state: Batch A: 20kg, Batch B: 100kg
      // Produce 60 more mooncakes = 60 * 0.5kg = 30kg needed
      // This should fully consume Batch A (20kg) and partially consume Batch B (10kg)

      // Create another production plan
      const newPlanResponse = await request(app)
        .post('/api/production')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          planCode: 'PLAN-2026-003',
          planDate: '2026-01-29',
          note: 'Test multi-batch FEFO deduction',
          details: [
            {
              productId: productId,
              plannedQuantity: 60,
            },
          ],
        });

      const newPlanId = newPlanResponse.body.data._id;

      // Complete production
      const response = await request(app)
        .post(`/api/production/${newPlanId}/complete-item`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: productId,
          actualQuantity: 60,
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      console.log('✅ Multi-batch production completed');
    });

    it('should fully consume Batch A and mark it as inactive', async () => {
      // CRITICAL ASSERTION: Batch A should be fully consumed
      const batchA = await IngredientBatch.findById(batchAId);

      expect(batchA).toBeDefined();
      expect(batchA.currentQuantity).toBe(0); // Fully consumed
      expect(batchA.isActive).toBe(false); // Should be marked inactive

      console.log('✅ FEFO Logic Verified: Batch A fully consumed (20kg → 0kg, inactive)');
    });

    it('should partially deduct 10kg from Batch B', async () => {
      // CRITICAL ASSERTION: Batch B should be partially consumed
      // Batch A provided 20kg, so we need 10kg more from Batch B
      const batchB = await IngredientBatch.findById(batchBId);

      expect(batchB).toBeDefined();
      expect(batchB.currentQuantity).toBe(90); // 100 - 10 = 90kg
      expect(batchB.isActive).toBe(true); // Still active

      console.log('✅ FEFO Logic Verified: Batch B partially consumed (100kg → 90kg)');
    });

    it('should update parent Ingredient totalQuantity to 90kg', async () => {
      // CRITICAL ASSERTION: Total inventory should be 120 - 30 = 90kg
      const ingredient = await Ingredient.findById(ingredientId);

      expect(ingredient).toBeDefined();
      expect(ingredient.totalQuantity).toBe(90); // 120 - 30 = 90kg

      console.log(`✅ Parent Ingredient updated: ${ingredient.totalQuantity}kg (120 - 30 = 90)`);
    });

    it('should track traceability for both batches used', async () => {
      // Find the latest finished batch
      const finishedBatches = await Batch.find({ productId: productId }).sort({ createdAt: -1 });
      const latestBatch = finishedBatches[0];

      expect(latestBatch).toBeDefined();
      expect(latestBatch.ingredientBatchesUsed).toBeDefined();
      expect(latestBatch.ingredientBatchesUsed.length).toBe(2); // Should use 2 batches

      // Verify Batch A was used (20kg)
      const usedBatchA = latestBatch.ingredientBatchesUsed.find(
        (ub) => ub.ingredientBatchId.toString() === batchAId
      );
      expect(usedBatchA).toBeDefined();
      expect(usedBatchA.quantityUsed).toBe(20);

      // Verify Batch B was used (10kg)
      const usedBatchB = latestBatch.ingredientBatchesUsed.find(
        (ub) => ub.ingredientBatchId.toString() === batchBId
      );
      expect(usedBatchB).toBeDefined();
      expect(usedBatchB.quantityUsed).toBe(10);

      console.log('✅ Traceability Verified: Both batches tracked correctly');
      console.log(`   - Batch A used: ${usedBatchA.quantityUsed}kg (fully consumed)`);
      console.log(`   - Batch B used: ${usedBatchB.quantityUsed}kg (partially consumed)`);
    });
  });

  // ============================================================
  // TEST CASE 4: Data Consistency Verification
  // ============================================================
  describe('Test Case 4: Data Consistency Verification', () => {
    it('should maintain accurate total quantity across all operations', async () => {
      // Verify final state matches expected calculations
      const ingredient = await Ingredient.findById(ingredientId);
      const batches = await IngredientBatch.find({ ingredientId: ingredientId });

      // Calculate sum of all batch quantities
      const totalFromBatches = batches.reduce((sum, batch) => sum + batch.currentQuantity, 0);

      // CRITICAL ASSERTION: Parent totalQuantity should match sum of batches
      expect(ingredient.totalQuantity).toBe(totalFromBatches);
      expect(ingredient.totalQuantity).toBe(90); // Final expected value

      console.log('✅ Data Consistency Verified: Parent totalQuantity matches batch sum');
      console.log(`   Parent Total: ${ingredient.totalQuantity}kg`);
      console.log(`   Batch Sum: ${totalFromBatches}kg`);
    });

    it('should have correct count of active vs inactive batches', async () => {
      const activeBatches = await IngredientBatch.find({
        ingredientId: ingredientId,
        isActive: true,
        currentQuantity: { $gt: 0 },
      });

      const inactiveBatches = await IngredientBatch.find({
        ingredientId: ingredientId,
        isActive: false,
        currentQuantity: 0,
      });

      // CRITICAL ASSERTION: 1 active batch (Batch B with 90kg), 1 inactive (Batch A with 0kg)
      expect(activeBatches.length).toBe(1);
      expect(inactiveBatches.length).toBe(1);

      console.log('✅ Batch Status Verified: 1 active, 1 inactive');
      console.log(`   Active: Batch B (${activeBatches[0].currentQuantity}kg)`);
      console.log(`   Inactive: Batch A (${inactiveBatches[0].currentQuantity}kg)`);
    });

    it('should have created correct number of finished product batches', async () => {
      const finishedBatches = await Batch.find({ productId: productId });

      // CRITICAL ASSERTION: Should have 2 finished batches (from 2 completed productions)
      expect(finishedBatches.length).toBe(2);

      // Verify all batches have traceability
      finishedBatches.forEach((batch, index) => {
        expect(batch.productionPlanId).toBeDefined();
        expect(batch.ingredientBatchesUsed).toBeDefined();
        console.log(`✅ Finished Batch ${index + 1}: ${batch.batchCode} (Qty: ${batch.currentQuantity})`);
      });
    });
  });
});
