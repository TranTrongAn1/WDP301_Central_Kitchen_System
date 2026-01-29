/**
 * Integration Test: Feature 2 - Inventory & Sourcing
 * Tests the complete workflow for Inventory Management with Traceability and FEFO Logic
 * 
 * Test Coverage:
 * 1. Ecosystem Creation (Supplier & Ingredient)
 * 2. Batch Import with Traceability (Supplier Info Population)
 * 3. FEFO Logic Verification (Sorted by Expiry Date)
 * 4. Validation & Negative Tests (Traceability Enforcement)
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

describe('Feature 2: Inventory & Sourcing - Integration Tests', () => {
  let adminToken;
  let adminUser;
  let adminRole;
  let supplierId;
  let ingredientId;

  // ============================================================
  // SETUP: Initialize Database and Authentication
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
      passwordHash: 'password123', // Will be hashed automatically by User model pre-save hook
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

    // Validate login was successful
    if (!loginResponse.body.success || !loginResponse.body.token) {
      throw new Error(`Login failed: ${loginResponse.body.message || 'Unknown error'}`);
    }

    adminToken = loginResponse.body.token;
    expect(adminToken).toBeDefined();

    console.log('✅ Test Setup Complete - Admin authenticated');
  });

  afterAll(async () => {
    await clearDB();
    await closeDB();
  });

  // ============================================================
  // TEST CASE 1: Create Ecosystem (Supplier & Ingredient)
  // ============================================================
  describe('Test Case 1: Create Ecosystem (Supplier & Ingredient)', () => {
    it('should create a valid Supplier via API', async () => {
      const supplierData = {
        name: 'Premium Ingredients Supplier',
        email: 'contact@premiumingredients.com',
        phone: '+84-28-99999999',
        address: 'Industrial Zone, District 9, Ho Chi Minh City',
        status: 'Active',
      };

      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(supplierData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.name).toBe(supplierData.name);
      expect(response.body.data.email).toBe(supplierData.email.toLowerCase());
      expect(response.body.data.status).toBe('Active');

      // Save supplierId for later tests
      supplierId = response.body.data._id;

      console.log(`✅ Supplier created with ID: ${supplierId}`);
    });

    it('should create an Ingredient with totalQuantity: 0', async () => {
      const ingredientData = {
        ingredientName: 'Premium Flour',
        unit: 'kg',
        costPrice: 25000,
        warningThreshold: 50,
      };

      const response = await request(app)
        .post('/api/ingredients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(ingredientData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.ingredientName).toBe(ingredientData.ingredientName);
      expect(response.body.data.unit).toBe(ingredientData.unit.toLowerCase());
      
      // CRITICAL ASSERTION: Initial totalQuantity must be 0
      expect(response.body.data.totalQuantity).toBe(0);

      // Save ingredientId for later tests
      ingredientId = response.body.data._id;

      console.log(`✅ Ingredient created with ID: ${ingredientId}, totalQuantity: 0`);
    });
  });

  // ============================================================
  // TEST CASE 2: Import Batch 1 (Traceability Check)
  // ============================================================
  describe('Test Case 2: Import Batch 1 (Traceability Check)', () => {
    it('should import Batch 1 with populated Supplier info', async () => {
      const batchData = {
        supplierId: supplierId,
        batchCode: 'B01',
        initialQuantity: 100,
        expiryDate: '2026-12-31',
        price: 50000,
      };

      const response = await request(app)
        .post(`/api/ingredients/${ingredientId}/batches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(batchData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('batch');
      
      const batch = response.body.data.batch;
      
      expect(batch).toHaveProperty('_id');
      expect(batch.batchCode).toBe(batchData.batchCode.toUpperCase());
      expect(batch.initialQuantity).toBe(batchData.initialQuantity);
      expect(batch.currentQuantity).toBe(batchData.initialQuantity);
      expect(batch.price).toBe(batchData.price);

      // CRITICAL ASSERTION: Supplier info must be populated (Traceability)
      expect(batch.supplierId).toHaveProperty('name');
      expect(batch.supplierId).toHaveProperty('email');
      expect(batch.supplierId).toHaveProperty('phone');
      expect(batch.supplierId.name).toBe('Premium Ingredients Supplier');

      console.log('✅ Batch B01 created with populated Supplier info (Traceability verified)');
    });

    it('should update parent Ingredient totalQuantity to 100', async () => {
      // Fetch the parent Ingredient from database
      const ingredient = await Ingredient.findById(ingredientId);

      // CRITICAL ASSERTION: totalQuantity must be updated to 100
      expect(ingredient).toBeDefined();
      expect(ingredient.totalQuantity).toBe(100);

      console.log(`✅ Parent Ingredient totalQuantity updated to ${ingredient.totalQuantity}`);
    });
  });

  // ============================================================
  // TEST CASE 3: Import Batch 2 (FEFO Logic Check)
  // ============================================================
  describe('Test Case 3: Import Batch 2 (FEFO Logic Check)', () => {
    it('should import Batch 2 with earlier expiry date', async () => {
      const batchData = {
        supplierId: supplierId,
        batchCode: 'B02',
        initialQuantity: 50,
        expiryDate: '2026-06-01', // Earlier expiry date than B01
        price: 48000,
      };

      const response = await request(app)
        .post(`/api/ingredients/${ingredientId}/batches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(batchData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('batch');
      
      const batch = response.body.data.batch;
      expect(batch.batchCode).toBe(batchData.batchCode.toUpperCase());
      expect(batch.initialQuantity).toBe(batchData.initialQuantity);

      console.log('✅ Batch B02 created with earlier expiry date (2026-06-01)');
    });

    it('should update parent Ingredient totalQuantity to 150', async () => {
      // Fetch the parent Ingredient from database
      const ingredient = await Ingredient.findById(ingredientId);

      // CRITICAL ASSERTION: totalQuantity must be 100 + 50 = 150
      expect(ingredient).toBeDefined();
      expect(ingredient.totalQuantity).toBe(150);

      console.log(`✅ Parent Ingredient totalQuantity updated to ${ingredient.totalQuantity}`);
    });

    it('should return batches sorted by expiryDate ascending (FEFO)', async () => {
      const response = await request(app)
        .get(`/api/ingredients/${ingredientId}/batches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);

      const batches = response.body.data;

      // CRITICAL ASSERTION: Batches must be sorted by expiryDate ascending
      // Batch B02 (2026-06-01) should come before Batch B01 (2026-12-31)
      expect(batches[0].batchCode).toBe('B02');
      expect(batches[1].batchCode).toBe('B01');

      // Verify expiry dates are in ascending order
      const expiryDate1 = new Date(batches[0].expiryDate);
      const expiryDate2 = new Date(batches[1].expiryDate);
      expect(expiryDate1.getTime()).toBeLessThan(expiryDate2.getTime());

      console.log('✅ FEFO Logic verified: Batches sorted by expiryDate ascending');
      console.log(`   - Batch 1 (B02): ${batches[0].expiryDate}`);
      console.log(`   - Batch 2 (B01): ${batches[1].expiryDate}`);
    });
  });

  // ============================================================
  // TEST CASE 4: Validation (Negative Test - Traceability Enforcement)
  // ============================================================
  describe('Test Case 4: Validation (Negative Test)', () => {
    it('should return 400 Bad Request when creating batch without supplierId', async () => {
      const invalidBatchData = {
        // supplierId is intentionally missing
        batchCode: 'B03',
        initialQuantity: 75,
        expiryDate: '2026-09-15',
        price: 52000,
      };

      const response = await request(app)
        .post(`/api/ingredients/${ingredientId}/batches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBatchData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
      
      // Verify error message indicates missing supplierId (Traceability enforcement)
      expect(
        response.body.message.toLowerCase().includes('supplier') ||
        response.body.message.toLowerCase().includes('required')
      ).toBe(true);

      console.log('✅ Traceability enforcement verified: Cannot create batch without supplierId');
      console.log(`   Error message: ${response.body.message}`);
    });

    it('should return 400 Bad Request when creating batch with invalid supplierId', async () => {
      const invalidBatchData = {
        supplierId: new mongoose.Types.ObjectId(), // Non-existent supplier
        batchCode: 'B04',
        initialQuantity: 80,
        expiryDate: '2026-08-20',
        price: 51000,
      };

      const response = await request(app)
        .post(`/api/ingredients/${ingredientId}/batches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBatchData);

      // Should return 400 or 404 for non-existent supplier
      expect([400, 404]).toContain(response.status);
      expect(response.body.success).toBe(false);

      console.log('✅ Validation verified: Cannot create batch with non-existent supplierId');
    });

    it('should return 400 Bad Request when creating batch with past expiry date', async () => {
      const invalidBatchData = {
        supplierId: supplierId,
        batchCode: 'B05',
        initialQuantity: 60,
        expiryDate: '2020-01-01', // Past date
        price: 49000,
      };

      const response = await request(app)
        .post(`/api/ingredients/${ingredientId}/batches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBatchData)
        .expect(400);

      expect(response.body.success).toBe(false);
      // The error message should mention expiry or future
      const message = response.body.message.toLowerCase();
      expect(
        message.includes('expiry') || message.includes('future')
      ).toBe(true);

      console.log('✅ Validation verified: Cannot create batch with past expiry date');
      console.log(`   Error message: ${response.body.message}`);
    });
  });

  // ============================================================
  // ADDITIONAL TEST: Verify Data Integrity
  // ============================================================
  describe('Additional: Data Integrity Verification', () => {
    it('should maintain correct totalQuantity after multiple batch imports', async () => {
      const ingredient = await Ingredient.findById(ingredientId);
      const batches = await IngredientBatch.find({ ingredientId });

      // Calculate expected totalQuantity from all batches
      const expectedTotal = batches.reduce((sum, batch) => sum + batch.currentQuantity, 0);

      expect(ingredient.totalQuantity).toBe(expectedTotal);
      expect(ingredient.totalQuantity).toBe(150); // 100 + 50 from previous tests

      console.log('✅ Data integrity verified: totalQuantity matches sum of batch quantities');
    });

    it('should verify all batches have proper traceability links', async () => {
      const batches = await IngredientBatch.find({ ingredientId }).populate('supplierId');

      batches.forEach((batch, index) => {
        expect(batch.supplierId).toBeDefined();
        expect(batch.supplierId._id.toString()).toBe(supplierId);
        expect(batch.ingredientId.toString()).toBe(ingredientId);
        
        console.log(`✅ Batch ${index + 1} (${batch.batchCode}): Traceability links verified`);
      });
    });
  });
});
