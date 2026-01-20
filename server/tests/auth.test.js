const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Role = require('../models/Role');
const Store = require('../models/Store');
const User = require('../models/User');

/**
 * Integration Tests for Authentication (Feature 1)
 * Tests: Register, Login, Get Me
 * 
 * NOTE: Register endpoint is now PROTECTED and requires Admin role
 */
describe('Feature 1: Authentication Tests', () => {
  let adminRole;
  let storeStaffRole;
  let testStore;
  let superAdmin;
  let adminToken;

  // GLOBAL SETUP: Clear data and create base Roles/Store/Super Admin
  beforeAll(async () => {
    await Role.deleteMany({});
    await Store.deleteMany({});
    await User.deleteMany({});

    adminRole = await Role.create({ roleName: 'Admin' });
    storeStaffRole = await Role.create({ roleName: 'StoreStaff' });
    
    testStore = await Store.create({
      storeName: 'Test Store',
      address: '123 Test Street',
      phone: '+84-123-456-789',
      status: true,
    });

    // Create Super Admin user for testing protected endpoints
    superAdmin = await User.create({
      username: 'super_admin',
      passwordHash: 'superadmin123',
      fullName: 'Super Admin',
      email: 'superadmin@test.com',
      roleId: adminRole._id,
      isActive: true,
    });

    // Generate JWT token for Super Admin
    adminToken = jwt.sign({ id: superAdmin._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    });
  });

  // GLOBAL TEARDOWN: Clean up after all tests are done
  afterAll(async () => {
    await User.deleteMany({});
    await Store.deleteMany({});
    await Role.deleteMany({});
  });

  // ==========================================
  // 1. REGISTER TESTS
  // ==========================================
  describe('POST /api/auth/register', () => {
    // Clean up specific users created in these tests to prevent interference
    afterEach(async () => {
        await User.deleteMany({ email: { $in: ['admin@test.com', 'store@test.com', 'first@test.com', 'duplicate@test.com'] } });
    });

    describe('Register Admin User', () => {
      it('should create Admin user with storeId = null (Admin authenticated)', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: 'admin_test',
            password: 'admin123',
            fullName: 'Admin Test User',
            email: 'admin@test.com',
            roleId: adminRole._id.toString(),
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User created successfully');
        expect(response.body.user.storeId).toBeNull();
        expect(response.body.token).toBeUndefined(); // No token returned
        console.log('✅ Admin created with storeId = null');
      });
    });

    describe('Register StoreStaff User', () => {
      it('should create StoreStaff user linked to a valid Store (Admin authenticated)', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: 'storestaff_test',
            password: 'store123',
            fullName: 'Store Staff Test User',
            email: 'store@test.com',
            roleId: storeStaffRole._id.toString(),
            storeId: testStore._id.toString(),
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User created successfully');
        expect(response.body.user.storeId).toBe(testStore._id.toString());
        expect(response.body.token).toBeUndefined(); // No token returned
        console.log('✅ StoreStaff created with storeId linked');
      });

      it('should fail to create StoreStaff without storeId (Admin authenticated)', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: 'storestaff_invalid',
            password: 'store123',
            fullName: 'Invalid Store Staff',
            email: 'invalid@test.com',
            roleId: storeStaffRole._id.toString(),
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('StoreStaff must be assigned to a store');
      });
    });

    describe('Duplicate Validation', () => {
      it('should fail with duplicate username (Admin authenticated)', async () => {
        // Create 1st user
        await request(app)
          .post('/api/auth/register')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: 'duplicate_user',
            password: 'test123',
            fullName: 'First User',
            email: 'first@test.com',
            roleId: adminRole._id.toString(),
          });

        // Create 2nd user (Same Username)
        const response = await request(app)
          .post('/api/auth/register')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: 'duplicate_user', 
            password: 'test456',
            fullName: 'Second User',
            email: 'second@test.com',
            roleId: adminRole._id.toString(),
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Username already exists');
        
        // Manual cleanup for this specific test case
        await User.deleteMany({ username: 'duplicate_user' });
      });

      it('should fail with duplicate email (Admin authenticated)', async () => {
        // Create 1st user
        await request(app)
          .post('/api/auth/register')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: 'user1',
            password: 'test123',
            fullName: 'User One',
            email: 'duplicate@test.com',
            roleId: adminRole._id.toString(),
          });

        // Create 2nd user (Same Email)
        const response = await request(app)
          .post('/api/auth/register')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: 'user2',
            password: 'test123',
            fullName: 'User Two',
            email: 'duplicate@test.com', 
            roleId: adminRole._id.toString(),
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Email already exists');
      });
    });

    describe('Authorization & Authentication Tests', () => {
      let storeStaffUser;
      let storeStaffToken;

      beforeAll(async () => {
        // Create a StoreStaff user to test non-admin access
        storeStaffUser = await User.create({
          username: 'store_staff_auth',
          passwordHash: 'staff123',
          fullName: 'Store Staff Auth Test',
          email: 'staffauth@test.com',
          roleId: storeStaffRole._id,
          storeId: testStore._id,
          isActive: true,
        });

        // Generate token for StoreStaff
        storeStaffToken = jwt.sign({ id: storeStaffUser._id }, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRE || '30d',
        });
      });

      afterAll(async () => {
        await User.deleteMany({ username: 'store_staff_auth' });
      });

      it('should fail to register without authentication token', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'no_auth_user',
            password: 'test123',
            fullName: 'No Auth User',
            email: 'noauth@test.com',
            roleId: adminRole._id.toString(),
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Not authorized');
      });

      it('should fail to register with invalid token', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .set('Authorization', 'Bearer invalid_token_12345')
          .send({
            username: 'invalid_token_user',
            password: 'test123',
            fullName: 'Invalid Token User',
            email: 'invalidtoken@test.com',
            roleId: adminRole._id.toString(),
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Not authorized');
      });

      it('should fail to register with non-admin role (StoreStaff)', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .set('Authorization', `Bearer ${storeStaffToken}`)
          .send({
            username: 'unauthorized_user',
            password: 'test123',
            fullName: 'Unauthorized User',
            email: 'unauthorized@test.com',
            roleId: adminRole._id.toString(),
          })
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('not authorized to access this route');
      });
    });
  });

  // ==========================================
  // 2. LOGIN TESTS
  // ==========================================
  describe('POST /api/auth/login', () => {
    
    // CHANGED: Use beforeAll instead of beforeEach to create the user once
    beforeAll(async () => {
      await User.deleteMany({ username: 'login_test' }); // Safety clean
      await User.create({
        username: 'login_test',
        passwordHash: 'correct_password', // Ensure your User model hashes this or accepts raw if testing
        fullName: 'Login Test User',
        email: 'login@test.com',
        roleId: adminRole._id,
        isActive: true,
      });
    });

    // CHANGED: Clean up after all login tests are done
    afterAll(async () => {
        await User.deleteMany({ username: 'login_test' });
        await User.deleteMany({ username: 'deactivated_user' });
    });

    it('should login with correct credentials and return JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'login_test',
          password: 'correct_password',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    it('should fail with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'login_test',
          password: 'wrong_password',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
      console.log('✅ Login rejected with wrong password');
    });

    it('should fail with non-existent username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent_user',
          password: 'anypassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should fail to login deactivated user', async () => {
      // Create user just for this test
      await User.create({
        username: 'deactivated_user',
        passwordHash: 'test123',
        fullName: 'Deactivated User',
        email: 'deactivated@test.com',
        roleId: adminRole._id,
        isActive: false, 
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'deactivated_user',
          password: 'test123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('deactivated');
    });
  });

  // ==========================================
  // 3. GET ME TESTS
  // ==========================================
  describe('GET /api/auth/me', () => {
    let validToken;

    beforeAll(async () => {
      // Login with Super Admin to get a valid token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'super_admin',
          password: 'superadmin123',
        });
      validToken = loginResponse.body.token;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('super_admin');
    });

    it('should fail without token', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token_12345')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message.toLowerCase()).toEqual(expect.stringMatching(/token failed|not authorized|invalid/));
    });
  });
});