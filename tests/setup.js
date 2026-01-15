require('dotenv').config({ path: '.env.test' });
const mongoose = require('mongoose');

/**
 * Connect to Test Database
 * Uses a separate test database to avoid polluting production/development data
 */
const connectDB = async () => {
  try {
    // If already connected, disconnect first to avoid collision
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected existing connection');
    }

    // Use test database (append _test to database name)
    let mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    // If MONGO_URI doesn't already end with _test, append it
    if (!mongoUri.includes('_test')) {
      // Handle both local and Atlas URIs
      if (mongoUri.includes('?')) {
        // Atlas URI with query params
        mongoUri = mongoUri.replace(/\/([^/?]+)(\?)/, '/$1_test$2');
      } else {
        // Local URI without query params
        mongoUri = mongoUri.replace(/\/([^/?]+)$/, '/$1_test');
      }
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Test Database Connected');
  } catch (error) {
    console.error('❌ Test Database Connection Error:', error.message);
    process.exit(1);
  }
};

/**
 * Clear all collections in the test database
 * Call this in beforeEach or afterEach to ensure clean state
 */
const clearDB = async () => {
  try {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    
    console.log('🧹 Test Database Cleared');
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    throw error;
  }
};

/**
 * Close database connection
 * Call this in afterAll to clean up
 */
const closeDB = async () => {
  try {
    // Only close if there's an active connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('🔌 Test Database Connection Closed');
    }
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
    throw error;
  }
};

/**
 * Setup: Run before all tests
 */
beforeAll(async () => {
  await connectDB();
});

/**
 * Cleanup: Run after each test to ensure clean slate
 */
afterEach(async () => {
  await clearDB();
});

/**
 * Teardown: Run after all tests
 */
afterAll(async () => {
  await closeDB();
});

// Export utilities for use in test files
module.exports = {
  connectDB,
  clearDB,
  closeDB,
};
