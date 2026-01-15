# Integration Testing Guide

## 🎯 Overview

This guide covers the **Automated Integration Testing** setup for the Kendo Mooncake Central Kitchen System, with focus on **Feature 3: Production & Batch Management**.

## 🛠️ Test Stack

- **Jest**: Testing framework
- **Supertest**: HTTP assertions
- **MongoDB**: Separate test database
- **Cross-env**: Environment variable management

## 📁 Test Structure

```
WDP301_Central_Kitchen_System/
├── tests/
│   ├── setup.js              # Test utilities and global setup
│   └── production.test.js    # Production & Batch integration tests
├── jest.config.js            # Jest configuration
├── .env.test                 # Test environment variables
└── package.json              # Test scripts
```

## 🚀 Quick Start

### 1. Install Dependencies

All dependencies should already be installed:
```bash
npm install
```

**Testing dependencies included:**
- `jest` - Testing framework
- `supertest` - HTTP testing
- `cross-env` - Environment variables

### 2. Create Test Environment File

Create `.env.test` in the root directory:

```env
# MongoDB Test Database
MONGO_URI=mongodb://localhost:27017/kendo_mooncake_db

# Server Port
PORT=5001

# Environment
NODE_ENV=test

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_this_in_production_to_something_very_secure
JWT_EXPIRE=30d
```

**Important:** 
- The test setup will automatically append `_test` to your database name
- Example: `kendo_mooncake_db` → `kendo_mooncake_db_test`
- This prevents polluting your development/production database

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📊 Test Database Strategy

### Automatic Test Database Creation

The `tests/setup.js` file automatically handles test database isolation:

```javascript
// Before all tests: Connect to test database
beforeAll(async () => {
  await connectDB(); // Connects to XXX_test database
});

// After each test: Clear all data
afterEach(async () => {
  await clearDB(); // Removes all documents from all collections
});

// After all tests: Close connection
afterAll(async () => {
  await closeDB();
});
```

### Why Separate Database?

1. **Safety**: Never pollutes production/development data
2. **Isolation**: Each test starts with clean slate
3. **Speed**: Can delete all data without worrying
4. **Reliability**: Tests are deterministic and repeatable

## 🧪 Test Scenarios Covered

### Production & Batch Management Tests

#### **Scenario 1: Authentication**
- ✅ Login as Kitchen Staff
- ✅ Receive valid JWT token
- ✅ Token contains correct user information

#### **Scenario 2: Create Production Plan**
- ✅ Create plan with authentication
- ✅ Fail without authentication
- ✅ Plan has correct status ('Planned')
- ✅ Details array properly structured

#### **Scenario 3-4: Complete Production Item (Core Logic)**
- ✅ Auto-create batch with correct batch code format
- ✅ Calculate expiration date: `mfgDate + product.shelfLifeDays`
- ✅ Set correct quantities (initial and current)
- ✅ Update production plan detail status
- ✅ Update production plan status (Planned → In_Progress)
- ✅ Fail without authentication
- ✅ Fail with invalid product ID
- ✅ Fail with zero quantity

#### **Scenario 5: Database Verification**
- ✅ Batch actually saved to MongoDB
- ✅ Batch is queryable from database
- ✅ Production plan updated in database
- ✅ Plan status becomes 'Completed' when all items done

#### **Bonus: Multiple Products**
- ✅ Create plan with multiple products
- ✅ Each product creates separate batch
- ✅ Different shelf lives calculated correctly
- ✅ Plan completed only when all items done

## 📝 Test File Breakdown

### `tests/setup.js`

**Purpose:** Global test setup and utilities

**Functions:**
- `connectDB()` - Connect to test database
- `clearDB()` - Clear all collections
- `closeDB()` - Close database connection

**Global Hooks:**
- `beforeAll()` - Runs once before all tests
- `afterEach()` - Runs after each test (clears data)
- `afterAll()` - Runs once after all tests

### `tests/production.test.js`

**Purpose:** Integration tests for production & batch management

**Test Suites:**
1. Authentication
2. Create Production Plan
3. Complete Production Item
4. Database Verification
5. Multiple Products

**Helper Function:**
```javascript
const setupTestData = async () => {
  // Creates:
  // - Role (KitchenStaff)
  // - User (test_kitchen)
  // - Category
  // - Product (10 days shelf life)
};
```

## 🔍 Example Test Output

### Successful Test Run:

```bash
$ npm test

> wdp301_central_kitchen_system@1.0.0 test
> cross-env NODE_ENV=test jest --detectOpenHandles

✅ Test Database Connected
 PASS  tests/production.test.js (15.234 s)
  Production & Batch Management Integration Tests
    Scenario 1: Authentication
      ✓ should login as Kitchen Staff and receive JWT token (234 ms)
    Scenario 2: Create Production Plan
      ✓ should create a production plan successfully (189 ms)
      ✓ should fail to create plan without authentication (45 ms)
    Scenario 3-4: Complete Production Item and Auto-Create Batch
      ✓ should complete production item and auto-create batch with correct expDate (312 ms)
      ✓ should fail to complete item without authentication (42 ms)
      ✓ should fail to complete item with invalid product ID (87 ms)
      ✓ should fail to complete item with zero quantity (56 ms)
    Scenario 5: Database Verification
      ✓ should save batch to database and be queryable (201 ms)
      ✓ should update production plan status to Completed when all items done (198 ms)
    Bonus: Multiple Products in Production Plan
      ✓ should create separate batches for each product with correct shelf life (334 ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
Snapshots:   0 total
Time:        15.456 s
🔌 Test Database Connection Closed
```

