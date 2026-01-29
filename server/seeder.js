require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Role = require('./models/Role');
const Store = require('./models/Store');
const User = require('./models/User');
const Category = require('./models/Category');
const Supplier = require('./models/Supplier');
const Ingredient = require('./models/Ingredient');
const IngredientBatch = require('./models/IngredientBatch');
const Product = require('./models/Product');
const ProductionPlan = require('./models/ProductionPlan');
const Batch = require('./models/BatchModel');
const StoreInventory = require('./models/StoreInventory');

// ============================================================
// SAMPLE DATA DEFINITIONS
// ============================================================

const roles = [
  { roleName: 'Admin' },
  { roleName: 'Manager' },
  { roleName: 'KitchenStaff' },
  { roleName: 'StoreStaff' },
  { roleName: 'Coordinator' },
];

const stores = [
  {
    storeName: 'Kendo Q1 Branch',
    storeCode: 'KD-Q1',
    address: '123 Nguyen Hue Street, District 1, Ho Chi Minh City',
    phone: '+84-28-12345678',
    standardDeliveryMinutes: 30,
    status: 'Active',
  },
  {
    storeName: 'Kendo Q7 Branch',
    storeCode: 'KD-Q7',
    address: '456 Phu My Hung, District 7, Ho Chi Minh City',
    phone: '+84-28-87654321',
    standardDeliveryMinutes: 45,
    status: 'Active',
  },
];

const suppliers = [
  {
    name: 'Golden Harvest Supplier',
    contactPerson: 'Nguyen Van A',
    phone: '+84-28-11111111',
    email: 'contact@goldenharvest.vn',
    address: 'Industrial Zone, Binh Duong Province',
  },
  {
    name: 'Fresh Ingredients Co.',
    contactPerson: 'Tran Thi B',
    phone: '+84-28-22222222',
    email: 'sales@freshingredients.vn',
    address: 'Agricultural Area, Long An Province',
  },
];

const categories = [
  {
    categoryName: 'Mooncake',
    description: 'Traditional and modern mooncake products',
  },
  {
    categoryName: 'Gift Set',
    description: 'Premium gift sets for special occasions',
  },
];

// ============================================================
// MAIN IMPORT FUNCTION
// ============================================================

