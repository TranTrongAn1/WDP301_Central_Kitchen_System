const request = require('supertest');
const app = require('../app');
const Role = require('../models/Role');
const User = require('../models/User');
const Store = require('../models/Store');

/**
 * Integration Tests for Store Management (Feature 1)
 * Tests: CRUD Operations, Authorization
 */
describe('Feature 1: Store Management Tests', () => {
  let adminToken;
  let managerToken;
  let storeStaffToken;
  let adminUser;
  let testStore;

  // Clear data at the start of this test suite
  beforeAll(async () => {
    const Role = require('../models/Role');
    const Store = require('../models/Store');
    const User = require('../models/User');
    
    await Role.deleteMany({});
    await Store.deleteMany({});
    await User.deleteMany({});
  });

  // Setup: Create roles, users with different permissions
  beforeAll(async () => {
    const adminRole = await Role.create({ roleName: 'Admin' });
    const managerRole = await Role.create({ roleName: 'Manager' });
    const storeStaffRole = await Role.create({ roleName: 'StoreStaff' });

    // Create initial store
    testStore = await Store.create({
      storeName: 'Initial Store',
      address: '123 Initial Street',
      phone: '+84-111-111-111',
      status: true,
    });

    // Create Admin user
    adminUser = await User.create({
      username: 'admin',
      passwordHash: 'admin123',
      fullName: 'Admin User',
      email: 'admin@test.com',
      roleId: adminRole._id,
      isActive: true,
    });

    // Create Manager user
    await User.create({
      username: 'manager',
      passwordHash: 'manager123',
      fullName: 'Manager User',
      email: 'manager@test.com',
      roleId: managerRole._id,
      isActive: true,
    });

    // Create StoreStaff user
    await User.create({
      username: 'storestaff',
      passwordHash: 'store123',
      fullName: 'Store Staff User',
      email: 'store@test.com',
      roleId: storeStaffRole._id,
      storeId: testStore._id,
      isActive: true,
    });

    // Login to get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = adminLogin.body.token;

    const managerLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'manager', password: 'manager123' });
    managerToken = managerLogin.body.token;

    const storeLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'storestaff', password: 'store123' });
    storeStaffToken = storeLogin.body.token;
  });

  describe('GET /api/stores', () => {
    it('should get all stores with valid token (any role)', async () => {
      const response = await request(app)
        .get('/api/stores')
        .set('Authorization', `Bearer ${storeStaffToken}`) // Even StoreStaff can view
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should fail without token', async () => {
      await request(app)
        .get('/api/stores')
        .expect(401);
    });
  });

  describe('POST /api/stores (Create Store)', () => {
    it('should create store as Admin', async () => {
      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          storeName: 'New Test Store',
          address: '456 New Street',
          phone: '+84-222-222-222',
          status: true,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created successfully');
      expect(response.body.data.storeName).toBe('New Test Store');
      expect(response.body.data.phone).toBe('+84-222-222-222');

      console.log('✅ Admin can create store');
    });

    it('should create store as Manager', async () => {
      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          storeName: 'Manager Created Store',
          address: '789 Manager Street',
          phone: '+84-333-333-333',
          status: true,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      console.log('✅ Manager can create store');
    });

    it('should fail to create store as StoreStaff (Forbidden)', async () => {
      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .send({
          storeName: 'Unauthorized Store',
          address: '999 Unauthorized Street',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');

      console.log('✅ StoreStaff cannot create store (authorization works)');
    });
  });

  describe('PUT /api/stores/:id (Update Store)', () => {
    it('should update store as Admin', async () => {
      const response = await request(app)
        .put(`/api/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          storeName: 'Updated Store Name',
          phone: '+84-999-999-999',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.storeName).toBe('Updated Store Name');
      expect(response.body.data.phone).toBe('+84-999-999-999');
    });

    it('should fail to update store as StoreStaff', async () => {
      await request(app)
        .put(`/api/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .send({
          storeName: 'Unauthorized Update',
        })
        .expect(403);
    });
  });

  describe('DELETE /api/stores/:id (Delete Store)', () => {
    it('should fail to delete store with assigned users', async () => {
      // testStore has storeStaffUser assigned to it
      const response = await request(app)
        .delete(`/api/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('user(s) are currently assigned');

      console.log('✅ Cannot delete store with assigned users');
    });

    it('should delete store without users as Admin', async () => {
      // Create a store without users
      const emptyStore = await Store.create({
        storeName: 'Empty Store',
        address: '000 Empty Street',
        status: true,
      });

      const response = await request(app)
        .delete(`/api/stores/${emptyStore._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify store is gone
      const deletedStore = await Store.findById(emptyStore._id);
      expect(deletedStore).toBeNull();

      console.log('✅ Admin can delete empty store');
    });

    it('should fail to delete store as Manager (Admin only)', async () => {
      const emptyStore = await Store.create({
        storeName: 'Another Empty Store',
        address: '111 Another Street',
      });

      await request(app)
        .delete(`/api/stores/${emptyStore._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      console.log('✅ Manager cannot delete store (Admin only)');
    });
  });
});
