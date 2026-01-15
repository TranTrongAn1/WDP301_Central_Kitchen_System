require('dotenv').config({ path: '.env.test' });
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected existing connection');
    }

    let mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    if (!mongoUri.includes('_test')) {
      if (mongoUri.includes('?')) {
        mongoUri = mongoUri.replace(/\/([^/?]+)(\?)/, '/$1_test$2');
      } else {
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

const closeDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('🔌 Test Database Connection Closed');
    }
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
    throw error;
  }
};

beforeAll(async () => {
  await connectDB();
});

afterEach(async () => {
  await clearDB();
});

afterAll(async () => {
  await closeDB();
});

module.exports = {
  connectDB,
  clearDB,
  closeDB,
};