const importData = async () => {
  try {
    await connectDB();

    console.log('\n🗑️  CLEARING EXISTING DATABASE...');
    console.log('==========================================');
    
    // Drop collections entirely to remove old indexes
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name);
      console.log(`  Dropped collection: ${collection.name}`);
    }
    
    console.log('✅ All collections dropped successfully\n');

    // ========================================
    // STEP 1: SYSTEM SETUP
    // ========================================
    console.log('📋 STEP 1: SYSTEM SETUP');
    console.log('==========================================');

    console.log('Creating Roles...');
    const createdRoles = await Role.insertMany(roles);
    console.log(`✅ ${createdRoles.length} roles created`);

    console.log('Creating Stores...');
    const createdStores = await Store.insertMany(stores);
    console.log(`✅ ${createdStores.length} stores created`);

    const adminRole = createdRoles.find((r) => r.roleName === 'Admin');
    const managerRole = createdRoles.find((r) => r.roleName === 'Manager');
    const kitchenStaffRole = createdRoles.find((r) => r.roleName === 'KitchenStaff');
    const storeStaffRole = createdRoles.find((r) => r.roleName === 'StoreStaff');
    const coordinatorRole = createdRoles.find((r) => r.roleName === 'Coordinator');

    console.log('Creating Users...');

    const adminUser = await User.create({
      username: 'admin',
      passwordHash: 'admin123',
      fullName: 'System Administrator',
      email: 'admin@kendomooncake.com',
      roleId: adminRole._id,
      storeId: null,
      isActive: true,
    });
    console.log(`✅ Admin created: ${adminUser.username}`);

    const managerUser = await User.create({
      username: 'manager',
      passwordHash: 'manager123',
      fullName: 'Operations Manager',
      email: 'manager@kendomooncake.com',
      roleId: managerRole._id,
      storeId: null,
      isActive: true,
    });
    console.log(`✅ Manager created: ${managerUser.username}`);

    const kitchenUser = await User.create({
      username: 'kitchen',
      passwordHash: 'kitchen123',
      fullName: 'Kitchen Staff',
      email: 'kitchen@kendomooncake.com',
      roleId: kitchenStaffRole._id,
      storeId: null,
      isActive: true,
    });
    console.log(`✅ Kitchen Staff created: ${kitchenUser.username}`);

    const storeUser = await User.create({
      username: 'store',
      passwordHash: 'store123',
      fullName: 'Q1 Store Staff',
      email: 'store@kendomooncake.com',
      roleId: storeStaffRole._id,
      storeId: createdStores[0]._id,
      isActive: true,
    });
    console.log(`✅ Store Staff created: ${storeUser.username} (${createdStores[0].storeName})`);

    const coordinatorUser = await User.create({
      username: 'coordinator',
      passwordHash: 'coordinator123',
      fullName: 'Logistics Coordinator',
      email: 'coordinator@kendomooncake.com',
      roleId: coordinatorRole._id,
      storeId: null,
      isActive: true,
    });
    console.log(`✅ Coordinator created: ${coordinatorUser.username}\n`);

    // ========================================
    // STEP 2: INVENTORY INPUT (FEATURE 2)
    // ========================================
    console.log('📦 STEP 2: INVENTORY INPUT (Feature 2 - Traceability)');
    console.log('==========================================');

    console.log('Creating Suppliers...');
    const createdSuppliers = await Supplier.insertMany(suppliers);
    console.log(`✅ ${createdSuppliers.length} suppliers created`);

    console.log('Creating Ingredients (Initial totalQuantity = 0)...');
    const flour = await Ingredient.create({
      ingredientName: 'Flour',
      unit: 'kg',
      costPrice: 25000,
      totalQuantity: 0,
      warningThreshold: 100,
    });
    console.log(`✅ Ingredient created: ${flour.ingredientName}`);

    const sugar = await Ingredient.create({
      ingredientName: 'Sugar',
      unit: 'kg',
      costPrice: 30000,
      totalQuantity: 0,
      warningThreshold: 50,
    });
    console.log(`✅ Ingredient created: ${sugar.ingredientName}`);

    const saltedEgg = await Ingredient.create({
      ingredientName: 'Salted Egg Yolk',
      unit: 'pcs',
      costPrice: 5000,
      totalQuantity: 0,
      warningThreshold: 200,
    });
    console.log(`✅ Ingredient created: ${saltedEgg.ingredientName}`);

    const greenBeanPaste = await Ingredient.create({
      ingredientName: 'Green Bean Paste',
      unit: 'kg',
      costPrice: 80000,
      totalQuantity: 0,
      warningThreshold: 30,
    });
    console.log(`✅ Ingredient created: ${greenBeanPaste.ingredientName}`);

    console.log('\nCreating Ingredient Batches (with supplier and expiry tracking)...');

    const flourBatch = await IngredientBatch.create({
      ingredientId: flour._id,
      supplierId: createdSuppliers[0]._id,
      batchCode: 'IB-FLOUR-20260129-001',
      initialQuantity: 500,
      currentQuantity: 500,
      expiryDate: new Date('2026-12-31'),
      receivedDate: new Date('2026-01-29'),
      price: 25000,
    });
    console.log(`✅ Ingredient Batch created: ${flourBatch.batchCode} - ${flourBatch.currentQuantity} kg`);

    const saltedEggBatch = await IngredientBatch.create({
      ingredientId: saltedEgg._id,
      supplierId: createdSuppliers[1]._id,
      batchCode: 'IB-EGG-20260129-001',
      initialQuantity: 1000,
      currentQuantity: 1000,
      expiryDate: new Date('2026-03-15'),
      receivedDate: new Date('2026-01-29'),
      price: 5000,
    });
    console.log(`✅ Ingredient Batch created: ${saltedEggBatch.batchCode} - ${saltedEggBatch.currentQuantity} pcs`);

    const greenBeanBatch = await IngredientBatch.create({
      ingredientId: greenBeanPaste._id,
      supplierId: createdSuppliers[0]._id,
      batchCode: 'IB-GREENBEAN-20260129-001',
      initialQuantity: 200,
      currentQuantity: 200,
      expiryDate: new Date('2026-06-30'),
      receivedDate: new Date('2026-01-29'),
      price: 80000,
    });
    console.log(`✅ Ingredient Batch created: ${greenBeanBatch.batchCode} - ${greenBeanBatch.currentQuantity} kg`);

    console.log('\nUpdating Ingredient totalQuantity based on batches...');
    flour.totalQuantity = flourBatch.currentQuantity;
    await flour.save();
    console.log(`✅ ${flour.ingredientName}: totalQuantity updated to ${flour.totalQuantity} kg`);

    saltedEgg.totalQuantity = saltedEggBatch.currentQuantity;
    await saltedEgg.save();
    console.log(`✅ ${saltedEgg.ingredientName}: totalQuantity updated to ${saltedEgg.totalQuantity} pcs`);

    greenBeanPaste.totalQuantity = greenBeanBatch.currentQuantity;
    await greenBeanPaste.save();
    console.log(`✅ ${greenBeanPaste.ingredientName}: totalQuantity updated to ${greenBeanPaste.totalQuantity} kg\n`);

    // ========================================
    // STEP 3: PRODUCTION SETUP (FEATURE 3)
    // ========================================
    console.log('🏭 STEP 3: PRODUCTION SETUP (Feature 3)');
    console.log('==========================================');

    console.log('Creating Product Categories...');
    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ ${createdCategories.length} categories created`);

    const mooncakeCategory = createdCategories.find((c) => c.categoryName === 'Mooncake');

    console.log('Creating Products with Recipes...');
    const greenBeanMooncake = await Product.create({
      name: 'Green Bean Mooncake',
      sku: 'MOON-GB-001',
      categoryId: mooncakeCategory._id,
      price: 150000,
      shelfLifeDays: 30,
      image: 'https://example.com/green-bean-mooncake.jpg',
      recipe: [
        { ingredientId: flour._id, quantity: 0.05 },
        { ingredientId: sugar._id, quantity: 0.02 },
        { ingredientId: greenBeanPaste._id, quantity: 0.08 },
        { ingredientId: saltedEgg._id, quantity: 1 },
      ],
      bundleItems: [],
    });
    console.log(`✅ Product created: ${greenBeanMooncake.name} (SKU: ${greenBeanMooncake.sku})`);

    console.log('\nCreating Production Plan...');
    const productionPlan = await ProductionPlan.create({
      planCode: 'PLAN-20260129-001',
      planDate: new Date('2026-01-29'),
      status: 'Completed',
      note: 'Initial production batch for Q1 store',
      details: [
        {
          productId: greenBeanMooncake._id,
          plannedQuantity: 100,
          actualQuantity: 100,
          status: 'Completed',
        },
      ],
    });
    console.log(`✅ Production Plan created: ${productionPlan.planCode}`);
    console.log(`   Status: ${productionPlan.status}`);
    console.log(`   Product: ${greenBeanMooncake.name} - Planned: 100, Actual: 100`);

    console.log('\nCreating Finished Product Batch (CRITICAL: Linked to Production Plan)...');
    const finishedBatch = await Batch.create({
      batchCode: 'BATCH-20260129-MOON-GB-001',
      productionPlanId: productionPlan._id, // CRITICAL TRACEABILITY LINK
      productId: greenBeanMooncake._id,
      mfgDate: new Date('2026-01-29'),
      expDate: new Date('2026-02-28'), // 30 days shelf life
      initialQuantity: 100,
      currentQuantity: 100,
      status: 'Active',
    });
    console.log(`✅ Finished Batch created: ${finishedBatch.batchCode}`);
    console.log(`   Production Plan: ${productionPlan.planCode}`);
    console.log(`   Product: ${greenBeanMooncake.name}`);
    console.log(`   MFG Date: ${finishedBatch.mfgDate.toISOString().split('T')[0]}`);
    console.log(`   EXP Date: ${finishedBatch.expDate.toISOString().split('T')[0]}`);
    console.log(`   Quantity: ${finishedBatch.initialQuantity}`);
    console.log(`   Status: ${finishedBatch.status}\n`);

    // ========================================
    // STEP 4: DISTRIBUTION (FEATURE 5)
    // ========================================
    console.log('🚚 STEP 4: DISTRIBUTION TO STORES');
    console.log('==========================================');

    console.log('Creating Store Inventory (Transfer from Central Kitchen)...');
    const storeInventory = await StoreInventory.create({
      storeId: createdStores[0]._id,
      productId: greenBeanMooncake._id,
      batchId: finishedBatch._id,
      quantity: 20,
    });
    console.log(`✅ Store Inventory created:`);
    console.log(`   Store: ${createdStores[0].storeName}`);
    console.log(`   Product: ${greenBeanMooncake.name}`);
    console.log(`   Batch: ${finishedBatch.batchCode}`);
    console.log(`   Quantity: ${storeInventory.quantity} units`);

    // Update finished batch quantity
    finishedBatch.currentQuantity -= storeInventory.quantity;
    await finishedBatch.save();
    console.log(`✅ Central batch updated: ${finishedBatch.currentQuantity} remaining in central kitchen\n`);

    // ========================================
    // SUMMARY
    // ========================================
    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('==========================================');
    console.log('\n📊 SUMMARY:');
    console.log(`   Roles: ${createdRoles.length}`);
    console.log(`   Stores: ${createdStores.length}`);
    console.log(`   Users: 5 (Admin, Manager, Kitchen Staff, Store Staff, Coordinator)`);
    console.log(`   Suppliers: ${createdSuppliers.length}`);
    console.log(`   Ingredients: 4`);
    console.log(`   Ingredient Batches: 3`);
    console.log(`   Categories: ${createdCategories.length}`);
    console.log(`   Products: 1`);
    console.log(`   Production Plans: 1`);
    console.log(`   Finished Batches: 1`);
    console.log(`   Store Inventories: 1`);

    console.log('\n📝 LOGIN CREDENTIALS:');
    console.log('   Admin:        username: admin        password: admin123');
    console.log('   Manager:      username: manager      password: manager123');
    console.log('   Kitchen:      username: kitchen      password: kitchen123');
    console.log('   Store:        username: store        password: store123');
    console.log('   Coordinator:  username: coordinator  password: coordinator123');

    console.log('\n✅ Traceability Chain Established:');
    console.log('   Supplier → Ingredient Batch → Ingredient → Product Recipe');
    console.log('   Production Plan → Finished Batch → Store Inventory\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR IMPORTING DATA:', error.message);
    console.error(error);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await connectDB();

    console.log('\n🗑️  DELETING ALL DATA...');
    console.log('==========================================');
    await Role.deleteMany({});
    await Store.deleteMany({});
    await User.deleteMany({});
    await Category.deleteMany({});
    await Supplier.deleteMany({});
    await Ingredient.deleteMany({});
    await IngredientBatch.deleteMany({});
    await Product.deleteMany({});
    await ProductionPlan.deleteMany({});
    await Batch.deleteMany({});
    await StoreInventory.deleteMany({});

    console.log('✅ All data destroyed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error destroying data:', error);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