## 🎯 Key Assertions Explained

### 1. Batch Code Format

```javascript
expect(batch.batchCode).toMatch(/^BATCH-\d{8}-TEST-MOON-001/);
```

**Verifies:**
- Starts with "BATCH-"
- Contains date in YYYYMMDD format
- Contains product SKU

**Example:** `BATCH-20260115-TEST-MOON-001`

### 2. Expiration Date Calculation

```javascript
const daysDifference = Math.round(
  (batchExpDate - batchMfgDate) / (1000 * 60 * 60 * 24)
);
expect(daysDifference).toBe(10);
```

**Verifies:**
- expDate = mfgDate + shelfLifeDays
- For test product: 10 days

### 3. Quantity Tracking

```javascript
expect(batch.initialQuantity).toBe(actualQuantity);
expect(batch.currentQuantity).toBe(actualQuantity);
```

**Verifies:**
- Both quantities set correctly
- Initial = Current at creation time

### 4. Status Updates

```javascript
expect(plan.status).toBe('In_Progress');
expect(plan.details[0].status).toBe('Completed');
```

**Verifies:**
- Plan status changes from 'Planned' to 'In_Progress'
- Detail item status changes to 'Completed'

## 🐛 Troubleshooting

### Error: "MongoDB Connection Failed"

**Solution:**
1. Check MongoDB is running
2. Verify MONGO_URI in `.env.test`
3. Ensure test database name doesn't have special characters

### Error: "Jest did not exit one second after the test run"

**Solution:**
- Already handled with `--detectOpenHandles` flag
- If persists, check `afterAll()` hook is closing DB connection

### Error: "Timeout - Async callback was not invoked"

**Solution:**
- Increase timeout in `jest.config.js`:
  ```javascript
  testTimeout: 30000 // 30 seconds
  ```

### Tests Failing with "Invalid Token"

**Solution:**
- Ensure JWT_SECRET in `.env.test` matches your app's secret
- Token should be sent as `Bearer ${token}` in Authorization header

### Tests Pass Individually but Fail When Run Together

**Solution:**
- Likely data pollution issue
- Check `afterEach()` is properly clearing database
- Ensure each test has proper `beforeEach()` setup

## 📊 Coverage Report

Run tests with coverage:

```bash
npm run test:coverage
```

**Output:**
```
--------------------------|---------|----------|---------|---------|
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
All files                 |   85.32 |    78.45 |   90.12 |   86.23 |
 controllers              |   88.67 |    82.14 |   92.31 |   89.45 |
  productionController.js |   91.23 |    85.71 |   95.00 |   92.11 |
  batchController.js      |   86.11 |    78.57 |   89.62 |   86.79 |
 models                   |   82.45 |    74.29 |   88.00 |   83.12 |
  ProductionPlan.js       |   85.00 |    80.00 |   90.00 |   86.00 |
  BatchModel.js           |   79.90 |    68.57 |   86.00 |   80.24 |
--------------------------|---------|----------|---------|---------|
```

## 💡 Best Practices

### 1. Test Naming

```javascript
// ✅ Good: Descriptive, follows pattern
it('should complete production item and auto-create batch with correct expDate', ...)

// ❌ Bad: Vague
it('test batch creation', ...)
```

### 2. Assertions

```javascript
// ✅ Good: Multiple specific assertions
expect(response.body.success).toBe(true);
expect(response.body.data.batch).toBeDefined();
expect(response.body.data.batch.batchCode).toMatch(/^BATCH-/);

// ❌ Bad: Single vague assertion
expect(response.body).toBeTruthy();
```

### 3. Data Setup

```javascript
// ✅ Good: Centralized helper function
beforeEach(async () => {
  await setupTestData();
});

// ❌ Bad: Copy-pasted setup in each test
it('test 1', async () => {
  const role = await Role.create(...);
  const user = await User.create(...);
  // ... duplicate code
});
```

### 4. Cleanup

```javascript
// ✅ Good: Automatic cleanup
afterEach(async () => {
  await clearDB(); // Clears all collections
});

// ❌ Bad: Manual cleanup (easy to forget)
afterEach(async () => {
  await User.deleteMany({});
  await Product.deleteMany({});
  // ... easy to miss a collection
});
```

## 🚀 Running Tests in CI/CD

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:latest
        ports:
          - 27017:27017
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: npm test
        env:
          MONGO_URI: mongodb://localhost:27017/test_db
          JWT_SECRET: test_secret
```

## 📈 Future Test Additions

### Planned Test Suites:

1. **Authentication Tests** (`tests/auth.test.js`)
   - Register, Login, Token validation
   - Role-based access control

2. **Product Management Tests** (`tests/products.test.js`)
   - CRUD operations
   - Recipe and bundle logic

3. **Batch Expiry Tests** (`tests/batch-expiry.test.js`)
   - Query expiring batches
   - Update quantities

4. **End-to-End Tests** (`tests/e2e.test.js`)
   - Complete workflow: Plan → Produce → Batch → Inventory

## 📚 Additional Resources

- **Jest Documentation**: https://jestjs.io/
- **Supertest Documentation**: https://github.com/visionmedia/supertest
- **MongoDB Testing Best Practices**: https://www.mongodb.com/docs/manual/testing/

---

**Need Help?** 
- Check test output for detailed error messages
- Use `console.log()` in tests for debugging
- Run single test file: `npm test tests/production.test.js`
- Run single test: `npm test -- -t "should complete production item"`
