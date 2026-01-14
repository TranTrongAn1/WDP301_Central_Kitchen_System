require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Role = require('./models/Role');
const Store = require('./models/Store');
const User = require('./models/User');

// Sample data
const roles = [
  { roleName: 'Admin' },
  { roleName: 'Manager' },
  { roleName: 'StoreStaff' },
  { roleName: 'KitchenStaff' },
  { roleName: 'Coordinator' },
];

const stores = [
  {
    storeName: 'Kendo Central Store',
    address: '123 Main Street, District 1, Ho Chi Minh City',
    status: true,
  },
  {
    storeName: 'Kendo North Branch',
    address: '456 Le Loi Street, District 3, Ho Chi Minh City',
    status: true,
  },
  {
    storeName: 'Kendo West Branch',
    address: '789 Nguyen Hue Street, District 5, Ho Chi Minh City',
    status: true,
  },
];

/**
 * Import data into database
 */
const importData = async () => {
  try {
    await connectDB();

    console.log('🗑️  Clearing existing data...');
    await Role.deleteMany();
    await Store.deleteMany();
    await User.deleteMany();

    console.log('📦 Inserting Roles...');
    const createdRoles = await Role.insertMany(roles);
    console.log(`✅ ${createdRoles.length} roles inserted`);

    console.log('📦 Inserting Stores...');
    const createdStores = await Store.insertMany(stores);
    console.log(`✅ ${createdStores.length} stores inserted`);

    // Get role IDs
    const adminRole = createdRoles.find((r) => r.roleName === 'Admin');
    const managerRole = createdRoles.find((r) => r.roleName === 'Manager');
    const storeStaffRole = createdRoles.find((r) => r.roleName === 'StoreStaff');
    const kitchenStaffRole = createdRoles.find((r) => r.roleName === 'KitchenStaff');

    // Create sample users
    console.log('📦 Creating sample users...');

    // Admin user
    const adminUser = await User.create({
      username: 'admin',
      passwordHash: 'admin123', // Will be hashed by pre-save hook
      fullName: 'System Administrator',
      email: 'admin@kendomooncake.com',
      roleId: adminRole._id,
      storeId: null,
      isActive: true,
    });
    console.log(`✅ Admin created: ${adminUser.username}`);

    // Manager user
    const managerUser = await User.create({
      username: 'manager',
      passwordHash: 'manager123',
      fullName: 'Central Manager',
      email: 'manager@kendomooncake.com',
      roleId: managerRole._id,
      storeId: null,
      isActive: true,
    });
    console.log(`✅ Manager created: ${managerUser.username}`);

    // Kitchen Staff user
    const kitchenUser = await User.create({
      username: 'kitchen',
      passwordHash: 'kitchen123',
      fullName: 'Head Chef',
      email: 'kitchen@kendomooncake.com',
      roleId: kitchenStaffRole._id,
      storeId: null,
      isActive: true,
    });
    console.log(`✅ Kitchen Staff created: ${kitchenUser.username}`);

    // Store Staff user for each store
    for (let i = 0; i < createdStores.length; i++) {
      const store = createdStores[i];
      const storeUser = await User.create({
        username: `store${i + 1}`,
        passwordHash: `store${i + 1}123`,
        fullName: `${store.storeName} Staff`,
        email: `store${i + 1}@kendomooncake.com`,
        roleId: storeStaffRole._id,
        storeId: store._id,
        isActive: true,
      });
      console.log(`✅ Store Staff created: ${storeUser.username} (${store.storeName})`);
    }

    console.log('\n🎉 Data imported successfully!');
    console.log('\n📝 Sample Login Credentials:');
    console.log('   Admin:        username: admin      password: admin123');
    console.log('   Manager:      username: manager    password: manager123');
    console.log('   Kitchen:      username: kitchen    password: kitchen123');
    console.log('   Store 1:      username: store1     password: store1123');
    console.log('   Store 2:      username: store2     password: store2123');
    console.log('   Store 3:      username: store3     password: store3123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing data:', error);
    process.exit(1);
  }
};

/**
 * Delete all data from database
 */
const destroyData = async () => {
  try {
    await connectDB();

    console.log('🗑️  Deleting all data...');
    await Role.deleteMany();
    await Store.deleteMany();
    await User.deleteMany();

    console.log('✅ Data destroyed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error destroying data:', error);
    process.exit(1);
  }
};

// Check command line arguments
if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
