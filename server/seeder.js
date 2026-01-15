require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Role = require('./models/Role');
const Store = require('./models/Store');
const User = require('./models/User');
const Category = require('./models/Category');
const Ingredient = require('./models/Ingredient');
const Product = require('./models/Product');
const ProductionPlan = require('./models/ProductionPlan');
const Batch = require('./models/BatchModel');
const StoreInventory = require('./models/StoreInventory');

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

const categories = [
  {
    name: 'Mooncake',
    description: 'Traditional mooncake products for Mid-Autumn Festival',
  },
  {
    name: 'Gift Box',
    description: 'Premium gift boxes and packaging',
  },
  {
    name: 'Raw Material',
    description: 'Raw materials and semi-finished products',
  },
  {
    name: 'Combo Set',
    description: 'Bundle products with multiple items',
  },
];

const ingredients = [
  {
    name: 'Flour',
    unit: 'kg',
    costPrice: 25000,
    warningThreshold: 50,
  },
  {
    name: 'Sugar',
    unit: 'kg',
    costPrice: 30000,
    warningThreshold: 30,
  },
  {
    name: 'Salted Egg Yolk',
    unit: 'pcs',
    costPrice: 5000,
    warningThreshold: 100,
  },
  {
    name: 'Green Bean Paste',
    unit: 'kg',
    costPrice: 80000,
    warningThreshold: 20,
  },
  {
    name: 'Lotus Seed Paste',
    unit: 'kg',
    costPrice: 120000,
    warningThreshold: 15,
  },
  {
    name: 'Cooking Oil',
    unit: 'l',
    costPrice: 45000,
    warningThreshold: 10,
  },
  {
    name: 'Egg',
    unit: 'pcs',
    costPrice: 3000,
    warningThreshold: 200,
  },
];

