const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Role = require('../../models/Role');
const Supplier = require('../../models/Supplier');
const Ingredient = require('../../models/Ingredient');
const IngredientBatch = require('../../models/IngredientBatch');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const ProductionPlan = require('../../models/ProductionPlan');
const Batch = require('../../models/BatchModel');
const jwt = require('jsonwebtoken');

describe('Production Controller - completeProductionItem with FEFO', () => {
  let adminToken;
  let adminUser;
  let adminRole;
  let supplier;
  let ingredient;
  let ingredientBatch1; // Older expiry, less quantity
  let ingredientBatch2; // Newer expiry, more quantity
  let category;
  let product;
  let productionPlan;

  beforeEach(async () => {
    // ========================================
    // 1. Create Admin Role and User
    // ========================================
    adminRole = await Role.create({
      roleName: 'Admin',
      permissions: ['all'],
    });

    adminUser = await User.create({
      username: 'adminuser',
      email: 'admin@test.com',
      passwordHash: 'Admin123!@#',
      fullName: 'Admin User',
      phone: '0123456789',
      roleId: adminRole._id,
      isActive: true,
    });

    // Generate JWT token for authentication
    adminToken = jwt.sign(
      { id: adminUser._id, role: adminRole.roleName },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // ========================================
    // 2. Create Supplier
    // ========================================
    supplier = await Supplier.create({
      name: 'Golden Harvest Supplier',
      contactPerson: 'John Doe',
      phone: '+84-28-12345678',
      email: 'contact@goldenharvest.vn',
      address: 'Industrial Zone, Binh Duong Province',
    });

    // ========================================
    // 3. Create Ingredient (Flour)
    // ========================================
    ingredient = await Ingredient.create({
      ingredientName: 'Flour',
      unit: 'kg',
      totalQuantity: 13, // 3 from batch1 + 10 from batch2
      warningThreshold: 5,
      costPrice: 15000, // Cost price per kg in VND
    });

    // ========================================
    // 4. Create TWO IngredientBatch for FEFO Testing
    // ========================================
    const today = new Date();
    const olderExpiryDate = new Date(today);
    olderExpiryDate.setDate(today.getDate() + 10); // Expires in 10 days

    const newerExpiryDate = new Date(today);
    newerExpiryDate.setDate(today.getDate() + 30); // Expires in 30 days

    // Batch 1: Older expiry, smaller quantity
    ingredientBatch1 = await IngredientBatch.create({
      batchCode: 'FLOUR-BATCH-001',
      ingredientId: ingredient._id,
      supplierId: supplier._id,
      initialQuantity: 3,
      currentQuantity: 3,
      price: 45000, // 3kg * 15000 VND/kg = 45,000 VND total
      receivedDate: today,
      expiryDate: olderExpiryDate, // Older expiry - should be used FIRST
      isActive: true,
    });

    // Batch 2: Newer expiry, larger quantity
    ingredientBatch2 = await IngredientBatch.create({
      batchCode: 'FLOUR-BATCH-002',
      ingredientId: ingredient._id,
      supplierId: supplier._id,
      initialQuantity: 10,
      currentQuantity: 10,
      price: 150000, // 10kg * 15000 VND/kg = 150,000 VND total
      receivedDate: today,
      expiryDate: newerExpiryDate, // Newer expiry - should be used SECOND
      isActive: true,
    });

    // ========================================
    // 5. Create Category
    // ========================================
    category = await Category.create({
      categoryName: 'Mooncakes',
    });

    // ========================================
    // 6. Create Product with Recipe
    // ========================================
    product = await Product.create({
      name: 'Classic Mooncake',
      sku: 'MC-001',
      categoryId: category._id,
      price: 50000,
      shelfLifeDays: 30,
      recipe: [
        {
          ingredientId: ingredient._id,
          quantity: 0.05, // 0.05 kg (50g) of flour per mooncake
        },
      ],
    });

    // ========================================
    // 7. Create Production Plan
    // ========================================
    productionPlan = await ProductionPlan.create({
      planCode: 'PLAN-2026-001',
      planDate: today,
      note: 'Test production plan for FEFO testing',
      status: 'Planned',
      details: [
        {
          productId: product._id,
          plannedQuantity: 100,
          status: 'Pending',
        },
      ],
    });
  });

  afterEach(async () => {
    // Clean up all test data
    await User.deleteMany({});
    await Role.deleteMany({});
    await Supplier.deleteMany({});
    await Ingredient.deleteMany({});
    await IngredientBatch.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await ProductionPlan.deleteMany({});
    await Batch.deleteMany({});
  });

  // ============================================================
  // TEST CASE 1: Successful FEFO Deduction & Batch Creation
  // ============================================================
  describe('POST /api/production-plans/:planId/complete-item - Success with FEFO', () => {
    it('should complete production item using FEFO logic and create finished batch', async () => {
      const actualQuantity = 100; // Requires 100 * 0.05 = 5 kg of flour

      const response = await request(app)
        .post(`/api/production-plans/${productionPlan._id}/complete-item`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: product._id.toString(),
          actualQuantity: actualQuantity,
        })
        .expect(201);

      // ========================================
      // Assert: Response Structure
      // ========================================
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Production item completed successfully');
      expect(response.body.data).toHaveProperty('plan');
      expect(response.body.data).toHaveProperty('batch');
      expect(response.body.data).toHaveProperty('traceability');

      // ========================================
      // Assert: FEFO Logic - Check Batch Deductions
      // ========================================
      // Batch 1 (older expiry, 3kg) should be FULLY CONSUMED first
      const batch1AfterProduction = await IngredientBatch.findById(ingredientBatch1._id);
      expect(batch1AfterProduction.currentQuantity).toBe(0);
      expect(batch1AfterProduction.isActive).toBe(false);

      // Batch 2 (newer expiry, 10kg) should have 8kg remaining (10 - 2)
      // Because 5kg total needed: 3kg from batch1 + 2kg from batch2 = 5kg
      const batch2AfterProduction = await IngredientBatch.findById(ingredientBatch2._id);
      expect(batch2AfterProduction.currentQuantity).toBe(8);
      expect(batch2AfterProduction.isActive).toBe(true);

      // ========================================
      // Assert: Ingredient Total Quantity Deduction
      // ========================================
      const ingredientAfterProduction = await Ingredient.findById(ingredient._id);
      expect(ingredientAfterProduction.totalQuantity).toBe(8); // 13 - 5 = 8

      // ========================================
      // Assert: Traceability - Finished Batch
      // ========================================
      const finishedBatch = response.body.data.batch;
      // productId is populated, so check the _id property
      expect(finishedBatch.productId._id).toBe(product._id.toString());
      expect(finishedBatch.productionPlanId).toBe(productionPlan._id.toString());
      expect(finishedBatch.initialQuantity).toBe(actualQuantity);
      expect(finishedBatch.currentQuantity).toBe(actualQuantity);
      expect(finishedBatch.status).toBe('Active');

      // Assert: ingredientBatchesUsed contains EXACTLY 2 entries (proving FEFO used both batches)
      expect(finishedBatch.ingredientBatchesUsed).toHaveLength(2);

      // First entry should be from Batch 1 (older expiry)
      expect(finishedBatch.ingredientBatchesUsed[0].ingredientBatchId).toBe(
        ingredientBatch1._id.toString()
      );
      expect(finishedBatch.ingredientBatchesUsed[0].quantityUsed).toBe(3);

      // Second entry should be from Batch 2 (newer expiry)
      expect(finishedBatch.ingredientBatchesUsed[1].ingredientBatchId).toBe(
        ingredientBatch2._id.toString()
      );
      expect(finishedBatch.ingredientBatchesUsed[1].quantityUsed).toBe(2);

      // ========================================
      // Assert: Traceability Array in Response
      // ========================================
      const traceability = response.body.data.traceability;
      expect(traceability.ingredientBatchesUsed).toHaveLength(2);
      expect(traceability.message).toContain('FEFO');

      // Verify traceability details
      expect(traceability.ingredientBatchesUsed[0].ingredientName).toBe('Flour');
      expect(traceability.ingredientBatchesUsed[0].batchCode).toBe('FLOUR-BATCH-001');
      expect(traceability.ingredientBatchesUsed[0].quantityUsed).toBe(3);

      expect(traceability.ingredientBatchesUsed[1].ingredientName).toBe('Flour');
      expect(traceability.ingredientBatchesUsed[1].batchCode).toBe('FLOUR-BATCH-002');
      expect(traceability.ingredientBatchesUsed[1].quantityUsed).toBe(2);

      // ========================================
      // Assert: Production Plan Status Update
      // ========================================
      const planAfterProduction = await ProductionPlan.findById(productionPlan._id);
      expect(planAfterProduction.details[0].status).toBe('Completed');
      expect(planAfterProduction.details[0].actualQuantity).toBe(actualQuantity);
      expect(planAfterProduction.status).toBe('Completed'); // All items completed

      // ========================================
      // Assert: Finished Batch Created in Database
      // ========================================
      const finishedBatchInDb = await Batch.findById(finishedBatch._id);
      expect(finishedBatchInDb).toBeTruthy();
      expect(finishedBatchInDb.batchCode).toMatch(/^BATCH-\d{8}-MC-001/);
      expect(finishedBatchInDb.productionPlanId.toString()).toBe(productionPlan._id.toString());
    });
  });

  // ============================================================
  // TEST CASE 2: Insufficient Stock Error
  // ============================================================
  describe('POST /api/production-plans/:planId/complete-item - Insufficient Stock', () => {
    it('should return 400 error when ingredient stock is insufficient', async () => {
      // Try to produce 500 units, which requires 500 * 0.05 = 25 kg
      // But we only have 13 kg in total (3 + 10)
      const excessiveQuantity = 500;

      const response = await request(app)
        .post(`/api/production-plans/${productionPlan._id}/complete-item`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: product._id.toString(),
          actualQuantity: excessiveQuantity,
        })
        .expect(400);

      // ========================================
      // Assert: Error Response
      // ========================================
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient inventory');
      expect(response.body.message).toContain('Flour');
      expect(response.body.message).toContain('Required: 25');
      expect(response.body.message).toContain('Available: 13');

      // ========================================
      // Assert: Transaction Rollback - No Changes to Database
      // ========================================
      // Batch 1 should remain unchanged
      const batch1Unchanged = await IngredientBatch.findById(ingredientBatch1._id);
      expect(batch1Unchanged.currentQuantity).toBe(3);
      expect(batch1Unchanged.isActive).toBe(true);

      // Batch 2 should remain unchanged
      const batch2Unchanged = await IngredientBatch.findById(ingredientBatch2._id);
      expect(batch2Unchanged.currentQuantity).toBe(10);
      expect(batch2Unchanged.isActive).toBe(true);

      // Ingredient total should remain unchanged
      const ingredientUnchanged = await Ingredient.findById(ingredient._id);
      expect(ingredientUnchanged.totalQuantity).toBe(13);

      // No finished batch should be created
      const finishedBatches = await Batch.find({ productionPlanId: productionPlan._id });
      expect(finishedBatches.length).toBe(0);

      // Production plan should remain unchanged
      const planUnchanged = await ProductionPlan.findById(productionPlan._id);
      expect(planUnchanged.details[0].status).toBe('Pending');
      // actualQuantity may be 0 or undefined depending on implementation
      expect(planUnchanged.details[0].actualQuantity || 0).toBe(0);
      expect(planUnchanged.status).toBe('Planned');
    });
  });

  // ============================================================
  // TEST CASE 3: Missing Authentication Token
  // ============================================================
  describe('POST /api/production-plans/:planId/complete-item - Unauthorized', () => {
    it('should return 401 when no authentication token is provided', async () => {
      const response = await request(app)
        .post(`/api/production-plans/${productionPlan._id}/complete-item`)
        .send({
          productId: product._id.toString(),
          actualQuantity: 100,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================
  // TEST CASE 4: Invalid Product ID
  // ============================================================
  describe('POST /api/production-plans/:planId/complete-item - Invalid Product', () => {
    it('should return 404 when product is not in the production plan', async () => {
      const fakeProductId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/production-plans/${productionPlan._id}/complete-item`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: fakeProductId.toString(),
          actualQuantity: 100,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Product not found in this production plan');
    });
  });

  // ============================================================
  // TEST CASE 5: Already Completed Item
  // ============================================================
  describe('POST /api/production-plans/:planId/complete-item - Already Completed', () => {
    it('should return 400 when trying to complete an already completed item', async () => {
      // First completion
      await request(app)
        .post(`/api/production-plans/${productionPlan._id}/complete-item`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: product._id.toString(),
          actualQuantity: 100,
        })
        .expect(201);

      // Try to complete again
      const response = await request(app)
        .post(`/api/production-plans/${productionPlan._id}/complete-item`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: product._id.toString(),
          actualQuantity: 100,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      // The actual error message from the controller
      expect(response.body.message).toContain('Completed');
    });
  });
});
