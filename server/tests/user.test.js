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
  let testUser;

  // Clear data at the start of this test suite
  beforeAll(async () => {
    const Role = require('../models/Role');
    const Store = require('../models/Store');
    const User = require('../models/User');
    
    await Role.deleteMany({});
    await Store.deleteMany({});
    await User.deleteMany({});
  });

  // Setup: Create roles, store, and users
  beforeAll(async () => {
    adminRole = await Role.create({ roleName: 'Admin' });
    managerRole = await Role.create({ roleName: 'Manager' });
    storeStaffRole = await Role.create({ roleName: 'StoreStaff' });

    testStore = await Store.create({
      storeName: 'Test Store',
      address: '123 Test Street',
      phone: '+84-123-456-789',
      status: true,
    });

    // Create Admin
    await User.create({
      username: 'admin',
      passwordHash: 'admin123',
      fullName: 'Admin User',
      email: 'admin@test.com',
      roleId: adminRole._id,
      isActive: true,
    });

    // Create Manager
    await User.create({
      username: 'manager',
      passwordHash: 'manager123',
      fullName: 'Manager User',
      email: 'manager@test.com',
      roleId: managerRole._id,
      isActive: true,
    });

    // Create StoreStaff
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

  describe('GET /api/users (View All Users)', () => {
    it('should get all users as Admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(response.body.data)).toBe(true);

      console.log(`✅ Admin can view all users (${response.body.count} users)`);
    });

    it('should get all users as Manager', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      console.log('✅ Manager can view all users');
    });

    it('should fail to get users as StoreStaff (Forbidden)', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');

      console.log('✅ StoreStaff cannot view users (RBAC works)');
    });
  });

  describe('POST /api/users (Create User)', () => {
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
      expect(response.body.data.username).toBe('newuser');
      expect(response.body.data.storeId).toBeNull(); // Manager role = no store

      testUser = response.body.data;
      console.log('✅ Admin can create user');
    });

    it('should create user as Manager', async () => {
      const response = await request(app)
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

      expect(response.body.success).toBe(true);
      console.log('✅ Manager can create user');
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

      console.log('✅ StoreStaff cannot create user');
    });
  });

  describe('PUT /api/users/:id (Update User)', () => {
    let userToUpdate;

    beforeEach(async () => {
      userToUpdate = await User.create({
        username: 'user_to_update',
        passwordHash: 'test123',
        fullName: 'User To Update',
        email: 'update@test.com',
        roleId: managerRole._id,
        isActive: true,
      });
    });

    it('should update user as Admin', async () => {
      const response = await request(app)
        .put(`/api/users/${userToUpdate._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Updated Full Name',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fullName).toBe('Updated Full Name');

      console.log('✅ Admin can update user');
    });

    it('should fail to update user as StoreStaff', async () => {
      await request(app)
        .put(`/api/users/${userToUpdate._id}`)
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .send({
          fullName: 'Unauthorized Update',
        })
        .expect(403);

      console.log('✅ StoreStaff cannot update user');
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

    it('should soft delete user (set isActive: false) as Admin', async () => {
      // Verify user is active before delete
      const userBefore = await User.findById(userToDelete._id);
      expect(userBefore.isActive).toBe(true);

      // Soft delete
      const response = await request(app)
        .delete(`/api/users/${userToDelete._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deactivated');

      // CRITICAL: Verify user still exists in DB but isActive = false
      const userAfter = await User.findById(userToDelete._id);
      expect(userAfter).not.toBeNull(); // Still in DB!
      expect(userAfter.isActive).toBe(false); // But deactivated!

      console.log('✅ Soft delete works: User still in DB, isActive = false');
    });

    it('should fail to soft delete user as Manager (Admin only)', async () => {
      const response = await request(app)
        .delete(`/api/users/${userToDelete._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');

      // Verify user is still active
      const user = await User.findById(userToDelete._id);
      expect(user.isActive).toBe(true);

      console.log('✅ Manager cannot delete user (Admin only)');
    });

    it('should fail to soft delete user as StoreStaff', async () => {
      await request(app)
        .delete(`/api/users/${userToDelete._id}`)
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .expect(403);

      console.log('✅ StoreStaff cannot delete user');
    });
  });

  describe('RBAC (Role-Based Access Control) Summary', () => {
    it('should enforce proper role-based access control', async () => {
      const results = {
        admin: {
          canViewUsers: false,
          canCreateUsers: false,
          canDeleteUsers: false,
        },
        manager: {
          canViewUsers: false,
          canCreateUsers: false,
          canDeleteUsers: false,
        },
        storeStaff: {
          canViewUsers: false,
          canCreateUsers: false,
          canDeleteUsers: false,
        },
      };

      // Test Admin permissions
      const adminView = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      results.admin.canViewUsers = adminView.status === 200;

      const adminCreate = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'rbac_test',
          password: 'test123',
          roleId: managerRole._id.toString(),
        });
      results.admin.canCreateUsers = adminCreate.status === 201;

      const testUserForDelete = await User.create({
        username: 'delete_test',
        passwordHash: 'test123',
        fullName: 'Delete Test User',
        email: 'deletetest@test.com',
        roleId: managerRole._id,
      });

      const adminDelete = await request(app)
        .delete(`/api/users/${testUserForDelete._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      results.admin.canDeleteUsers = adminDelete.status === 200;

      // Test Manager permissions
      const managerView = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${managerToken}`);
      results.manager.canViewUsers = managerView.status === 200;

      const managerCreate = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          username: 'manager_rbac',
          password: 'test123',
          roleId: managerRole._id.toString(),
        });
      results.manager.canCreateUsers = managerCreate.status === 201;

      const managerDelete = await request(app)
        .delete(`/api/users/${testUserForDelete._id}`)
        .set('Authorization', `Bearer ${managerToken}`);
      results.manager.canDeleteUsers = managerDelete.status === 403; // Should fail

      // Test StoreStaff permissions
      const storeView = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${storeStaffToken}`);
      results.storeStaff.canViewUsers = storeView.status === 403; // Should fail

      const storeCreate = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${storeStaffToken}`)
        .send({
          username: 'store_rbac',
          password: 'test123',
          roleId: managerRole._id.toString(),
        });
      results.storeStaff.canCreateUsers = storeCreate.status === 403; // Should fail

      const storeDelete = await request(app)
        .delete(`/api/users/${testUserForDelete._id}`)
        .set('Authorization', `Bearer ${storeStaffToken}`);
      results.storeStaff.canDeleteUsers = storeDelete.status === 403; // Should fail

      // Assertions
      expect(results.admin.canViewUsers).toBe(true);
      expect(results.admin.canCreateUsers).toBe(true);
      expect(results.admin.canDeleteUsers).toBe(true);

      expect(results.manager.canViewUsers).toBe(true);
      expect(results.manager.canCreateUsers).toBe(true);
      expect(results.manager.canDeleteUsers).toBe(true); // Manager CANNOT delete

      expect(results.storeStaff.canViewUsers).toBe(true); // StoreStaff CANNOT view
      expect(results.storeStaff.canCreateUsers).toBe(true); // StoreStaff CANNOT create
      expect(results.storeStaff.canDeleteUsers).toBe(true); // StoreStaff CANNOT delete

      console.log('\n✅ RBAC Summary:');
      console.log('   Admin:      View ✅ | Create ✅ | Delete ✅');
      console.log('   Manager:    View ✅ | Create ✅ | Delete ❌');
      console.log('   StoreStaff: View ❌ | Create ❌ | Delete ❌');
    });
  });
});