const importData = async () => {
  try {
    await connectDB();

    console.log('🗑️  Clearing existing data...');
    await Role.deleteMany({});
    await Store.deleteMany({});
    await User.deleteMany({});
    await Category.deleteMany({});
    await Ingredient.deleteMany({});
    await Product.deleteMany({});
    await ProductionPlan.deleteMany({});
    await Batch.deleteMany({});
    await StoreInventory.deleteMany({});

    console.log('📦 Inserting Roles...');
    const createdRoles = await Role.insertMany(roles);
    console.log(`✅ ${createdRoles.length} roles inserted`);

    console.log('📦 Inserting Stores...');
    const createdStores = await Store.insertMany(stores);
    console.log(`✅ ${createdStores.length} stores inserted`);

    console.log('📦 Inserting Categories...');
    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ ${createdCategories.length} categories inserted`);

    console.log('📦 Inserting Ingredients...');
    const createdIngredients = await Ingredient.insertMany(ingredients);
    console.log(`✅ ${createdIngredients.length} ingredients inserted`);

    const adminRole = createdRoles.find((r) => r.roleName === 'Admin');
    const managerRole = createdRoles.find((r) => r.roleName === 'Manager');
    const storeStaffRole = createdRoles.find((r) => r.roleName === 'StoreStaff');
    const kitchenStaffRole = createdRoles.find((r) => r.roleName === 'KitchenStaff');

    console.log('📦 Creating sample users...');

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
      fullName: 'Central Manager',
      email: 'manager@kendomooncake.com',
      roleId: managerRole._id,
      storeId: null,
      isActive: true,
    });
    console.log(`✅ Manager created: ${managerUser.username}`);

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

    console.log('\n📦 Creating sample products...');

    const mooncakeCategory = createdCategories.find((c) => c.name === 'Mooncake');
    const giftBoxCategory = createdCategories.find((c) => c.name === 'Gift Box');
    const comboCategory = createdCategories.find((c) => c.name === 'Combo Set');

    const flour = createdIngredients.find((i) => i.name === 'Flour');
    const sugar = createdIngredients.find((i) => i.name === 'Sugar');
    const saltedEgg = createdIngredients.find((i) => i.name === 'Salted Egg Yolk');
    const greenBeanPaste = createdIngredients.find((i) => i.name === 'Green Bean Paste');
    const lotusPaste = createdIngredients.find((i) => i.name === 'Lotus Seed Paste');
    const oil = createdIngredients.find((i) => i.name === 'Cooking Oil');
    const egg = createdIngredients.find((i) => i.name === 'Egg');

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
        { ingredientId: oil._id, quantity: 0.01 },
        { ingredientId: egg._id, quantity: 1 },
      ],
      bundleItems: [],
    });
    console.log(`✅ Product created: ${greenBeanMooncake.name}`);

    const lotusMooncake = await Product.create({
      name: 'Lotus Seed Mooncake',
      sku: 'MOON-LS-002',
      categoryId: mooncakeCategory._id,
      price: 180000,
      shelfLifeDays: 30,
      image: 'https://example.com/lotus-mooncake.jpg',
      recipe: [
        { ingredientId: flour._id, quantity: 0.05 },
        { ingredientId: sugar._id, quantity: 0.02 },
        { ingredientId: lotusPaste._id, quantity: 0.1 },
        { ingredientId: saltedEgg._id, quantity: 2 },
        { ingredientId: oil._id, quantity: 0.01 },
        { ingredientId: egg._id, quantity: 1 },
      ],
      bundleItems: [],
    });
    console.log(`✅ Product created: ${lotusMooncake.name}`);

    const mixedMooncake = await Product.create({
      name: 'Mixed Flavor Mooncake',
      sku: 'MOON-MIX-003',
      categoryId: mooncakeCategory._id,
      price: 160000,
      shelfLifeDays: 30,
      image: 'https://example.com/mixed-mooncake.jpg',
      recipe: [
        { ingredientId: flour._id, quantity: 0.05 },
        { ingredientId: sugar._id, quantity: 0.02 },
        { ingredientId: greenBeanPaste._id, quantity: 0.04 },
        { ingredientId: lotusPaste._id, quantity: 0.04 },
        { ingredientId: saltedEgg._id, quantity: 1 },
        { ingredientId: oil._id, quantity: 0.01 },
        { ingredientId: egg._id, quantity: 1 },
      ],
      bundleItems: [],
    });
    console.log(`✅ Product created: ${mixedMooncake.name}`);

    const giftBox = await Product.create({
      name: 'Premium Gift Box',
      sku: 'BOX-PREM-001',
      categoryId: giftBoxCategory._id,
      price: 50000,
      shelfLifeDays: 365,
      image: 'https://example.com/gift-box.jpg',
      recipe: [],
      bundleItems: [],
    });
    console.log(`✅ Product created: ${giftBox.name}`);

    const comboSet = await Product.create({
      name: 'Mid-Autumn Festival Combo Set',
      sku: 'COMBO-MAF-001',
      categoryId: comboCategory._id,
      price: 450000,
      shelfLifeDays: 30,
      image: 'https://example.com/combo-set.jpg',
      recipe: [],
      bundleItems: [
        { childProductId: greenBeanMooncake._id, quantity: 2 },
        { childProductId: lotusMooncake._id, quantity: 2 },
        { childProductId: giftBox._id, quantity: 1 },
      ],
    });
    console.log(`✅ Product created: ${comboSet.name} (Bundle)`);

    console.log('\n📦 Creating sample production plan...');

    const productionPlan = await ProductionPlan.create({
      planCode: 'PLAN-20260115-001',
      planDate: new Date('2026-01-15'),
      status: 'Planned',
      note: 'Production plan for Mid-Autumn Festival preparation',
      details: [
        {
          productId: greenBeanMooncake._id,
          plannedQuantity: 100,
          actualQuantity: 0,
          status: 'Pending',
        },
        {
          productId: lotusMooncake._id,
          plannedQuantity: 150,
          actualQuantity: 0,
          status: 'Pending',
        },
        {
          productId: mixedMooncake._id,
          plannedQuantity: 80,
          actualQuantity: 0,
          status: 'Pending',
        },
      ],
    });
    console.log(`✅ Production plan created: ${productionPlan.planCode}`);

    console.log('\n📦 Creating sample batches...');

    const batch1 = await Batch.create({
      batchCode: 'BATCH-20260110-MOON-GB-001',
      productId: greenBeanMooncake._id,
      mfgDate: new Date('2026-01-10'),
      expDate: new Date('2026-02-09'),
      initialQuantity: 200,
      currentQuantity: 200,
    });
    console.log(`✅ Batch created: ${batch1.batchCode}`);

    const batch2 = await Batch.create({
      batchCode: 'BATCH-20260112-MOON-LS-002',
      productId: lotusMooncake._id,
      mfgDate: new Date('2026-01-12'),
      expDate: new Date('2026-02-11'),
      initialQuantity: 150,
      currentQuantity: 150,
    });
    console.log(`✅ Batch created: ${batch2.batchCode}`);

    const batch3 = await Batch.create({
      batchCode: 'BATCH-20260113-MOON-MIX-003',
      productId: mixedMooncake._id,
      mfgDate: new Date('2026-01-13'),
      expDate: new Date('2026-02-12'),
      initialQuantity: 100,
      currentQuantity: 100,
    });
    console.log(`✅ Batch created: ${batch3.batchCode}`);

    console.log('\n📦 Creating sample inventory for Store 1...');

    const store1 = createdStores[0];

    const inventory1 = await StoreInventory.create({
      storeId: store1._id,
      productId: greenBeanMooncake._id,
      batchId: batch1._id,
      quantity: 50,
    });
    console.log(`✅ Inventory created: ${store1.storeName} - ${greenBeanMooncake.name} - 50 units`);

    const inventory2 = await StoreInventory.create({
      storeId: store1._id,
      productId: lotusMooncake._id,
      batchId: batch2._id,
      quantity: 30,
    });
    console.log(`✅ Inventory created: ${store1.storeName} - ${lotusMooncake.name} - 30 units`);

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

const destroyData = async () => {
  try {
    await connectDB();

    console.log('🗑️  Deleting all data...');
    await Role.deleteMany({});
    await Store.deleteMany({});
    await User.deleteMany({});
    await Category.deleteMany({});
    await Ingredient.deleteMany({});
    await Product.deleteMany({});
    await ProductionPlan.deleteMany({});
    await Batch.deleteMany({});
    await StoreInventory.deleteMany({});

    console.log('✅ Data destroyed successfully!');
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
