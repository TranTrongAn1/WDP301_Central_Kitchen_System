const request = require('supertest');
const app = require('../app');
const Role = require('../models/Role');
const User = require('../models/User');
const Store = require('../models/Store');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Batch = require('../models/BatchModel');
const Transfer = require('../models/Transfer');
const StoreInventory = require('../models/StoreInventory');

describe('Transfer & Inventory Management Integration Tests', () => {
  let managerToken;
  let storeStaffToken;
  let managerUser;
  let storeStaffUser;
  let testStore;
  let testProduct;
  let testBatch;
  let testTransfer;

  beforeAll(async () => {
    const managerRole = await Role.create({ roleName: 'Manager' });
    const storeStaffRole = await Role.create({ roleName: 'StoreStaff' });

    testStore = await Store.create({
      storeName: 'Test Store',
      address: '123 Test Street',
      status: true,
    });

    managerUser = await User.create({
      username: 'test_manager',
      passwordHash: 'test123',
      fullName: 'Test Manager',
      email: 'test_manager@test.com',
      roleId: managerRole._id,
      isActive: true,
    });

    storeStaffUser = await User.create({
      username: 'test_storestaff',
      passwordHash: 'test123',
      fullName: 'Test Store Staff',
      email: 'test_storestaff@test.com',
      roleId: storeStaffRole._id,
      storeId: testStore._id,
      isActive: true,
    });

    const testCategory = await Category.create({
      name: 'Test Category',
      description: 'Category for transfer testing',
    });

    testProduct = await Product.create({
      name: 'Test Product for Transfer',
      sku: 'TEST-TRANSFER-001',
      categoryId: testCategory._id,
      price: 100000,
      shelfLifeDays: 30,
      recipe: [],
      bundleItems: [],
    });

    testBatch = await Batch.create({
      batchCode: 'BATCH-TEST-TRANSFER-001',
      productId: testProduct._id,
      mfgDate: new Date(),
      expDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      initialQuantity: 100,
      currentQuantity: 100,
    });

    const managerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'test_manager',
        password: 'test123',
      });
    managerToken = managerLogin.body.token;

    const storeStaffLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'test_storestaff',
        password: 'test123',
      });
    storeStaffToken = storeStaffLogin.body.token;
  });

  describe('Case 1: Create Transfer (Manager)', () => {
    it('should create a transfer of 40 items to the store', async () => {
      const response = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          toStoreId: testStore._id.toString(),
          items: [
            {
              batchId: testBatch._id.toString(),
              quantity: 40,
            },
          ],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transferCode).toMatch(/^TRF-\d{8}-\d{4}/);
      expect(response.body.data.status).toBe('Pending');
      expect(response.body.data.items[0].quantity).toBe(40);

      testTransfer = response.body.data;
    });

    it('should fail to create transfer without authentication', async () => {
      await request(app)
        .post('/api/transfers')
        .send({
          toStoreId: testStore._id.toString(),
          items: [
            {
              batchId: testBatch._id.toString(),
              quantity: 10,
            },
          ],
        })
        .expect(401);
    });
  });

  describe('Case 2: Ship Transfer (Manager)', () => {
    it('should ship transfer and decrease batch currentQuantity to 60', async () => {
      const batchBefore = await Batch.findById(testBatch._id);
      expect(batchBefore.currentQuantity).toBe(100);

      const response = await request(app)
        .put(`/api/transfers/${testTransfer._id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          status: 'Shipped',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('Shipped');

      const batchAfter = await Batch.findById(testBatch._id);
      expect(batchAfter.currentQuantity).toBe(60);
      
      console.log(`✅ Batch quantity decreased: ${batchBefore.currentQuantity} → ${batchAfter.currentQuantity}`);
    });
  });

  describe('Case 3: Receive Transfer (Store Staff)', () => {
    it('should receive transfer and create store inventory with 40 items', async () => {
      const inventoryBefore = await StoreInventory.findOne({
        storeId: testStore._id,
        batchId: testBatch._id,
      });
      expect(inventoryBefore).toBeNull();

      const response = await request(app)
        .put(`/api/transfers/${testTransfer._id}/status`)
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .send({
          status: 'Received',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('Received');

      const inventoryAfter = await StoreInventory.findOne({
        storeId: testStore._id,
        batchId: testBatch._id,
      });
      
      expect(inventoryAfter).not.toBeNull();
      expect(inventoryAfter.quantity).toBe(40);
      
      console.log(`✅ Store inventory created: ${inventoryAfter.quantity} items`);
    });

    it('should get store inventory and see the received items', async () => {
      const response = await request(app)
        .get(`/api/inventory/store/${testStore._id}`)
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].quantity).toBe(40);
    });
  });

  describe('Case 4: Validation Logic', () => {
    it('should fail to create transfer with quantity 200 (exceeds available 60)', async () => {
      const batch = await Batch.findById(testBatch._id);
      expect(batch.currentQuantity).toBe(60);

      const response = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          toStoreId: testStore._id.toString(),
          items: [
            {
              batchId: testBatch._id.toString(),
              quantity: 200,
            },
          ],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient quantity');
    });
  });

  describe('Case 5: Authorization', () => {
    let pendingTransfer;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          toStoreId: testStore._id.toString(),
          items: [
            {
              batchId: testBatch._id.toString(),
              quantity: 5,
            },
          ],
        });
      pendingTransfer = response.body.data;
    });

    it('should fail when StoreStaff tries to ship transfer', async () => {
      const response = await request(app)
        .put(`/api/transfers/${pendingTransfer._id}/status`)
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .send({
          status: 'Shipped',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Only Manager/Admin can ship');
    });

    it('should succeed when Manager ships transfer', async () => {
      const response = await request(app)
        .put(`/api/transfers/${pendingTransfer._id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          status: 'Shipped',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('Shipped');
    });
  });
});
