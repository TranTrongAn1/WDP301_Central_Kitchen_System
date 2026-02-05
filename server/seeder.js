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
const Order = require('./models/Order');
const DeliveryTrip = require('./models/DeliveryTrip');
const Feedback = require('./models/Feedback');

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
    storeName: 'Kendo District 1 Branch',
    storeCode: 'KD-Q1',
    address: '123 Nguyen Hue Street, District 1, Ho Chi Minh City',
    phone: '+84-28-12345678',
    standardDeliveryMinutes: 30,
    status: 'Active',
  },
  {
    storeName: 'Kendo District 2 Branch',
    storeCode: 'KD-Q2',
    address: '456 Thao Dien Street, District 2, Ho Chi Minh City',
    phone: '+84-28-22222222',
    standardDeliveryMinutes: 40,
    status: 'Active',
  },
  {
    storeName: 'Kendo District 3 Branch',
    storeCode: 'KD-Q3',
    address: '789 Vo Van Tan Street, District 3, Ho Chi Minh City',
    phone: '+84-28-33333333',
    standardDeliveryMinutes: 25,
    status: 'Active',
  },
  {
    storeName: 'Kendo District 7 Branch',
    storeCode: 'KD-Q7',
    address: '321 Phu My Hung, District 7, Ho Chi Minh City',
    phone: '+84-28-77777777',
    standardDeliveryMinutes: 45,
    status: 'Active',
  },
  {
    storeName: 'Kendo Binh Thanh Branch',
    storeCode: 'KD-BT',
    address: '654 Xo Viet Nghe Tinh Street, Binh Thanh District, Ho Chi Minh City',
    phone: '+84-28-88888888',
    standardDeliveryMinutes: 35,
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

const systemSettings = [
  {
    key: 'SHIPPING_COST_BASE',
    value: '50000',
    description: 'Base shipping cost in VND',
    isPublic: true,
  },
  {
    key: 'TAX_RATE',
    value: '0.08',
    description: 'Tax rate (8%)',
    isPublic: true,
  },
  {
    key: 'MIN_ORDER_VALUE',
    value: '500000',
    description: 'Minimum order value in VND',
    isPublic: true,
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

    // ========================================
    // STEP 1.5: SYSTEM SETTINGS
    // ========================================
    console.log('\n⚙️  STEP 1.5: SYSTEM SETTINGS');
    console.log('==========================================')

    console.log('Creating System Settings...');
    const createdSettings = await SystemSetting.insertMany(systemSettings);
    console.log(`✅ ${createdSettings.length} system settings created`);
    createdSettings.forEach(setting => {
      console.log(`   ${setting.key}: ${setting.value}`);
    });
    console.log('');

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

    const oil = await Ingredient.create({
      ingredientName: 'Vegetable Oil',
      unit: 'liter',
      costPrice: 40000,
      totalQuantity: 0,
      warningThreshold: 30,
    });
    console.log(`✅ Ingredient created: ${oil.ingredientName}`);

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

    const lotusSeedPaste = await Ingredient.create({
      ingredientName: 'Lotus Seed Paste',
      unit: 'kg',
      costPrice: 95000,
      totalQuantity: 0,
      warningThreshold: 25,
    });
    console.log(`✅ Ingredient created: ${lotusSeedPaste.ingredientName}`);

    const taroPaste = await Ingredient.create({
      ingredientName: 'Taro Paste',
      unit: 'kg',
      costPrice: 70000,
      totalQuantity: 0,
      warningThreshold: 20,
    });
    console.log(`✅ Ingredient created: ${taroPaste.ingredientName}`);

    const durianPaste = await Ingredient.create({
      ingredientName: 'Durian Paste',
      unit: 'kg',
      costPrice: 120000,
      totalQuantity: 0,
      warningThreshold: 15,
    });
    console.log(`✅ Ingredient created: ${durianPaste.ingredientName}`);

    const mixedNuts = await Ingredient.create({
      ingredientName: 'Mixed Nuts',
      unit: 'kg',
      costPrice: 150000,
      totalQuantity: 0,
      warningThreshold: 20,
    });
    console.log(`✅ Ingredient created: ${mixedNuts.ingredientName}`);

    const preservatives = await Ingredient.create({
      ingredientName: 'Food Preservatives',
      unit: 'kg',
      costPrice: 50000,
      totalQuantity: 0,
      warningThreshold: 10,
    });
    console.log(`✅ Ingredient created: ${preservatives.ingredientName}`);

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

    const sugarBatch = await IngredientBatch.create({
      ingredientId: sugar._id,
      supplierId: createdSuppliers[0]._id,
      batchCode: 'IB-SUGAR-20260129-001',
      initialQuantity: 300,
      currentQuantity: 300,
      expiryDate: new Date('2026-12-31'),
      receivedDate: new Date('2026-01-29'),
      price: 30000,
    });
    console.log(`✅ Ingredient Batch created: ${sugarBatch.batchCode} - ${sugarBatch.currentQuantity} kg`);

    const oilBatch = await IngredientBatch.create({
      ingredientId: oil._id,
      supplierId: createdSuppliers[1]._id,
      batchCode: 'IB-OIL-20260129-001',
      initialQuantity: 200,
      currentQuantity: 200,
      expiryDate: new Date('2026-11-30'),
      receivedDate: new Date('2026-01-29'),
      price: 40000,
    });
    console.log(`✅ Ingredient Batch created: ${oilBatch.batchCode} - ${oilBatch.currentQuantity} liters`);

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

    const lotusBatch = await IngredientBatch.create({
      ingredientId: lotusSeedPaste._id,
      supplierId: createdSuppliers[0]._id,
      batchCode: 'IB-LOTUS-20260129-001',
      initialQuantity: 150,
      currentQuantity: 150,
      expiryDate: new Date('2026-06-30'),
      receivedDate: new Date('2026-01-29'),
      price: 95000,
    });
    console.log(`✅ Ingredient Batch created: ${lotusBatch.batchCode} - ${lotusBatch.currentQuantity} kg`);

    const taroBatch = await IngredientBatch.create({
      ingredientId: taroPaste._id,
      supplierId: createdSuppliers[1]._id,
      batchCode: 'IB-TARO-20260129-001',
      initialQuantity: 120,
      currentQuantity: 120,
      expiryDate: new Date('2026-05-31'),
      receivedDate: new Date('2026-01-29'),
      price: 70000,
    });
    console.log(`✅ Ingredient Batch created: ${taroBatch.batchCode} - ${taroBatch.currentQuantity} kg`);

    const durianBatch = await IngredientBatch.create({
      ingredientId: durianPaste._id,
      supplierId: createdSuppliers[1]._id,
      batchCode: 'IB-DURIAN-20260129-001',
      initialQuantity: 100,
      currentQuantity: 100,
      expiryDate: new Date('2026-04-30'),
      receivedDate: new Date('2026-01-29'),
      price: 120000,
    });
    console.log(`✅ Ingredient Batch created: ${durianBatch.batchCode} - ${durianBatch.currentQuantity} kg`);

    const nutsBatch = await IngredientBatch.create({
      ingredientId: mixedNuts._id,
      supplierId: createdSuppliers[0]._id,
      batchCode: 'IB-NUTS-20260129-001',
      initialQuantity: 80,
      currentQuantity: 80,
      expiryDate: new Date('2026-08-31'),
      receivedDate: new Date('2026-01-29'),
      price: 150000,
    });
    console.log(`✅ Ingredient Batch created: ${nutsBatch.batchCode} - ${nutsBatch.currentQuantity} kg`);

    const preservBatch = await IngredientBatch.create({
      ingredientId: preservatives._id,
      supplierId: createdSuppliers[0]._id,
      batchCode: 'IB-PRESERV-20260129-001',
      initialQuantity: 50,
      currentQuantity: 50,
      expiryDate: new Date('2027-01-31'),
      receivedDate: new Date('2026-01-29'),
      price: 50000,
    });
    console.log(`✅ Ingredient Batch created: ${preservBatch.batchCode} - ${preservBatch.currentQuantity} kg`);

    console.log('\nUpdating Ingredient totalQuantity based on batches...');
    flour.totalQuantity = flourBatch.currentQuantity;
    await flour.save();
    console.log(`✅ ${flour.ingredientName}: totalQuantity updated to ${flour.totalQuantity} kg`);

    sugar.totalQuantity = sugarBatch.currentQuantity;
    await sugar.save();
    console.log(`✅ ${sugar.ingredientName}: totalQuantity updated to ${sugar.totalQuantity} kg`);

    oil.totalQuantity = oilBatch.currentQuantity;
    await oil.save();
    console.log(`✅ ${oil.ingredientName}: totalQuantity updated to ${oil.totalQuantity} liters`);

    saltedEgg.totalQuantity = saltedEggBatch.currentQuantity;
    await saltedEgg.save();
    console.log(`✅ ${saltedEgg.ingredientName}: totalQuantity updated to ${saltedEgg.totalQuantity} pcs`);

    greenBeanPaste.totalQuantity = greenBeanBatch.currentQuantity;
    await greenBeanPaste.save();
    console.log(`✅ ${greenBeanPaste.ingredientName}: totalQuantity updated to ${greenBeanPaste.totalQuantity} kg`);

    lotusSeedPaste.totalQuantity = lotusBatch.currentQuantity;
    await lotusSeedPaste.save();
    console.log(`✅ ${lotusSeedPaste.ingredientName}: totalQuantity updated to ${lotusSeedPaste.totalQuantity} kg`);

    taroPaste.totalQuantity = taroBatch.currentQuantity;
    await taroPaste.save();
    console.log(`✅ ${taroPaste.ingredientName}: totalQuantity updated to ${taroPaste.totalQuantity} kg`);

    durianPaste.totalQuantity = durianBatch.currentQuantity;
    await durianPaste.save();
    console.log(`✅ ${durianPaste.ingredientName}: totalQuantity updated to ${durianPaste.totalQuantity} kg`);

    mixedNuts.totalQuantity = nutsBatch.currentQuantity;
    await mixedNuts.save();
    console.log(`✅ ${mixedNuts.ingredientName}: totalQuantity updated to ${mixedNuts.totalQuantity} kg`);

    preservatives.totalQuantity = preservBatch.currentQuantity;
    await preservatives.save();
    console.log(`✅ ${preservatives.ingredientName}: totalQuantity updated to ${preservatives.totalQuantity} kg\n`);

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
      unit: 'box',
      shelfLifeDays: 30,
      image: 'https://example.com/green-bean-mooncake.jpg',
      recipe: [
        { ingredientId: flour._id, quantity: 0.05 },
        { ingredientId: sugar._id, quantity: 0.02 },
        { ingredientId: oil._id, quantity: 0.01 },
        { ingredientId: greenBeanPaste._id, quantity: 0.08 },
        { ingredientId: saltedEgg._id, quantity: 1 },
      ],
      bundleItems: [],
    });
    console.log(`✅ Product created: ${greenBeanMooncake.name} (SKU: ${greenBeanMooncake.sku})`);

    const mixedNutsMooncake = await Product.create({
      name: 'Mixed Nuts Mooncake',
      sku: 'MOON-NUT-002',
      categoryId: mooncakeCategory._id,
      price: 180000,
      unit: 'box',
      shelfLifeDays: 30,
      image: 'https://example.com/mixed-nuts-mooncake.jpg',
      recipe: [
        { ingredientId: flour._id, quantity: 0.05 },
        { ingredientId: sugar._id, quantity: 0.03 },
        { ingredientId: oil._id, quantity: 0.01 },
        { ingredientId: mixedNuts._id, quantity: 0.1 },
        { ingredientId: saltedEgg._id, quantity: 1 },
      ],
      bundleItems: [],
    });
    console.log(`✅ Product created: ${mixedNutsMooncake.name} (SKU: ${mixedNutsMooncake.sku})`);

    const lotusSeedMooncake = await Product.create({
      name: 'Lotus Seed Mooncake',
      sku: 'MOON-LOTUS-003',
      categoryId: mooncakeCategory._id,
      price: 165000,
      unit: 'box',
      shelfLifeDays: 30,
      image: 'https://example.com/lotus-seed-mooncake.jpg',
      recipe: [
        { ingredientId: flour._id, quantity: 0.05 },
        { ingredientId: sugar._id, quantity: 0.02 },
        { ingredientId: oil._id, quantity: 0.01 },
        { ingredientId: lotusSeedPaste._id, quantity: 0.09 },
        { ingredientId: saltedEgg._id, quantity: 1 },
      ],
      bundleItems: [],
    });
    console.log(`✅ Product created: ${lotusSeedMooncake.name} (SKU: ${lotusSeedMooncake.sku})`);

    const taroMooncake = await Product.create({
      name: 'Taro Mooncake',
      sku: 'MOON-TARO-004',
      categoryId: mooncakeCategory._id,
      price: 145000,
      unit: 'box',
      shelfLifeDays: 30,
      image: 'https://example.com/taro-mooncake.jpg',
      recipe: [
        { ingredientId: flour._id, quantity: 0.05 },
        { ingredientId: sugar._id, quantity: 0.02 },
        { ingredientId: oil._id, quantity: 0.01 },
        { ingredientId: taroPaste._id, quantity: 0.08 },
        { ingredientId: saltedEgg._id, quantity: 1 },
      ],
      bundleItems: [],
    });
    console.log(`✅ Product created: ${taroMooncake.name} (SKU: ${taroMooncake.sku})`);

    const durianMooncake = await Product.create({
      name: 'Durian Mooncake',
      sku: 'MOON-DURIAN-005',
      categoryId: mooncakeCategory._id,
      price: 200000,
      unit: 'box',
      shelfLifeDays: 25,
      image: 'https://example.com/durian-mooncake.jpg',
      recipe: [
        { ingredientId: flour._id, quantity: 0.05 },
        { ingredientId: sugar._id, quantity: 0.02 },
        { ingredientId: oil._id, quantity: 0.01 },
        { ingredientId: durianPaste._id, quantity: 0.1 },
        { ingredientId: saltedEgg._id, quantity: 1 },
      ],
      bundleItems: [],
    });
    console.log(`✅ Product created: ${durianMooncake.name} (SKU: ${durianMooncake.sku})`);

    console.log('\nCreating Production Plan...');
    const productionPlan = await ProductionPlan.create({
      planCode: 'PLAN-20260129-001',
      planDate: new Date('2026-01-29'),
      status: 'Completed',
      note: 'Initial production batch for all stores',
      details: [
        {
          productId: greenBeanMooncake._id,
          plannedQuantity: 200,
          actualQuantity: 200,
          status: 'Completed',
        },
        {
          productId: mixedNutsMooncake._id,
          plannedQuantity: 150,
          actualQuantity: 150,
          status: 'Completed',
        },
        {
          productId: lotusSeedMooncake._id,
          plannedQuantity: 180,
          actualQuantity: 180,
          status: 'Completed',
        },
        {
          productId: taroMooncake._id,
          plannedQuantity: 160,
          actualQuantity: 160,
          status: 'Completed',
        },
        {
          productId: durianMooncake._id,
          plannedQuantity: 100,
          actualQuantity: 100,
          status: 'Completed',
        },
      ],
    });
    console.log(`✅ Production Plan created: ${productionPlan.planCode}`);
    console.log(`   Status: ${productionPlan.status}`);
    console.log(`   Total Products: 5`);

    console.log('\nCreating Finished Product Batches (CRITICAL: Linked to Production Plan)...');
    const finishedGreenBeanBatch = await Batch.create({
      batchCode: 'BATCH-20260129-GB-001',
      productionPlanId: productionPlan._id,
      productId: greenBeanMooncake._id,
      mfgDate: new Date('2026-01-29'),
      expDate: new Date('2026-02-28'),
      initialQuantity: 200,
      currentQuantity: 200,
      status: 'Active',
    });
    console.log(`✅ Batch created: ${finishedGreenBeanBatch.batchCode} - ${finishedGreenBeanBatch.initialQuantity} units`);

    const finishedMixedNutsBatch = await Batch.create({
      batchCode: 'BATCH-20260129-NUT-002',
      productionPlanId: productionPlan._id,
      productId: mixedNutsMooncake._id,
      mfgDate: new Date('2026-01-29'),
      expDate: new Date('2026-02-28'),
      initialQuantity: 150,
      currentQuantity: 150,
      status: 'Active',
    });
    console.log(`✅ Batch created: ${finishedMixedNutsBatch.batchCode} - ${finishedMixedNutsBatch.initialQuantity} units`);

    const finishedLotusSeedBatch = await Batch.create({
      batchCode: 'BATCH-20260129-LOTUS-003',
      productionPlanId: productionPlan._id,
      productId: lotusSeedMooncake._id,
      mfgDate: new Date('2026-01-29'),
      expDate: new Date('2026-02-28'),
      initialQuantity: 180,
      currentQuantity: 180,
      status: 'Active',
    });
    console.log(`✅ Batch created: ${finishedLotusSeedBatch.batchCode} - ${finishedLotusSeedBatch.initialQuantity} units`);

    const finishedTaroBatch = await Batch.create({
      batchCode: 'BATCH-20260129-TARO-004',
      productionPlanId: productionPlan._id,
      productId: taroMooncake._id,
      mfgDate: new Date('2026-01-29'),
      expDate: new Date('2026-02-28'),
      initialQuantity: 160,
      currentQuantity: 160,
      status: 'Active',
    });
    console.log(`✅ Batch created: ${finishedTaroBatch.batchCode} - ${finishedTaroBatch.initialQuantity} units`);

    const finishedDurianBatch = await Batch.create({
      batchCode: 'BATCH-20260129-DURIAN-005',
      productionPlanId: productionPlan._id,
      productId: durianMooncake._id,
      mfgDate: new Date('2026-01-29'),
      expDate: new Date('2026-02-23'),
      initialQuantity: 100,
      currentQuantity: 100,
      status: 'Active',
    });
    console.log(`✅ Batch created: ${finishedDurianBatch.batchCode} - ${finishedDurianBatch.initialQuantity} units\n`);

    // ========================================
    // STEP 4: ORDERS & DISTRIBUTION (FEATURE 4 & 5)
    // ========================================
    console.log('📦 STEP 4: ORDERS & DISTRIBUTION (Features 4 & 5)');
    console.log('==========================================');

    console.log('Creating 20 Orders with different statuses...');

    // Helper function to calculate order total
    const createOrderWithPricing = async (orderData) => {
      const enrichedItems = [];
      let totalAmount = 0;

      for (const item of orderData.items) {
        const product = await Product.findById(item.productId);
        const unitPrice = product.price;
        const subtotal = unitPrice * item.quantity;
        totalAmount += subtotal;

        enrichedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          subtotal,
          batchId: item.batchId || null,
        });
      }

      return await Order.create({
        ...orderData,
        items: enrichedItems,
        totalAmount,
      });
    };

    // === PENDING ORDERS (5) ===
    console.log('\n--- Creating 5 PENDING Orders ---');
    const pendingOrder1 = await createOrderWithPricing({
      storeId: createdStores[0]._id,
      createdBy: storeUser._id,
      requestedDeliveryDate: new Date('2026-02-10'),
      status: 'Pending',
      items: [
        { productId: greenBeanMooncake._id, quantity: 20 },
        { productId: mixedNutsMooncake._id, quantity: 15 },
      ],
      notes: 'Urgent order for upcoming event',
    });
    console.log(`✅ Order ${pendingOrder1.orderCode}: Pending - Total: ${pendingOrder1.totalAmount.toLocaleString()} VND`);

    const pendingOrder2 = await createOrderWithPricing({
      storeId: createdStores[1]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-11'),
      status: 'Pending',
      items: [
        { productId: lotusSeedMooncake._id, quantity: 25 },
      ],
      notes: 'Regular stock replenishment',
    });
    console.log(`✅ Order ${pendingOrder2.orderCode}: Pending - Total: ${pendingOrder2.totalAmount.toLocaleString()} VND`);

    const pendingOrder3 = await createOrderWithPricing({
      storeId: createdStores[2]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-12'),
      status: 'Pending',
      items: [
        { productId: taroMooncake._id, quantity: 30 },
        { productId: durianMooncake._id, quantity: 10 },
      ],
    });
    console.log(`✅ Order ${pendingOrder3.orderCode}: Pending - Total: ${pendingOrder3.totalAmount.toLocaleString()} VND`);

    const pendingOrder4 = await createOrderWithPricing({
      storeId: createdStores[3]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-13'),
      status: 'Pending',
      items: [
        { productId: greenBeanMooncake._id, quantity: 18 },
        { productId: lotusSeedMooncake._id, quantity: 22 },
      ],
    });
    console.log(`✅ Order ${pendingOrder4.orderCode}: Pending - Total: ${pendingOrder4.totalAmount.toLocaleString()} VND`);

    const pendingOrder5 = await createOrderWithPricing({
      storeId: createdStores[4]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-14'),
      status: 'Pending',
      items: [
        { productId: mixedNutsMooncake._id, quantity: 20 },
        { productId: durianMooncake._id, quantity: 15 },
      ],
    });
    console.log(`✅ Order ${pendingOrder5.orderCode}: Pending - Total: ${pendingOrder5.totalAmount.toLocaleString()} VND`);

    // === APPROVED ORDERS (5) ===
    console.log('\n--- Creating 5 APPROVED Orders ---');
    const approvedOrder1 = await createOrderWithPricing({
      storeId: createdStores[0]._id,
      createdBy: storeUser._id,
      requestedDeliveryDate: new Date('2026-02-08'),
      status: 'Approved',
      items: [
        { productId: greenBeanMooncake._id, quantity: 15, batchId: finishedGreenBeanBatch._id },
        { productId: taroMooncake._id, quantity: 12, batchId: finishedTaroBatch._id },
      ],
      approvedBy: kitchenUser._id,
      approvedDate: new Date('2026-02-01'),
    });
    console.log(`✅ Order ${approvedOrder1.orderCode}: Approved - Total: ${approvedOrder1.totalAmount.toLocaleString()} VND`);

    const approvedOrder2 = await createOrderWithPricing({
      storeId: createdStores[1]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-08'),
      status: 'Approved',
      items: [
        { productId: lotusSeedMooncake._id, quantity: 20, batchId: finishedLotusSeedBatch._id },
      ],
      approvedBy: managerUser._id,
      approvedDate: new Date('2026-02-01'),
    });
    console.log(`✅ Order ${approvedOrder2.orderCode}: Approved - Total: ${approvedOrder2.totalAmount.toLocaleString()} VND`);

    const approvedOrder3 = await createOrderWithPricing({
      storeId: createdStores[2]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-09'),
      status: 'Approved',
      items: [
        { productId: mixedNutsMooncake._id, quantity: 18, batchId: finishedMixedNutsBatch._id },
        { productId: durianMooncake._id, quantity: 8, batchId: finishedDurianBatch._id },
      ],
      approvedBy: kitchenUser._id,
      approvedDate: new Date('2026-02-02'),
    });
    console.log(`✅ Order ${approvedOrder3.orderCode}: Approved - Total: ${approvedOrder3.totalAmount.toLocaleString()} VND`);

    const approvedOrder4 = await createOrderWithPricing({
      storeId: createdStores[3]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-09'),
      status: 'Approved',
      items: [
        { productId: greenBeanMooncake._id, quantity: 25, batchId: finishedGreenBeanBatch._id },
      ],
      approvedBy: managerUser._id,
      approvedDate: new Date('2026-02-02'),
    });
    console.log(`✅ Order ${approvedOrder4.orderCode}: Approved - Total: ${approvedOrder4.totalAmount.toLocaleString()} VND`);

    const approvedOrder5 = await createOrderWithPricing({
      storeId: createdStores[4]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-10'),
      status: 'Approved',
      items: [
        { productId: taroMooncake._id, quantity: 22, batchId: finishedTaroBatch._id },
        { productId: lotusSeedMooncake._id, quantity: 16, batchId: finishedLotusSeedBatch._id },
      ],
      approvedBy: kitchenUser._id,
      approvedDate: new Date('2026-02-03'),
    });
    console.log(`✅ Order ${approvedOrder5.orderCode}: Approved - Total: ${approvedOrder5.totalAmount.toLocaleString()} VND`);

    // === IN_TRANSIT ORDERS (5) with Delivery Trips ===
    console.log('\n--- Creating 5 IN_TRANSIT Orders with Delivery Trips ---');
    const transitOrder1 = await createOrderWithPricing({
      storeId: createdStores[0]._id,
      createdBy: storeUser._id,
      requestedDeliveryDate: new Date('2026-02-06'),
      status: 'In_Transit',
      items: [
        { productId: greenBeanMooncake._id, quantity: 10, batchId: finishedGreenBeanBatch._id },
        { productId: mixedNutsMooncake._id, quantity: 8, batchId: finishedMixedNutsBatch._id },
      ],
      approvedBy: managerUser._id,
      approvedDate: new Date('2026-01-30'),
      shippedDate: new Date('2026-02-04'),
    });
    console.log(`✅ Order ${transitOrder1.orderCode}: In_Transit - Total: ${transitOrder1.totalAmount.toLocaleString()} VND`);

    const transitOrder2 = await createOrderWithPricing({
      storeId: createdStores[1]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-06'),
      status: 'In_Transit',
      items: [
        { productId: lotusSeedMooncake._id, quantity: 15, batchId: finishedLotusSeedBatch._id },
      ],
      approvedBy: kitchenUser._id,
      approvedDate: new Date('2026-01-31'),
      shippedDate: new Date('2026-02-04'),
    });
    console.log(`✅ Order ${transitOrder2.orderCode}: In_Transit - Total: ${transitOrder2.totalAmount.toLocaleString()} VND`);

    const transitOrder3 = await createOrderWithPricing({
      storeId: createdStores[2]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-07'),
      status: 'In_Transit',
      items: [
        { productId: taroMooncake._id, quantity: 20, batchId: finishedTaroBatch._id },
        { productId: durianMooncake._id, quantity: 5, batchId: finishedDurianBatch._id },
      ],
      approvedBy: managerUser._id,
      approvedDate: new Date('2026-02-01'),
      shippedDate: new Date('2026-02-05'),
    });
    console.log(`✅ Order ${transitOrder3.orderCode}: In_Transit - Total: ${transitOrder3.totalAmount.toLocaleString()} VND`);

    const transitOrder4 = await createOrderWithPricing({
      storeId: createdStores[3]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-07'),
      status: 'In_Transit',
      items: [
        { productId: greenBeanMooncake._id, quantity: 12, batchId: finishedGreenBeanBatch._id },
      ],
      approvedBy: kitchenUser._id,
      approvedDate: new Date('2026-02-01'),
      shippedDate: new Date('2026-02-05'),
    });
    console.log(`✅ Order ${transitOrder4.orderCode}: In_Transit - Total: ${transitOrder4.totalAmount.toLocaleString()} VND`);

    const transitOrder5 = await createOrderWithPricing({
      storeId: createdStores[4]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-08'),
      status: 'In_Transit',
      items: [
        { productId: mixedNutsMooncake._id, quantity: 14, batchId: finishedMixedNutsBatch._id },
        { productId: lotusSeedMooncake._id, quantity: 10, batchId: finishedLotusSeedBatch._id },
      ],
      approvedBy: managerUser._id,
      approvedDate: new Date('2026-02-02'),
      shippedDate: new Date('2026-02-05'),
    });
    console.log(`✅ Order ${transitOrder5.orderCode}: In_Transit - Total: ${transitOrder5.totalAmount.toLocaleString()} VND`);

    // Create Delivery Trips for In_Transit orders
    console.log('\n--- Creating Delivery Trips for In_Transit Orders ---');
    const trip1 = await DeliveryTrip.create({
      driverId: coordinatorUser._id,
      vehicleNumber: '51A-12345',
      orders: [transitOrder1._id, transitOrder2._id],
      status: 'In_Transit',
      departureTime: new Date('2026-02-04T08:00:00'),
    });
    console.log(`✅ Delivery Trip created: ${trip1._id} (Driver: ${coordinatorUser.fullName}, 2 orders)`);

    const trip2 = await DeliveryTrip.create({
      driverId: coordinatorUser._id,
      vehicleNumber: '51B-67890',
      orders: [transitOrder3._id, transitOrder4._id],
      status: 'In_Transit',
      departureTime: new Date('2026-02-05T08:30:00'),
    });
    console.log(`✅ Delivery Trip created: ${trip2._id} (Driver: ${coordinatorUser.fullName}, 2 orders)`);

    const trip3 = await DeliveryTrip.create({
      driverId: coordinatorUser._id,
      vehicleNumber: '51C-11111',
      orders: [transitOrder5._id],
      status: 'In_Transit',
      departureTime: new Date('2026-02-05T09:00:00'),
    });
    console.log(`✅ Delivery Trip created: ${trip3._id} (Driver: ${coordinatorUser.fullName}, 1 order)`);

    // === RECEIVED ORDERS (5) with Store Inventory ===
    console.log('\n--- Creating 5 RECEIVED Orders with Store Inventory ---');
    const receivedOrder1 = await createOrderWithPricing({
      storeId: createdStores[0]._id,
      createdBy: storeUser._id,
      requestedDeliveryDate: new Date('2026-02-03'),
      status: 'Received',
      items: [
        { productId: greenBeanMooncake._id, quantity: 20, batchId: finishedGreenBeanBatch._id },
      ],
      approvedBy: managerUser._id,
      approvedDate: new Date('2026-01-28'),
      shippedDate: new Date('2026-02-01'),
      receivedDate: new Date('2026-02-03'),
    });
    console.log(`✅ Order ${receivedOrder1.orderCode}: Received - Total: ${receivedOrder1.totalAmount.toLocaleString()} VND`);

    const receivedOrder2 = await createOrderWithPricing({
      storeId: createdStores[1]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-03'),
      status: 'Received',
      items: [
        { productId: mixedNutsMooncake._id, quantity: 15, batchId: finishedMixedNutsBatch._id },
        { productId: lotusSeedMooncake._id, quantity: 18, batchId: finishedLotusSeedBatch._id },
      ],
      approvedBy: kitchenUser._id,
      approvedDate: new Date('2026-01-28'),
      shippedDate: new Date('2026-02-01'),
      receivedDate: new Date('2026-02-03'),
    });
    console.log(`✅ Order ${receivedOrder2.orderCode}: Received - Total: ${receivedOrder2.totalAmount.toLocaleString()} VND`);

    const receivedOrder3 = await createOrderWithPricing({
      storeId: createdStores[2]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-04'),
      status: 'Received',
      items: [
        { productId: taroMooncake._id, quantity: 25, batchId: finishedTaroBatch._id },
      ],
      approvedBy: managerUser._id,
      approvedDate: new Date('2026-01-29'),
      shippedDate: new Date('2026-02-02'),
      receivedDate: new Date('2026-02-04'),
    });
    console.log(`✅ Order ${receivedOrder3.orderCode}: Received - Total: ${receivedOrder3.totalAmount.toLocaleString()} VND`);

    const receivedOrder4 = await createOrderWithPricing({
      storeId: createdStores[3]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-04'),
      status: 'Received',
      items: [
        { productId: durianMooncake._id, quantity: 10, batchId: finishedDurianBatch._id },
        { productId: greenBeanMooncake._id, quantity: 16, batchId: finishedGreenBeanBatch._id },
      ],
      approvedBy: kitchenUser._id,
      approvedDate: new Date('2026-01-29'),
      shippedDate: new Date('2026-02-02'),
      receivedDate: new Date('2026-02-04'),
    });
    console.log(`✅ Order ${receivedOrder4.orderCode}: Received - Total: ${receivedOrder4.totalAmount.toLocaleString()} VND`);

    const receivedOrder5 = await createOrderWithPricing({
      storeId: createdStores[4]._id,
      createdBy: managerUser._id,
      requestedDeliveryDate: new Date('2026-02-05'),
      status: 'Received',
      items: [
        { productId: lotusSeedMooncake._id, quantity: 22, batchId: finishedLotusSeedBatch._id },
        { productId: mixedNutsMooncake._id, quantity: 12, batchId: finishedMixedNutsBatch._id },
      ],
      approvedBy: managerUser._id,
      approvedDate: new Date('2026-01-30'),
      shippedDate: new Date('2026-02-03'),
      receivedDate: new Date('2026-02-05'),
    });
    console.log(`✅ Order ${receivedOrder5.orderCode}: Received - Total: ${receivedOrder5.totalAmount.toLocaleString()} VND`);

    // Create Store Inventory from Received Orders
    console.log('\n--- Creating Store Inventory from Received Orders ---');
    
    // Store 0 (District 1)
    await StoreInventory.create({
      storeId: createdStores[0]._id,
      productId: greenBeanMooncake._id,
      batchId: finishedGreenBeanBatch._id,
      quantity: 20,
    });
    console.log(`✅ Inventory: ${createdStores[0].storeName} - ${greenBeanMooncake.name}: 20 units`);

    // Store 1 (District 2)
    await StoreInventory.create({
      storeId: createdStores[1]._id,
      productId: mixedNutsMooncake._id,
      batchId: finishedMixedNutsBatch._id,
      quantity: 15,
    });
    await StoreInventory.create({
      storeId: createdStores[1]._id,
      productId: lotusSeedMooncake._id,
      batchId: finishedLotusSeedBatch._id,
      quantity: 18,
    });
    console.log(`✅ Inventory: ${createdStores[1].storeName} - 2 products added`);

    // Store 2 (District 3)
    await StoreInventory.create({
      storeId: createdStores[2]._id,
      productId: taroMooncake._id,
      batchId: finishedTaroBatch._id,
      quantity: 25,
    });
    console.log(`✅ Inventory: ${createdStores[2].storeName} - ${taroMooncake.name}: 25 units`);

    // Store 3 (District 7)
    await StoreInventory.create({
      storeId: createdStores[3]._id,
      productId: durianMooncake._id,
      batchId: finishedDurianBatch._id,
      quantity: 10,
    });
    await StoreInventory.create({
      storeId: createdStores[3]._id,
      productId: greenBeanMooncake._id,
      batchId: finishedGreenBeanBatch._id,
      quantity: 16,
    });
    console.log(`✅ Inventory: ${createdStores[3].storeName} - 2 products added`);

    // Store 4 (Binh Thanh)
    await StoreInventory.create({
      storeId: createdStores[4]._id,
      productId: lotusSeedMooncake._id,
      batchId: finishedLotusSeedBatch._id,
      quantity: 22,
    });
    await StoreInventory.create({
      storeId: createdStores[4]._id,
      productId: mixedNutsMooncake._id,
      batchId: finishedMixedNutsBatch._id,
      quantity: 12,
    });
    console.log(`✅ Inventory: ${createdStores[4].storeName} - 2 products added`);

    // Update Batch quantities after distribution
    finishedGreenBeanBatch.currentQuantity -= (20 + 16 + 10 + 15 + 25 + 12);
    await finishedGreenBeanBatch.save();
    finishedMixedNutsBatch.currentQuantity -= (15 + 12 + 8 + 18 + 14);
    await finishedMixedNutsBatch.save();
    finishedLotusSeedBatch.currentQuantity -= (18 + 22 + 15 + 20 + 16 + 10);
    await finishedLotusSeedBatch.save();
    finishedTaroBatch.currentQuantity -= (25 + 20 + 12 + 22);
    await finishedTaroBatch.save();
    finishedDurianBatch.currentQuantity -= (10 + 5 + 8);
    await finishedDurianBatch.save();
    console.log('\n✅ Central kitchen batch quantities updated after distribution');

    // === CREATE FEEDBACK FOR SOME RECEIVED ORDERS ===
    console.log('\n--- Creating Feedback for Received Orders ---');
    
    const feedback1 = await Feedback.create({
      orderId: receivedOrder1._id,
      storeId: createdStores[0]._id,
      rating: 5,
      content: 'Excellent quality! Fresh mooncakes delivered on time.',
      images: ['https://example.com/feedback1.jpg'],
      createdBy: storeUser._id,
    });
    console.log(`✅ Feedback created for Order ${receivedOrder1.orderCode}: ⭐${feedback1.rating}/5`);

    const feedback2 = await Feedback.create({
      orderId: receivedOrder2._id,
      storeId: createdStores[1]._id,
      rating: 4,
      content: 'Good quality but packaging could be improved.',
      images: [],
      createdBy: managerUser._id,
    });
    console.log(`✅ Feedback created for Order ${receivedOrder2.orderCode}: ⭐${feedback2.rating}/5`);

    const feedback3 = await Feedback.create({
      orderId: receivedOrder3._id,
      storeId: createdStores[2]._id,
      rating: 5,
      content: 'Perfect! Customers love the taro mooncakes.',
      images: ['https://example.com/feedback3a.jpg', 'https://example.com/feedback3b.jpg'],
      createdBy: managerUser._id,
    });
    console.log(`✅ Feedback created for Order ${receivedOrder3.orderCode}: ⭐${feedback3.rating}/5`);

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('==========================================');
    console.log('\n📊 SUMMARY:');
    console.log(`   Roles: ${createdRoles.length}`);
    console.log(`   Stores: ${createdStores.length}`);
    console.log(`   System Settings: ${createdSettings.length}`);
    console.log(`   Users: 5 (Admin, Manager, Kitchen Staff, Store Staff, Coordinator)`);
    console.log(`   Suppliers: ${createdSuppliers.length}`);
    console.log(`   Ingredients: 10`);
    console.log(`   Ingredient Batches: 10`);
    console.log(`   Categories: ${createdCategories.length}`);
    console.log(`   Products: 5 (Green Bean, Mixed Nuts, Lotus Seed, Taro, Durian)`);
    console.log(`   Production Plans: 1`);
    console.log(`   Finished Batches: 5`);
    console.log(`   Orders: 20 (5 Pending, 5 Approved, 5 In_Transit, 5 Received)`);
    console.log(`   Delivery Trips: 3 (for In_Transit orders)`);
    console.log(`   Feedback: 3 (for Received orders)`);
    console.log(`   Store Inventories: 9 (across 5 stores)`);

    console.log('\n📝 LOGIN CREDENTIALS:');
    console.log('   Admin:        username: admin        password: admin123');
    console.log('   Manager:      username: manager      password: manager123');
    console.log('   Kitchen:      username: kitchen      password: kitchen123');
    console.log('   Store:        username: store        password: store123');
    console.log('   Coordinator:  username: coordinator  password: coordinator123');

    console.log('\n✅ Traceability Chain Established:');
    console.log('   Supplier → Ingredient Batch → Ingredient → Product Recipe');
    console.log('   Production Plan → Finished Batch → Store Inventory');
    console.log('   Store → Order → Delivery Trip → Feedback');

    console.log('\n📦 ORDER STATUS BREAKDOWN:');
    console.log('   5 Pending    - Ready for Kitchen Staff to approve');
    console.log('   5 Approved   - Ready for shipping (aggregate endpoint test data)');
    console.log('   5 In_Transit - Active delivery trips (QR receive test data)');
    console.log('   5 Received   - Completed orders (feedback test data)\n');

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
    await SystemSetting.deleteMany({});
    await User.deleteMany({});
    await Category.deleteMany({});
    await Supplier.deleteMany({});
    await Ingredient.deleteMany({});
    await IngredientBatch.deleteMany({});
    await Product.deleteMany({});
    await ProductionPlan.deleteMany({});
    await Batch.deleteMany({});
    await Order.deleteMany({});
    await DeliveryTrip.deleteMany({});
    await Invoice.deleteMany({});
    await StoreInventory.deleteMany({});
    await Order.deleteMany({});
    await DeliveryTrip.deleteMany({});
    await Feedback.deleteMany({});

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
