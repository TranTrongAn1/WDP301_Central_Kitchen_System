const request = require('supertest');
const app = require('../app');
const Role = require('../models/Role');
const User = require('../models/User');
const Store = require('../models/Store');

/**
 * Integration Tests for User Management (Feature 1)
 * Tests: CRUD Operations, RBAC, Soft Delete
 */
describe('Feature 1: User Management Tests', () => {
  let adminToken;
  let managerToken;
  let storeStaffToken;
  let adminRole;
  let managerRole;
  let storeStaffRole;
  let testStore;
  let testUser; // Used to store created user ID for cleanup

  // GLOBAL CLEANUP & SETUP
  beforeAll(async () => {
    await Role.deleteMany({});
    await Store.deleteMany({});
    await User.deleteMany({});

    // Setup Roles
    adminRole = await Role.create({ roleName: 'Admin' });
    managerRole = await Role.create({ roleName: 'Manager' });
    storeStaffRole = await Role.create({ roleName: 'StoreStaff' });

    // Setup Store
    testStore = await Store.create({
      storeName: 'Test Store',
      address: '123 Test Street',
      phone: '+84-123-456-789',
      status: true,
    });

    // Create Base Users for Auth
    await User.create({
      username: 'admin',
      passwordHash: 'admin123',
      fullName: 'Admin User',
      email: 'admin@test.com',
      roleId: adminRole._id,
      isActive: true,
    });

    await User.create({
      username: 'manager',
      passwordHash: 'manager123',
      fullName: 'Manager User',
      email: 'manager@test.com',
      roleId: managerRole._id,
      isActive: true,
    });

    await User.create({
      username: 'storestaff',
      passwordHash: 'store123',
      fullName: 'Store Staff User',
      email: 'store@test.com',
      roleId: storeStaffRole._id,
      storeId: testStore._id,
      isActive: true,
    });

    // Login & Get Tokens
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

  // CLEANUP AFTER ALL TESTS
  afterAll(async () => {
    await User.deleteMany({});
    await Store.deleteMany({});
    await Role.deleteMany({});
  });

  describe('GET /api/users (View All Users)', () => {
    it('should get all users as Admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(3);
    });

    it('should get all users as Manager', async () => {
      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);
    });

    it('should fail to get users as StoreStaff (Forbidden)', async () => {
      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .expect(403);
    });
  });

  describe('POST /api/users (Create User)', () => {
    // FIX: Clean up users created in this block specifically
    afterEach(async () => {
        await User.deleteMany({ email: { $in: ['newuser@test.com', 'manager_created@test.com'] } });
    });

    it('should create user as Admin', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newuser',
          password: 'newuser123',
          fullName: 'New User',
          email: 'newuser@test.com',
          roleId: managerRole._id.toString(),
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      testUser = response.body.data; // Save for potential debug
    });

    it('should create user as Manager', async () => {
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          username: 'manager_created',
          password: 'test123',
          fullName: 'Manager Created User',
          email: 'manager_created@test.com',
          roleId: storeStaffRole._id.toString(),
          storeId: testStore._id.toString(),
        })
        .expect(201);
    });

    it('should fail to create user as StoreStaff', async () => {
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .send({
          username: 'unauthorized_user',
          password: 'test123',
          roleId: managerRole._id.toString(),
        })
        .expect(403);
    });
  });

  describe('PUT /api/users/:id (Update User)', () => {
    let userToUpdate;

    beforeEach(async () => {
      // Create a fresh user before each test
      userToUpdate = await User.create({
        username: 'user_to_update',
        passwordHash: 'test123',
        fullName: 'User To Update',
        email: 'update@test.com',
        roleId: managerRole._id,
        isActive: true,
      });
    });

    // FIX: DELETE the user after each test to prevent Duplicate Key Error in the next beforeEach
    afterEach(async () => {
        await User.deleteMany({ username: 'user_to_update' });
    });

    it('should update user as Admin', async () => {
      const response = await request(app)
        .put(`/api/users/${userToUpdate._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Updated Full Name',
        })
        .expect(200);

      expect(response.body.data.fullName).toBe('Updated Full Name');
    });

    it('should fail to update user as StoreStaff', async () => {
      await request(app)
        .put(`/api/users/${userToUpdate._id}`)
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .send({
          fullName: 'Unauthorized Update',
        })
        .expect(403);
    });
  });

  describe('DELETE /api/users/:id (Soft Delete - Admin Only)', () => {
    let userToDelete;

    beforeEach(async () => {
      userToDelete = await User.create({
        username: 'user_to_delete',
        passwordHash: 'test123',
        fullName: 'User To Delete',
        email: 'delete@test.com',
        roleId: managerRole._id,
        isActive: true,
      });
    });

    // FIX: DELETE the user after each test to prevent Duplicate Key Error
    afterEach(async () => {
        await User.deleteMany({ username: 'user_to_delete' });
    });

    it('should soft delete user (set isActive: false) as Admin', async () => {
      const response = await request(app)
        .delete(`/api/users/${userToDelete._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toContain('deactivated');

      // Verify DB state
      const userAfter = await User.findById(userToDelete._id);
      expect(userAfter.isActive).toBe(false);
    });

    it('should fail to soft delete user as Manager (Admin only)', async () => {
      await request(app)
        .delete(`/api/users/${userToDelete._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('should fail to soft delete user as StoreStaff', async () => {
      await request(app)
        .delete(`/api/users/${userToDelete._id}`)
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .expect(403);
    });
  });

  describe('RBAC (Role-Based Access Control) Summary', () => {
    // Generate unique usernames using timestamp to avoid conflicts
    const timestamp = Date.now();
    const rbacAdminUser = `rbac_admin_${timestamp}`;
    const rbacManagerUser = `rbac_manager_${timestamp}`;
    const rbacStoreUser = `rbac_store_${timestamp}`;
    const rbacDeleteUser = `delete_test_${timestamp}`;

    afterEach(async () => {
        await User.deleteMany({ 
          username: { $in: [rbacAdminUser, rbacManagerUser, rbacStoreUser, rbacDeleteUser] } 
        });
    });

    it('should enforce proper role-based access control', async () => {
      const results = {
        admin: { canViewUsers: false, canCreateUsers: false, canDeleteUsers: false },
        manager: { canViewUsers: false, canCreateUsers: false, canDeleteUsers: false },
        storeStaff: { canViewUsers: false, canCreateUsers: false, canDeleteUsers: false },
      };

      // --- Admin Actions ---
      const adminView = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
      results.admin.canViewUsers = adminView.status === 200;

      const adminCreate = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          username: rbacAdminUser, 
          password: 'test123', 
          fullName: 'RBAC Test User',
          email: `${rbacAdminUser}@test.com`,
          roleId: managerRole._id.toString() 
        });
      
      results.admin.canCreateUsers = adminCreate.status === 201;

      // Create a temp user for delete test
      const testUserForDelete = await User.create({
        username: rbacDeleteUser, 
        passwordHash: 'test123', 
        fullName: 'Del Test', 
        email: `${rbacDeleteUser}@test.com`, 
        roleId: managerRole._id
      });

      const adminDelete = await request(app).delete(`/api/users/${testUserForDelete._id}`).set('Authorization', `Bearer ${adminToken}`);
      results.admin.canDeleteUsers = adminDelete.status === 200;

      // --- Manager Actions ---
      const managerView = await request(app).get('/api/users').set('Authorization', `Bearer ${managerToken}`);
      results.manager.canViewUsers = managerView.status === 200;

      const managerCreate = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ 
          username: rbacManagerUser, 
          password: 'test123', 
          fullName: 'Manager RBAC Test',
          email: `${rbacManagerUser}@test.com`,
          roleId: managerRole._id.toString() 
        });
      results.manager.canCreateUsers = managerCreate.status === 201;

      const managerDelete = await request(app).delete(`/api/users/${testUserForDelete._id}`).set('Authorization', `Bearer ${managerToken}`);
      results.manager.canDeleteUsers = managerDelete.status === 403; // Should fail

      // --- StoreStaff Actions ---
      const storeView = await request(app).get('/api/users').set('Authorization', `Bearer ${storeStaffToken}`);
      results.storeStaff.canViewUsers = storeView.status === 403; // Should fail

      const storeCreate = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .send({ 
          username: rbacStoreUser, 
          password: 'test123', 
          fullName: 'Store RBAC Test',
          email: `${rbacStoreUser}@test.com`,
          roleId: managerRole._id.toString() 
        });
      results.storeStaff.canCreateUsers = storeCreate.status === 403; // Should fail

      const storeDelete = await request(app).delete(`/api/users/${testUserForDelete._id}`).set('Authorization', `Bearer ${storeStaffToken}`);
      results.storeStaff.canDeleteUsers = storeDelete.status === 403; // Should fail

      // --- ASSERTIONS ---
      expect(results.admin.canViewUsers).toBe(true);
      expect(results.admin.canCreateUsers).toBe(true);
      expect(results.admin.canDeleteUsers).toBe(true);

      expect(results.manager.canViewUsers).toBe(true);
      expect(results.manager.canCreateUsers).toBe(true);
      expect(results.manager.canDeleteUsers).toBe(true); // Should be true because we expect status 403 (fail)

      expect(results.storeStaff.canViewUsers).toBe(true); // Should be true because we expect status 403 (fail)
      expect(results.storeStaff.canCreateUsers).toBe(true); // Should be true because we expect status 403 (fail)
      expect(results.storeStaff.canDeleteUsers).toBe(true); // Should be true because we expect status 403 (fail)

      console.log('✅ RBAC Checks Passed');
    });
  });
});