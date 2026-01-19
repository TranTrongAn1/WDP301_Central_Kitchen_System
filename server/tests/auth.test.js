const request = require('supertest');
const app = require('../app');
const Role = require('../models/Role');
const Store = require('../models/Store');
const User = require('../models/User');

/**
 * Integration Tests for Authentication (Feature 1)
 * Tests: Register, Login, Get Me
 */
describe('Feature 1: Authentication Tests', () => {
  let adminRole;
  let storeStaffRole;
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

  // Setup: Create roles and store before all tests
  beforeAll(async () => {
    adminRole = await Role.create({ roleName: 'Admin' });
    storeStaffRole = await Role.create({ roleName: 'StoreStaff' });
    
    testStore = await Store.create({
      storeName: 'Test Store',
      address: '123 Test Street',
      phone: '+84-123-456-789',
      status: true,
    });
  });

  describe('POST /api/auth/register', () => {
    describe('Register Admin User', () => {
      it('should create Admin user with storeId = null', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'admin_test',
            password: 'admin123',
            fullName: 'Admin Test User',
            email: 'admin@test.com',
            roleId: adminRole._id.toString(),
            // No storeId provided for Admin
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.user).toBeDefined();
        expect(response.body.user.role).toBe('Admin');
        expect(response.body.user.storeId).toBeNull(); // CRITICAL: Admin should have null storeId
        expect(response.body.user.storeName).toBeNull();

        console.log('✅ Admin created with storeId = null');
      });
    });

    describe('Register StoreStaff User', () => {
      it('should create StoreStaff user linked to a valid Store', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'storestaff_test',
            password: 'store123',
            fullName: 'Store Staff Test User',
            email: 'store@test.com',
            roleId: storeStaffRole._id.toString(),
            storeId: testStore._id.toString(), // StoreStaff MUST have storeId
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.user.role).toBe('StoreStaff');
        expect(response.body.user.storeId).toBe(testStore._id.toString()); // CRITICAL: Linked to store
        expect(response.body.user.storeName).toBe('Test Store');

        console.log('✅ StoreStaff created with storeId linked');
      });

      it('should fail to create StoreStaff without storeId', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'storestaff_invalid',
            password: 'store123',
            fullName: 'Invalid Store Staff',
            email: 'invalid@test.com',
            roleId: storeStaffRole._id.toString(),
            // Missing storeId for StoreStaff
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('StoreStaff must be assigned to a store');

        console.log('✅ Validation works: StoreStaff requires storeId');
      });
    });

    describe('Duplicate Validation', () => {
      it('should fail with duplicate username', async () => {
        // First user
        await request(app)
          .post('/api/auth/register')
          .send({
            username: 'duplicate_user',
            password: 'test123',
            fullName: 'First User',
            email: 'first@test.com',
            roleId: adminRole._id.toString(),
          })
          .expect(201);

        // Try to create with same username
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'duplicate_user', // Same username
            password: 'test456',
            fullName: 'Second User',
            email: 'second@test.com',
            roleId: adminRole._id.toString(),
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Username already exists');
      });

      it('should fail with duplicate email', async () => {
        await request(app)
          .post('/api/auth/register')
          .send({
            username: 'user1',
            password: 'test123',
            fullName: 'User One',
            email: 'duplicate@test.com',
            roleId: adminRole._id.toString(),
          })
          .expect(201);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'user2',
            password: 'test123',
            fullName: 'User Two',
            email: 'duplicate@test.com', // Same email
            roleId: adminRole._id.toString(),
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Email already exists');
      });
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await User.create({
        username: 'login_test',
        passwordHash: 'correct_password',
        fullName: 'Login Test User',
        email: 'login@test.com',
        roleId: adminRole._id,
        isActive: true,
      });
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
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('login_test');

      console.log('✅ Login successful with JWT token');
    });

    it('should fail with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'login_test',
          password: 'wrong_password', // Wrong password
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
      // Create and deactivate a user
      await User.create({
        username: 'deactivated_user',
        passwordHash: 'test123',
        fullName: 'Deactivated User',
        email: 'deactivated@test.com',
        roleId: adminRole._id,
        isActive: false, // Deactivated
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

  describe('GET /api/auth/me', () => {
    let validToken;

    beforeEach(async () => {
      // Register and login to get valid token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'me_test',
          password: 'test123',
          fullName: 'Me Test User',
          email: 'me@test.com',
          roleId: adminRole._id.toString(),
        });

      validToken = registerResponse.body.token;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.username).toBe('me_test');
      expect(response.body.data.role).toBe('Admin');
      expect(response.body.data.isActive).toBe(true);

      console.log('✅ Get Me endpoint works with valid token');
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        // No Authorization header
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authorized');

      console.log('✅ Get Me rejected without token');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token_12345')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('invalid token');
    });
  });
});
