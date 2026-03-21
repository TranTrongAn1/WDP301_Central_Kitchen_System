const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../../app');

const User = require('../../models/User');
const Role = require('../../models/Role');
const Supplier = require('../../models/Supplier');
const Category = require('../../models/Category');
const Ingredient = require('../../models/Ingredient');
const IngredientBatch = require('../../models/IngredientBatch');
const IngredientUsage = require('../../models/IngredientUsage');
const Product = require('../../models/Product');
const ProductionPlan = require('../../models/ProductionPlan');
const Batch = require('../../models/BatchModel');

describe('Integration - POST /api/production-plans/:planId/complete-item', () => {
  let adminToken;
  let adminRole;
  let adminUser;
  let supplier;
  let category;
  let flour;
  let batchA;
  let batchB;
  let product;
  let productionPlan;

  beforeEach(async () => {
    const unique = Date.now();

    // 1) Admin role + user + JWT
    adminRole = await Role.create({
      roleName: 'Admin',
    });

    adminUser = await User.create({
      username: `admin_${unique}`,
      email: `admin_${unique}@test.com`,
      passwordHash: 'Admin123!@#',
      fullName: 'Admin User',
      roleId: adminRole._id,
      isActive: true,
    });

    adminToken = jwt.sign(
      { id: adminUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Required dependency for IngredientBatch
    supplier = await Supplier.create({
      name: `Supplier ${unique}`,
      contactPerson: 'Contact User',
      phone: `090${String(unique).slice(-7)}`,
      email: `supplier_${unique}@test.com`,
      address: 'Test supplier address',
    });

    // 2) Category + Ingredient (Flour total: 15)
    category = await Category.create({
      categoryName: `Mooncakes ${unique}`,
    });

    flour = await Ingredient.create({
      ingredientName: `Flour ${unique}`,
      unit: 'kg',
      totalQuantity: 15,
      warningThreshold: 2,
      costPrice: 10000,
    });

    // 3) Two ingredient batches for FEFO
    const now = new Date();
    const expiryA = new Date(now);
    expiryA.setDate(expiryA.getDate() + 10);

    const expiryB = new Date(now);
    expiryB.setDate(expiryB.getDate() + 30);

    batchA = await IngredientBatch.create({
      batchCode: `FLOUR-A-${unique}`,
      ingredientId: flour._id,
      supplierId: supplier._id,
      expiryDate: expiryA,
      receivedDate: now,
      initialQuantity: 5,
      currentQuantity: 5,
      price: 50000,
      isActive: true,
    });

    batchB = await IngredientBatch.create({
      batchCode: `FLOUR-B-${unique}`,
      ingredientId: flour._id,
      supplierId: supplier._id,
      expiryDate: expiryB,
      receivedDate: now,
      initialQuantity: 10,
      currentQuantity: 10,
      price: 100000,
      isActive: true,
    });

    // 4) Product recipe: 0.1 kg flour per unit
    product = await Product.create({
      name: `Mooncake ${unique}`,
      sku: `MC-${unique}`,
      categoryId: category._id,
      price: 50000,
      shelfLifeDays: 30,
      recipe: [
        {
          ingredientId: flour._id,
          quantity: 0.1,
        },
      ],
      isActive: true,
    });

    // 5) Planned production plan with this product
    productionPlan = await ProductionPlan.create({
      planCode: `PLAN-${unique}`,
      planDate: new Date(),
      status: 'Planned',
      note: 'Integration test plan',
      details: [
        {
          productId: product._id,
          plannedQuantity: 300,
          actualQuantity: 0,
          status: 'Pending',
        },
      ],
    });
  });

  afterEach(async () => {
    await Batch.deleteMany({});
    await IngredientUsage.deleteMany({});
    await ProductionPlan.deleteMany({});
    await Product.deleteMany({});
    await IngredientBatch.deleteMany({});
    await Ingredient.deleteMany({});
    await Category.deleteMany({});
    await Supplier.deleteMany({});
    await User.deleteMany({});
    await Role.deleteMany({});
  });

  it('Case 1: Auto FEFO success - consumes earliest expiry first', async () => {
    const res = await request(app)
      .post(`/api/production-plans/${productionPlan._id}/complete-item`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: product._id.toString(),
        actualQuantity: 100, // needs 10 kg (0.1 * 100)
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const updatedA = await IngredientBatch.findById(batchA._id);
    const updatedB = await IngredientBatch.findById(batchB._id);
    const updatedIngredient = await Ingredient.findById(flour._id);

    expect(updatedA.currentQuantity).toBe(0);
    expect(updatedA.isActive).toBe(false);
    expect(updatedB.currentQuantity).toBe(5);
    expect(updatedIngredient.totalQuantity).toBe(5);

    const usageDocs = await IngredientUsage.find({
      productionPlanId: productionPlan._id,
      productId: product._id,
    });
    expect(usageDocs.length).toBeGreaterThan(0);

    const finishedBatches = await Batch.find({
      productionPlanId: productionPlan._id,
      productId: product._id,
    });
    expect(finishedBatches).toHaveLength(1);
    expect(finishedBatches[0].initialQuantity).toBe(100);
  });

  it('Case 2: Auto FEFO insufficient stock - returns 400 and rolls back', async () => {
    const res = await request(app)
      .post(`/api/production-plans/${productionPlan._id}/complete-item`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: product._id.toString(),
        actualQuantity: 200, // needs 20 kg, available only 15
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Insufficient stock/i);

    const updatedA = await IngredientBatch.findById(batchA._id);
    const updatedB = await IngredientBatch.findById(batchB._id);
    const updatedIngredient = await Ingredient.findById(flour._id);

    expect(updatedA.currentQuantity).toBe(5);
    expect(updatedA.isActive).toBe(true);
    expect(updatedB.currentQuantity).toBe(10);
    expect(updatedB.isActive).toBe(true);
    expect(updatedIngredient.totalQuantity).toBe(15);

    const usageDocs = await IngredientUsage.find({
      productionPlanId: productionPlan._id,
      productId: product._id,
    });
    expect(usageDocs).toHaveLength(0);

    const finishedBatches = await Batch.find({
      productionPlanId: productionPlan._id,
      productId: product._id,
    });
    expect(finishedBatches).toHaveLength(0);
  });

  it('Case 3: Manual override success - uses provided batch and quantity', async () => {
    const res = await request(app)
      .post(`/api/production-plans/${productionPlan._id}/complete-item`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: product._id.toString(),
        actualQuantity: 50,
        usedIngredients: [
          {
            ingredientBatchId: batchB._id.toString(),
            quantityUsed: 8,
            note: 'Spilled some',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const updatedA = await IngredientBatch.findById(batchA._id);
    const updatedB = await IngredientBatch.findById(batchB._id);
    const updatedIngredient = await Ingredient.findById(flour._id);

    expect(updatedA.currentQuantity).toBe(5);
    expect(updatedB.currentQuantity).toBe(2);
    expect(updatedIngredient.totalQuantity).toBe(7);

    const usageDocs = await IngredientUsage.find({
      productionPlanId: productionPlan._id,
      productId: product._id,
    });
    expect(usageDocs).toHaveLength(1);
    expect(usageDocs[0].ingredientBatchId.toString()).toBe(batchB._id.toString());
    expect(usageDocs[0].quantityUsed).toBe(8);
    expect(usageDocs[0].note).toBe('Spilled some');
  });

  it('Case 4: Manual override invalid/insufficient batch quantity - returns 400 and rolls back', async () => {
    const res = await request(app)
      .post(`/api/production-plans/${productionPlan._id}/complete-item`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: product._id.toString(),
        actualQuantity: 50,
        usedIngredients: [
          {
            ingredientBatchId: batchA._id.toString(),
            quantityUsed: 10, // batch A has only 5
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Insufficient quantity in batch/i);

    const updatedA = await IngredientBatch.findById(batchA._id);
    const updatedB = await IngredientBatch.findById(batchB._id);
    const updatedIngredient = await Ingredient.findById(flour._id);

    expect(updatedA.currentQuantity).toBe(5);
    expect(updatedA.isActive).toBe(true);
    expect(updatedB.currentQuantity).toBe(10);
    expect(updatedB.isActive).toBe(true);
    expect(updatedIngredient.totalQuantity).toBe(15);

    const usageDocs = await IngredientUsage.find({
      productionPlanId: productionPlan._id,
      productId: product._id,
    });
    expect(usageDocs).toHaveLength(0);

    const finishedBatches = await Batch.find({
      productionPlanId: productionPlan._id,
      productId: product._id,
    });
    expect(finishedBatches).toHaveLength(0);
  });
});
