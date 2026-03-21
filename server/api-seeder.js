require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const connectDB = require('./config/db');

// All 22 models
const Role = require('./models/Role');
const Store = require('./models/Store');
const Supplier = require('./models/Supplier');
const Category = require('./models/Category');
const VehicleType = require('./models/VehicleType');
const SystemSetting = require('./models/SystemSetting');
const User = require('./models/User');
const Wallet = require('./models/Wallet');
const Ingredient = require('./models/Ingredient');
const IngredientBatch = require('./models/IngredientBatch');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Invoice = require('./models/Invoice');
const WalletTransaction = require('./models/WalletTransaction');
const DepositRequest = require('./models/DepositRequest');
const IngredientRequest = require('./models/IngredientRequests');
const ProductionPlan = require('./models/ProductionPlan');
const Batch = require('./models/BatchModel');
const IngredientUsage = require('./models/IngredientUsage');
const StoreInventory = require('./models/StoreInventory');
const DeliveryTrip = require('./models/DeliveryTrip');
const Feedback = require('./models/Feedback');

const API_BASE_URL = process.env.SEED_API_URL || 'http://localhost:5000/api';
const NOW = new Date();

const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  phase: (msg) => console.log(`\n${C.bright}${C.cyan}${msg}${C.reset}`),
  step: (msg) => console.log(`${C.blue}•${C.reset} ${msg}`),
  ok: (msg) => console.log(`${C.green}✓${C.reset} ${msg}`),
  warn: (msg) => console.log(`${C.yellow}!${C.reset} ${msg}`),
  err: (msg) => console.log(`${C.red}x${C.reset} ${msg}`),
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const addHours = (date, hours) => {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, decimals = 3) => Number((Math.random() * (max - min) + min).toFixed(decimals));
const pick = (arr) => arr[randomInt(0, arr.length - 1)];

const randomPastDate = (days = 30) => addHours(addDays(NOW, -randomInt(0, days)), randomInt(0, 23));

const callApi = async (label, fn, { fatal = true } = {}) => {
  try {
    return await fn();
  } catch (error) {
    log.err(`${label} failed`);
    console.error(`${C.dim}${JSON.stringify(error.response?.data || error.message, null, 2)}${C.reset}`);
    if (fatal) throw error;
    return null;
  }
};

const getDataPayload = (resp) => resp?.data?.data || resp?.data || null;

const createAxiosClient = (token) =>
  axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

const createProductionPlanViaApi = async (apiKitchen, payload) => {
  const endpoints = ['/production-plans', '/production'];
  let lastError;

  for (const path of endpoints) {
    try {
      return await apiKitchen.post(path, payload);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const completeProductionItemViaApi = async (apiKitchen, planId, payload) => {
  const endpoints = [`/production-plans/${planId}/complete-item`, `/production/${planId}/complete-item`];
  let lastError;

  for (const path of endpoints) {
    try {
      return await apiKitchen.post(path, payload);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const main = async () => {
  try {
    await connectDB();

    log.phase('================ ULTIMATE API SEEDER START ================');

    // -----------------------------
    // PHASE 1: Enterprise Master Data
    // -----------------------------
    log.phase('[PHASE 1] Enterprise Master Data (Direct Mongoose)');

    log.step('Wiping all 22 collections with Promise.all...');
    await Promise.all([
      Feedback.deleteMany({}),
      DeliveryTrip.deleteMany({}),
      StoreInventory.deleteMany({}),
      IngredientUsage.deleteMany({}),
      Batch.deleteMany({}),
      ProductionPlan.deleteMany({}),
      IngredientRequest.deleteMany({}),
      DepositRequest.deleteMany({}),
      WalletTransaction.deleteMany({}),
      Invoice.deleteMany({}),
      Order.deleteMany({}),
      Product.deleteMany({}),
      IngredientBatch.deleteMany({}),
      Ingredient.deleteMany({}),
      Wallet.deleteMany({}),
      User.deleteMany({}),
      SystemSetting.deleteMany({}),
      VehicleType.deleteMany({}),
      Category.deleteMany({}),
      Supplier.deleteMany({}),
      Store.deleteMany({}),
      Role.deleteMany({}),
    ]);
    log.ok('All collections cleared');

    const roles = await Role.insertMany([
      { roleName: 'Admin' },
      { roleName: 'Manager' },
      { roleName: 'StoreStaff' },
      { roleName: 'KitchenStaff' },
      { roleName: 'Coordinator' },
    ]);

    const roleMap = {
      Admin: roles.find((r) => r.roleName === 'Admin'),
      Manager: roles.find((r) => r.roleName === 'Manager'),
      StoreStaff: roles.find((r) => r.roleName === 'StoreStaff'),
      KitchenStaff: roles.find((r) => r.roleName === 'KitchenStaff'),
      Coordinator: roles.find((r) => r.roleName === 'Coordinator'),
    };

    const stores = await Store.insertMany([
      {
        storeName: 'Kendo Vincom Đồng Khởi',
        storeCode: 'KENDO-VDK',
        address: '72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        phone: '02838229911',
        standardDeliveryMinutes: 20,
        status: 'Active',
      },
      {
        storeName: 'Kendo Crescent Mall Quận 7',
        storeCode: 'KENDO-CR7',
        address: '101 Tôn Dật Tiên, Tân Phú, Quận 7, TP. Hồ Chí Minh',
        phone: '02837716688',
        standardDeliveryMinutes: 32,
        status: 'Active',
      },
      {
        storeName: 'Kendo Landmark 81',
        storeCode: 'KENDO-LM81',
        address: '720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
        phone: '02836367799',
        standardDeliveryMinutes: 25,
        status: 'Active',
      },
      {
        storeName: 'Kendo Thiso Mall Sala',
        storeCode: 'KENDO-SALA',
        address: '10 Mai Chí Thọ, Thủ Thiêm, TP. Thủ Đức, TP. Hồ Chí Minh',
        phone: '02839997766',
        standardDeliveryMinutes: 30,
        status: 'Active',
      },
    ]);

    const wallets = await Wallet.insertMany(
      stores.map((store) => ({
        storeId: store._id,
        balance: 500000000,
        status: 'Active',
      }))
    );

    const walletByStoreId = new Map(wallets.map((w) => [w.storeId.toString(), w]));

    const depositStatuses = ['Pending', 'Completed', 'Failed'];
    const depositRequests = [];
    for (let i = 0; i < 24; i += 1) {
      const createdAt = randomPastDate(30);
      depositRequests.push({
        storeId: stores[i % stores.length]._id,
        amount: randomInt(10_000_000, 50_000_000),
        payosOrderCode: 860000 + i,
        status: pick(depositStatuses),
        createdAt,
        updatedAt: addHours(createdAt, randomInt(1, 8)),
      });
    }
    await DepositRequest.insertMany(depositRequests);

    const suppliers = await Supplier.insertMany([
      {
        name: 'Công ty Cổ phần Nông sản Ba Huân',
        address: 'A44/1 Quốc lộ 50, Bình Hưng, Bình Chánh, TP. Hồ Chí Minh',
        phone: '0911888222',
        email: 'kinhdoanh.bahuan@example.com',
        status: 'Active',
      },
      {
        name: 'Nhà máy Bột mì Bình Đông',
        address: '45 Bến Bình Đông, Phường 11, Quận 8, TP. Hồ Chí Minh',
        phone: '0909444555',
        email: 'botmibinhdong@example.com',
        status: 'Active',
      },
      {
        name: 'Công ty Yến Việt Nam Premium Nest',
        address: '26 Nguyễn Hữu Cảnh, Bình Thạnh, TP. Hồ Chí Minh',
        phone: '0938999777',
        email: 'sales.yenviet@example.com',
        status: 'Active',
      },
      {
        name: 'Thủy sản Hoàng Gia Seafood',
        address: '88 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
        phone: '0982333444',
        email: 'contact.hoanggia@example.com',
        status: 'Active',
      },
      {
        name: 'Công ty Bao bì Cao Cấp An Phát',
        address: '159 Kinh Dương Vương, Quận 6, TP. Hồ Chí Minh',
        phone: '0917333888',
        email: 'sales.anphat@example.com',
        status: 'Active',
      },
    ]);

    const categories = await Category.insertMany([
      { categoryName: 'Bánh Nướng Thượng Hạng' },
      { categoryName: 'Bánh Dẻo Premium' },
      { categoryName: 'Bánh Chay Hiện Đại' },
      { categoryName: 'Hộp Quà Trung Thu' },
      { categoryName: 'Phiên Bản Giới Hạn' },
    ]);

    const categoryMap = Object.fromEntries(categories.map((c) => [c.categoryName, c]));

    const vehicles = await VehicleType.insertMany([
      {
        name: 'Mercedes Sprinter Refrigerated 1.2T',
        capacity: 1200,
        unit: 'kg',
        description: 'Xe lạnh cao cấp giao tuyến trung tâm',
        isActive: true,
      },
      {
        name: 'Ford Transit Premium 900kg',
        capacity: 900,
        unit: 'kg',
        description: 'Xe thùng tiêu chuẩn premium logistics',
        isActive: true,
      },
      {
        name: 'Hyundai Porter Inner-City 700kg',
        capacity: 700,
        unit: 'kg',
        description: 'Xe tải nhỏ cho tuyến đô thị dày đặc',
        isActive: true,
      },
    ]);

    await SystemSetting.insertMany([
      { key: 'SHIPPING_COST_BASE', value: '35000', dataType: 'NUMBER', group: 'DELIVERY', isPublic: true },
      { key: 'TAX_RATE', value: '0.08', dataType: 'NUMBER', group: 'FINANCE', isPublic: true },
      { key: 'MAX_PRODUCTS_PER_PLAN', value: '5000', dataType: 'NUMBER', group: 'PRODUCTION', isPublic: false },
      { key: 'ORDER_MIN_VALUE', value: '500000', dataType: 'NUMBER', group: 'ORDER', isPublic: true },
      { key: 'INVENTORY_FEFO_ENABLED', value: 'true', dataType: 'BOOLEAN', group: 'INVENTORY', isPublic: false },
      { key: 'PRODUCTION_QA_REQUIRED', value: 'true', dataType: 'BOOLEAN', group: 'PRODUCTION', isPublic: false },
    ]);

    // Force trip volume for dashboard testing by limiting max orders per trip.
    await SystemSetting.findOneAndUpdate(
      { key: 'MAX_ORDERS_PER_TRIP' },
      {
        key: 'MAX_ORDERS_PER_TRIP',
        value: '3',
        dataType: 'NUMBER',
        group: 'DELIVERY',
        description: 'Giới hạn số đơn tối đa trong 1 chuyến xe để tạo nhiều chuyến demo',
        isPublic: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const users = await Promise.all([
      User.create({
        username: 'admin.kendo',
        passwordHash: '123456',
        fullName: 'Nguyễn Trần Giám Đốc',
        email: 'admin@kendo.com',
        roleId: roleMap.Admin._id,
      }),
      User.create({
        username: 'manager.kendo',
        passwordHash: '123456',
        fullName: 'Lê Thị Quản Lý',
        email: 'manager@kendo.com',
        roleId: roleMap.Manager._id,
      }),
      User.create({
        username: 'chef.kendo',
        passwordHash: '123456',
        fullName: 'Phạm Văn Bếp Trưởng',
        email: 'chef@kendo.com',
        roleId: roleMap.KitchenStaff._id,
      }),
      User.create({
        username: 'coord.kendo',
        passwordHash: '123456',
        fullName: 'Võ Điều Phối',
        email: 'coord@kendo.com',
        roleId: roleMap.Coordinator._id,
      }),
      User.create({
        username: 'staff.vincom',
        passwordHash: '123456',
        fullName: 'Nhân Viên Vincom',
        email: 'vincom.staff@kendo.com',
        roleId: roleMap.StoreStaff._id,
        storeId: stores[0]._id,
      }),
      User.create({
        username: 'staff.crescent',
        passwordHash: '123456',
        fullName: 'Nhân Viên Crescent',
        email: 'crescent.staff@kendo.com',
        roleId: roleMap.StoreStaff._id,
        storeId: stores[1]._id,
      }),
      User.create({
        username: 'staff.landmark',
        passwordHash: '123456',
        fullName: 'Nhân Viên Landmark',
        email: 'landmark.staff@kendo.com',
        roleId: roleMap.StoreStaff._id,
        storeId: stores[2]._id,
      }),
      User.create({
        username: 'staff.sala',
        passwordHash: '123456',
        fullName: 'Nhân Viên Sala',
        email: 'sala.staff@kendo.com',
        roleId: roleMap.StoreStaff._id,
        storeId: stores[3]._id,
      }),
    ]);

    const userByUsername = Object.fromEntries(users.map((u) => [u.username, u]));
    const staffByStoreId = new Map([
      [stores[0]._id.toString(), userByUsername['staff.vincom']],
      [stores[1]._id.toString(), userByUsername['staff.crescent']],
      [stores[2]._id.toString(), userByUsername['staff.landmark']],
      [stores[3]._id.toString(), userByUsername['staff.sala']],
    ]);

    const ingredientSeed = [
      ['Vi cá mập', 'kg', 2200000],
      ['Yến sào', 'kg', 3200000],
      ['Bào ngư lát', 'kg', 1450000],
      ['Saffron Iran', 'kg', 1800000],
      ['Hạt sen Tịnh Tâm', 'kg', 260000],
      ['Bột mì đa dụng cao cấp', 'kg', 48000],
      ['Bột nếp rang', 'kg', 52000],
      ['Đường hữu cơ', 'kg', 65000],
      ['Mạch nha truyền thống', 'kg', 120000],
      ['Trứng muối loại 1', 'quả', 12000],
      ['Mè rang vàng', 'kg', 90000],
      ['Hạt điều rang', 'kg', 280000],
      ['Lạp xưởng cao cấp', 'kg', 390000],
      ['Mứt bí Huế', 'kg', 165000],
      ['Mứt gừng non', 'kg', 190000],
      ['Nước tro tàu', 'lít', 55000],
      ['Dầu thực vật tinh luyện', 'lít', 72000],
      ['Bơ lạt Pháp', 'kg', 360000],
      ['Sữa tươi không đường', 'lít', 45000],
      ['Kem tươi whipping', 'lít', 185000],
      ['Muối biển tinh', 'kg', 18000],
      ['Hộp giấy premium 4 bánh', 'cái', 32000],
      ['Khay nhựa thực phẩm', 'cái', 4500],
      ['Túi giấy thương hiệu', 'cái', 8500],
      ['Ruy băng lụa trang trí', 'mét', 6500],
    ];

    const ingredients = await Ingredient.insertMany(
      ingredientSeed.map(([ingredientName, unit, costPrice]) => ({
        ingredientName,
        unit,
        costPrice,
        warningThreshold: unit === 'quả' ? 500 : 40,
        totalQuantity: 0,
      }))
    );
    const ingredientMap = Object.fromEntries(ingredients.map((i) => [i.ingredientName, i]));

    const ingredientBatches = [];
    for (let i = 0; i < ingredients.length; i += 1) {
      const ing = ingredients[i];
      const batchCount = i % 2 === 0 ? 4 : 3;
      for (let j = 0; j < batchCount; j += 1) {
        const initial = ing.unit === 'quả' ? randomInt(1200, 6000) : randomInt(60, 450);
        const current = Math.max(1, initial - randomInt(0, Math.floor(initial * 0.5)));
        const expiryOffset = [20, 75, 140, 260][j];
        const receivedAgo = randomInt(1, 24);

        ingredientBatches.push({
          ingredientId: ing._id,
          supplierId: suppliers[(i + j) % suppliers.length]._id,
          batchCode: `ING-${String(i + 1).padStart(2, '0')}-${String(j + 1).padStart(2, '0')}`,
          expiryDate: addDays(NOW, expiryOffset),
          receivedDate: addDays(NOW, -receivedAgo),
          initialQuantity: initial,
          currentQuantity: current,
          price: Math.round(initial * ing.costPrice),
          isActive: true,
        });
      }
    }

    const createdIngredientBatches = await IngredientBatch.insertMany(ingredientBatches);

    // Convert a subset to expired/archived for FEFO edge-case dashboard testing.
    const expiredBatchIds = createdIngredientBatches
      .filter((_, idx) => idx % 9 === 0)
      .map((b) => b._id);

    if (expiredBatchIds.length > 0) {
      await IngredientBatch.updateMany(
        { _id: { $in: expiredBatchIds } },
        {
          expiryDate: addDays(NOW, -randomInt(3, 20)),
          isActive: false,
        }
      );
    }

    const refreshedBatches = await IngredientBatch.find({});
    const qtyByIngredientId = refreshedBatches.reduce((acc, b) => {
      const key = b.ingredientId.toString();
      acc[key] = (acc[key] || 0) + b.currentQuantity;
      return acc;
    }, {});

    await Promise.all(
      ingredients.map((ing) =>
        Ingredient.updateOne(
          { _id: ing._id },
          { totalQuantity: qtyByIngredientId[ing._id.toString()] || 0 }
        )
      )
    );

    const baseProductSeed = [
      ['Bánh Nướng Thập Cẩm Gà Quay Vi Cá', 'Bánh Nướng Thượng Hạng', 250000, 0.28],
      ['Bánh Nướng Yến Sào Saffron', 'Bánh Nướng Thượng Hạng', 320000, 0.26],
      ['Bánh Nướng Bào Ngư Truffle', 'Phiên Bản Giới Hạn', 390000, 0.30],
      ['Bánh Nướng Tôm Hùm Sốt Hong Kong', 'Phiên Bản Giới Hạn', 420000, 0.31],
      ['Bánh Dẻo Hạt Sen Tịnh Tâm', 'Bánh Dẻo Premium', 210000, 0.24],
      ['Bánh Dẻo Yến Sào Lá Dứa', 'Bánh Dẻo Premium', 260000, 0.23],
      ['Bánh Dẻo Matcha Hạnh Nhân', 'Bánh Dẻo Premium', 230000, 0.22],
      ['Bánh Chay Ngũ Hạt Dinh Dưỡng', 'Bánh Chay Hiện Đại', 185000, 0.21],
      ['Bánh Chay Khoai Môn Macca', 'Bánh Chay Hiện Đại', 195000, 0.22],
      ['Bánh Chay Chocolate Hạt Điều', 'Bánh Chay Hiện Đại', 205000, 0.23],
      ['Bánh Nướng Hạt Sen Trứng Muối', 'Bánh Nướng Thượng Hạng', 240000, 0.27],
      ['Bánh Nướng Lạp Xưởng Đặc Biệt', 'Bánh Nướng Thượng Hạng', 255000, 0.28],
      ['Bánh Dẻo Dừa Non Trân Châu', 'Bánh Dẻo Premium', 198000, 0.21],
      ['Bánh Nướng Chà Bông Phô Mai', 'Bánh Nướng Thượng Hạng', 235000, 0.26],
      ['Bánh Chay Oolong Hạt Dẻ', 'Bánh Chay Hiện Đại', 215000, 0.22],
      ['Bánh Dẻo Cốm Non Hà Nội', 'Bánh Dẻo Premium', 208000, 0.20],
    ];

    const buildRecipe = (name) => {
      if (name.includes('Vi Cá')) {
        return [
          { ingredientId: ingredientMap['Bột mì đa dụng cao cấp']._id, quantity: 0.085 },
          { ingredientId: ingredientMap['Trứng muối loại 1']._id, quantity: 1 },
          { ingredientId: ingredientMap['Vi cá mập']._id, quantity: 0.008 },
          { ingredientId: ingredientMap['Mạch nha truyền thống']._id, quantity: 0.018 },
        ];
      }
      if (name.includes('Yến Sào')) {
        return [
          { ingredientId: ingredientMap['Bột mì đa dụng cao cấp']._id, quantity: 0.075 },
          { ingredientId: ingredientMap['Yến sào']._id, quantity: 0.01 },
          { ingredientId: ingredientMap['Saffron Iran']._id, quantity: 0.002 },
          { ingredientId: ingredientMap['Đường hữu cơ']._id, quantity: 0.014 },
        ];
      }
      if (name.includes('Bào Ngư')) {
        return [
          { ingredientId: ingredientMap['Bào ngư lát']._id, quantity: 0.012 },
          { ingredientId: ingredientMap['Bột mì đa dụng cao cấp']._id, quantity: 0.082 },
          { ingredientId: ingredientMap['Trứng muối loại 1']._id, quantity: 1 },
        ];
      }
      if (name.includes('Hạt Sen')) {
        return [
          { ingredientId: ingredientMap['Hạt sen Tịnh Tâm']._id, quantity: 0.05 },
          { ingredientId: ingredientMap['Bột mì đa dụng cao cấp']._id, quantity: 0.04 },
          { ingredientId: ingredientMap['Đường hữu cơ']._id, quantity: 0.016 },
        ];
      }
      if (name.includes('Chay')) {
        return [
          { ingredientId: ingredientMap['Bột nếp rang']._id, quantity: 0.07 },
          { ingredientId: ingredientMap['Đường hữu cơ']._id, quantity: 0.015 },
          { ingredientId: ingredientMap['Hạt điều rang']._id, quantity: 0.01 },
        ];
      }

      return [
        { ingredientId: ingredientMap['Bột mì đa dụng cao cấp']._id, quantity: 0.08 },
        { ingredientId: ingredientMap['Trứng muối loại 1']._id, quantity: 1 },
        { ingredientId: ingredientMap['Đường hữu cơ']._id, quantity: 0.012 },
      ];
    };

    const baseProducts = await Product.insertMany(
      baseProductSeed.map(([name, categoryName, price, weight], idx) => ({
        name,
        sku: `KENDO-SKU-${String(idx + 1).padStart(3, '0')}`,
        categoryId: categoryMap[categoryName]._id,
        price,
        shelfLifeDays: 35 + (idx % 15),
        weight,
        weightUnit: 'kg',
        image: `https://cdn.kendo.demo/products/${idx + 1}.jpg`,
        recipe: buildRecipe(name),
        isActive: true,
      }))
    );

    const baseProductMap = Object.fromEntries(baseProducts.map((p) => [p.name, p]));

    const bundleProducts = await Product.insertMany([
      {
        name: 'Hộp Quà Trăng Vàng Thượng Hạng',
        sku: 'KENDO-BUNDLE-001',
        categoryId: categoryMap['Hộp Quà Trung Thu']._id,
        price: 1500000,
        shelfLifeDays: 30,
        weight: 1.35,
        weightUnit: 'kg',
        image: 'https://cdn.kendo.demo/bundles/1.jpg',
        recipe: [],
        bundleItems: [
          { childProductId: baseProductMap['Bánh Nướng Thập Cẩm Gà Quay Vi Cá']._id, quantity: 2 },
          { childProductId: baseProductMap['Bánh Nướng Yến Sào Saffron']._id, quantity: 1 },
          { childProductId: baseProductMap['Bánh Dẻo Hạt Sen Tịnh Tâm']._id, quantity: 1 },
        ],
      },
      {
        name: 'Hộp Quà Imperial 6 Bánh',
        sku: 'KENDO-BUNDLE-002',
        categoryId: categoryMap['Hộp Quà Trung Thu']._id,
        price: 1980000,
        shelfLifeDays: 30,
        weight: 1.9,
        weightUnit: 'kg',
        image: 'https://cdn.kendo.demo/bundles/2.jpg',
        recipe: [],
        bundleItems: [
          { childProductId: baseProductMap['Bánh Nướng Bào Ngư Truffle']._id, quantity: 2 },
          { childProductId: baseProductMap['Bánh Dẻo Yến Sào Lá Dứa']._id, quantity: 2 },
          { childProductId: baseProductMap['Bánh Chay Ngũ Hạt Dinh Dưỡng']._id, quantity: 2 },
        ],
      },
      {
        name: 'Hộp Quà Doanh Nghiệp Platinum',
        sku: 'KENDO-BUNDLE-003',
        categoryId: categoryMap['Hộp Quà Trung Thu']._id,
        price: 2450000,
        shelfLifeDays: 28,
        weight: 2.1,
        weightUnit: 'kg',
        image: 'https://cdn.kendo.demo/bundles/3.jpg',
        recipe: [],
        bundleItems: [
          { childProductId: baseProductMap['Bánh Nướng Tôm Hùm Sốt Hong Kong']._id, quantity: 2 },
          { childProductId: baseProductMap['Bánh Nướng Thập Cẩm Gà Quay Vi Cá']._id, quantity: 2 },
          { childProductId: baseProductMap['Bánh Dẻo Matcha Hạnh Nhân']._id, quantity: 2 },
        ],
      },
      {
        name: 'Gift Box Ánh Trăng 4 Bánh',
        sku: 'KENDO-BUNDLE-004',
        categoryId: categoryMap['Hộp Quà Trung Thu']._id,
        price: 1180000,
        shelfLifeDays: 30,
        weight: 1.2,
        weightUnit: 'kg',
        image: 'https://cdn.kendo.demo/bundles/4.jpg',
        recipe: [],
        bundleItems: [
          { childProductId: baseProductMap['Bánh Nướng Hạt Sen Trứng Muối']._id, quantity: 2 },
          { childProductId: baseProductMap['Bánh Dẻo Cốm Non Hà Nội']._id, quantity: 2 },
        ],
      },
      {
        name: 'Gift Box Legacy 8 Bánh',
        sku: 'KENDO-BUNDLE-005',
        categoryId: categoryMap['Hộp Quà Trung Thu']._id,
        price: 2890000,
        shelfLifeDays: 28,
        weight: 2.45,
        weightUnit: 'kg',
        image: 'https://cdn.kendo.demo/bundles/5.jpg',
        recipe: [],
        bundleItems: [
          { childProductId: baseProductMap['Bánh Nướng Bào Ngư Truffle']._id, quantity: 2 },
          { childProductId: baseProductMap['Bánh Nướng Yến Sào Saffron']._id, quantity: 2 },
          { childProductId: baseProductMap['Bánh Chay Oolong Hạt Dẻ']._id, quantity: 2 },
          { childProductId: baseProductMap['Bánh Dẻo Hạt Sen Tịnh Tâm']._id, quantity: 2 },
        ],
      },
      {
        name: 'Set Quà Signature 2 Bánh',
        sku: 'KENDO-BUNDLE-006',
        categoryId: categoryMap['Hộp Quà Trung Thu']._id,
        price: 690000,
        shelfLifeDays: 30,
        weight: 0.78,
        weightUnit: 'kg',
        image: 'https://cdn.kendo.demo/bundles/6.jpg',
        recipe: [],
        bundleItems: [
          { childProductId: baseProductMap['Bánh Nướng Chà Bông Phô Mai']._id, quantity: 1 },
          { childProductId: baseProductMap['Bánh Dẻo Dừa Non Trân Châu']._id, quantity: 1 },
        ],
      },
    ]);

    const allProducts = [...baseProducts, ...bundleProducts];

    log.ok(
      `Phase 1 seeded: ${stores.length} stores, ${wallets.length} wallets, ${depositRequests.length} deposit requests, ${ingredients.length} ingredients, ${createdIngredientBatches.length} ingredient batches, ${allProducts.length} products`
    );

    // -----------------------------
    // PHASE 2: Axios & Auth Initialization
    // -----------------------------
    log.phase('[PHASE 2] Axios & Auth Initialization');

    await callApi('Health check', () => axios.get(API_BASE_URL.replace('/api', '/health')));

    const loginAndGetToken = async (username) => {
      const resp = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password: '123456',
      });
      return resp.data?.token;
    };

    const tokenAdmin = await callApi('Login admin', () => loginAndGetToken('admin.kendo'));
    const tokenManager = await callApi('Login manager', () => loginAndGetToken('manager.kendo'));
    const tokenKitchen = await callApi('Login kitchen', () => loginAndGetToken('chef.kendo'));
    const tokenCoordinator = await callApi('Login coordinator', () => loginAndGetToken('coord.kendo'));
    const tokenStaffVincom = await callApi('Login store staff vincom', () => loginAndGetToken('staff.vincom'));
    const tokenStaffCrescent = await callApi('Login store staff crescent', () => loginAndGetToken('staff.crescent'));
    const tokenStaffLandmark = await callApi('Login store staff landmark', () => loginAndGetToken('staff.landmark'));
    const tokenStaffSala = await callApi('Login store staff sala', () => loginAndGetToken('staff.sala'));

    const apiAdmin = createAxiosClient(tokenAdmin);
    const apiManager = createAxiosClient(tokenManager);
    const apiKitchen = createAxiosClient(tokenKitchen);
    const apiCoordinator = createAxiosClient(tokenCoordinator);

    const staffApiByStoreId = new Map([
      [stores[0]._id.toString(), createAxiosClient(tokenStaffVincom)],
      [stores[1]._id.toString(), createAxiosClient(tokenStaffCrescent)],
      [stores[2]._id.toString(), createAxiosClient(tokenStaffLandmark)],
      [stores[3]._id.toString(), createAxiosClient(tokenStaffSala)],
    ]);

    log.ok('Authenticated JWTs and reusable Axios clients for Admin/Manager/Kitchen/Coordinator/StoreStaffs');

    // -----------------------------
    // PHASE 3: Massive API-Driven Transactions + Time-Travel
    // -----------------------------
    log.phase('[PHASE 3] API-Driven Transactions + Time-Travel (Last 30 Days)');

    // STEP 3.1 - Production pipeline via API (preparing approved source orders first)
    log.step('3.1 Creating source orders via API, approving, creating 15 production plans, and completing items...');

    const manufacturableProducts = baseProducts.slice(0, 12);

    const createOrderByApi = async ({ apiStore, store, items, requestedDeliveryDate, note }) => {
      const payload = {
        storeId: store._id,
        requestedDeliveryDate,
        recipientName: `Quầy nhận hàng ${store.storeCode}`,
        recipientPhone: randomInt(0, 1) ? '0901234567' : '0912345678',
        address: store.address,
        paymentMethod: 'Wallet',
        notes: note,
        items,
      };

      const res = await apiStore.post('/logistics/orders', payload);
      return getDataPayload(res);
    };

    const sourceOrders = [];
    for (let i = 0; i < 20; i += 1) {
      const store = stores[i % stores.length];
      const apiStore = staffApiByStoreId.get(store._id.toString());
      const product = manufacturableProducts[i % manufacturableProducts.length];
      const quantity = randomInt(8, 20);

      const data = await callApi(
        `Create source order ${i + 1}`,
        () =>
          createOrderByApi({
            apiStore,
            store,
            requestedDeliveryDate: addDays(NOW, randomInt(1, 6)).toISOString(),
            note: `Seed source order ${i + 1} for production`,
            items: [{ productId: product._id, quantityRequested: quantity }],
          })
      );

      const order = data?.order;
      if (order?._id) {
        sourceOrders.push(order);
      }
    }

    for (const order of sourceOrders) {
      await callApi(
        `Approve source order ${order.orderCode || order._id}`,
        () => apiCoordinator.post(`/logistics/orders/${order._id}/approve`, {})
      );
    }

    const createdPlanIds = [];

    for (let i = 0; i < 15; i += 1) {
      const order = sourceOrders[i];
      if (!order) break;

      const planCode = `PLAN-API-${String(i + 1).padStart(3, '0')}`;
      const planResp = await callApi(
        `Create production plan ${planCode}`,
        () =>
          createProductionPlanViaApi(apiKitchen, {
            planCode,
            planDate: NOW.toISOString(),
            note: `Auto-generated production plan ${planCode}`,
            orderIds: [order._id],
          })
      );

      const planData = getDataPayload(planResp);
      const plan = planData?.data || planData;
      if (!plan?._id || !Array.isArray(plan.details) || plan.details.length === 0) {
        continue;
      }

      createdPlanIds.push(plan._id);

      for (const detail of plan.details) {
        const productId = detail.productId?._id || detail.productId;
        const actualQuantity = Number(detail.plannedQuantity || 1);

        await callApi(
          `Complete item for plan ${plan.planCode || plan._id}`,
          () =>
            completeProductionItemViaApi(apiKitchen, plan._id, {
              productId,
              actualQuantity,
            })
        );
      }

      const travelDate = randomPastDate(30);
      await ProductionPlan.updateOne(
        { _id: plan._id },
        {
          planDate: travelDate,
          createdAt: travelDate,
          updatedAt: addHours(travelDate, 2),
        }
      );

      await Batch.updateMany(
        { productionPlanId: plan._id },
        {
          mfgDate: travelDate,
          expDate: addDays(travelDate, randomInt(25, 60)),
          createdAt: addHours(travelDate, 1),
          updatedAt: addHours(travelDate, 3),
        }
      );

      await IngredientUsage.updateMany(
        { productionPlanId: plan._id },
        {
          recordedAt: addHours(travelDate, 1),
          createdAt: addHours(travelDate, 1),
          updatedAt: addHours(travelDate, 2),
        }
      );
    }

    log.ok(`Created and completed ${createdPlanIds.length} production plans with time-travel updates`);

    // STEP 3.2 - Massive Orders (50+) via API + time travel
    log.step('3.2 Creating 50 large-volume orders via API and time-traveling financial timestamps...');

    const sellableProducts = allProducts;
    const massiveOrders = [];

    const createOrderByApiWithRetry = async (params, maxRetries = 5) => {
      let attempt = 0;

      while (attempt < maxRetries) {
        try {
          return await createOrderByApi(params);
        } catch (error) {
          const errorPayload = JSON.stringify(error.response?.data || error.message || '').toLowerCase();
          const isDuplicateError = errorPayload.includes('e11000') || errorPayload.includes('duplicate');

          attempt += 1;

          if (!isDuplicateError || attempt >= maxRetries) {
            throw error;
          }

          await new Promise((res) => setTimeout(res, 200));
        }
      }

      throw new Error('Order creation retry loop exhausted unexpectedly');
    };

    for (let i = 0; i < 50; i += 1) {
      const store = stores[i % stores.length];
      const apiStore = staffApiByStoreId.get(store._id.toString());
      const p1 = sellableProducts[i % sellableProducts.length];
      const p2 = sellableProducts[(i + 7) % sellableProducts.length];
      const qty1 = randomInt(2, 8);
      const qty2 = randomInt(1, 5);

      const data = await callApi(
        `Create massive order ${i + 1}`,
        () =>
          createOrderByApiWithRetry({
            apiStore,
            store,
            requestedDeliveryDate: addDays(NOW, randomInt(1, 7)).toISOString(),
            note: `Massive dashboard order ${i + 1}`,
            items: [
              { productId: p1._id, quantityRequested: qty1 },
              { productId: p2._id, quantityRequested: qty2 },
            ],
          })
      );

      const order = data?.order;
      if (order?._id) {
        massiveOrders.push(order);

        const travelDate = randomPastDate(30);
        await Order.updateOne(
          { _id: order._id },
          {
            createdAt: travelDate,
            updatedAt: addHours(travelDate, randomInt(1, 6)),
          }
        );

        const invoice = await Invoice.findOne({ orderId: order._id });
        if (invoice) {
          await Invoice.updateOne(
            { _id: invoice._id },
            {
              invoiceDate: addHours(travelDate, 2),
              dueDate: addDays(travelDate, 30),
              createdAt: addHours(travelDate, 2),
              updatedAt: addHours(travelDate, 3),
            }
          );
        }

        await WalletTransaction.updateMany(
          { orderId: order._id },
          {
            timestamp: addHours(travelDate, 3),
            createdAt: addHours(travelDate, 3),
            updatedAt: addHours(travelDate, 3),
          }
        );
      }
    }

    // Create status diversity for dashboard: keep some Pending, move many to Approved, cancel some.
    const pendingMassive = await Order.find({ _id: { $in: massiveOrders.map((o) => o._id) }, status: 'Pending' });

    const toApprove = pendingMassive.slice(0, 30);
    const toReject = pendingMassive.slice(30, 38);

    for (const order of toApprove) {
      await callApi(
        `Approve massive order ${order.orderCode || order._id}`,
        () => apiCoordinator.post(`/logistics/orders/${order._id}/approve`, {})
      );
    }

    for (const order of toReject) {
      await callApi(
        `Reject massive order ${order.orderCode || order._id}`,
        () =>
          apiCoordinator.post(`/logistics/orders/${order._id}/reject`, {
            reason: 'Điều chỉnh cơ cấu sản phẩm theo chiến dịch bán hàng',
          }),
        { fatal: false }
      );
    }

    log.ok(`Massive order pipeline complete: ${massiveOrders.length} created, ${toApprove.length} approved, ${toReject.length} rejected`);

    // STEP 3.3 - Logistics scheduling API and transport flow
    log.step('3.3 Running trip auto-scheduling and shipping flow to validate vehicle capacity constraints...');

    await callApi('Auto-schedule trips', () => apiCoordinator.post('/logistics/trips/auto-schedule', {}), {
      fatal: false,
    });

    const tripsResp = await callApi('Fetch trips', () => apiCoordinator.get('/logistics/trips'));
    const tripsData = getDataPayload(tripsResp);
    const trips = Array.isArray(tripsData) ? tripsData : tripsData?.data || [];

    const sourceOrderIdSet = new Set(sourceOrders.map((o) => o._id.toString()));

    const candidateTrips = trips.filter((trip) => {
      const orderIds = (trip.orders || []).map((o) => (typeof o === 'string' ? o : o._id?.toString() || String(o)));
      return trip.status === 'Planning' && orderIds.some((id) => sourceOrderIdSet.has(id));
    });

    for (const trip of candidateTrips) {
      await callApi(
        `Trip ${trip.tripCode || trip._id}: Planning -> Waiting_For_Loading`,
        () => apiCoordinator.patch(`/logistics/trips/${trip._id}/status`, { status: 'Waiting_For_Loading' })
      );

      await callApi(
        `Trip ${trip.tripCode || trip._id}: start shipping`,
        () => apiKitchen.post(`/logistics/trips/${trip._id}/start-shipping`, {})
      );

      const tripDetailResp = await callApi(
        `Get trip detail ${trip.tripCode || trip._id}`,
        () => apiCoordinator.get(`/logistics/trips/${trip._id}`)
      );

      const tripDetailData = getDataPayload(tripDetailResp);
      const tripOrders = tripDetailData?.orders || [];

      for (const tOrder of tripOrders) {
        const orderId = typeof tOrder === 'string' ? tOrder : tOrder._id;
        if (!orderId) continue;

        const dbOrder = await Order.findById(orderId).select('storeId status').lean();
        if (!dbOrder || dbOrder.status !== 'In_Transit') continue;

        // Receive most orders to get strong 'Received' dataset for KPI dashboards.
        if (Math.random() < 0.85) {
          const apiStore = staffApiByStoreId.get(dbOrder.storeId.toString());
          await callApi(
            `Receive order ${orderId}`,
            () => apiStore.post(`/logistics/orders/${orderId}/receive`, {}),
            { fatal: false }
          );
        }
      }
    }

    // STEP 3.4 - Feedback records for received orders
    log.step('3.4 Creating 15+ feedback records for received orders...');

    const receivedOrders = await Order.find({ status: 'Received' }).sort({ createdAt: -1 }).limit(25).lean();

    const FEEDBACK_TAGS = [
      'Giao hàng nhanh/Đúng giờ',
      'Vận chuyển an toàn/Cẩn thận',
      'Thái độ Shipper tốt',
      'Sản phẩm chất lượng/Đẹp',
      'Đóng gói chắc chắn',
      'Giao hàng trễ hẹn',
      'Vận chuyển thiếu hàng',
      'Hàng hư hỏng do vận chuyển',
      'Giao sai sản phẩm',
      'Sản phẩm cận date/Hết hạn',
      'Bánh bị lỗi/Biến dạng',
      'Thái độ Shipper kém',
      'Khác',
    ];

    const feedbackDocs = [];
    for (let i = 0; i < Math.min(15, receivedOrders.length); i += 1) {
      const order = receivedOrders[i];
      const createdBy = staffByStoreId.get(order.storeId.toString())?._id || userByUsername['manager.kendo']._id;
      const positive = i % 4 !== 0;

      feedbackDocs.push({
        orderId: order._id,
        storeId: order.storeId,
        rating: positive ? randomInt(4, 5) : randomInt(2, 3),
        content: positive
          ? 'Chất lượng bánh rất tốt, hộp quà sang trọng, giao hàng đúng hẹn.'
          : 'Cần cải thiện thêm phần đóng gói ở khung giờ cao điểm.',
        tags: positive
          ? [pick(FEEDBACK_TAGS.slice(0, 5)), 'Sản phẩm chất lượng/Đẹp']
          : [pick(FEEDBACK_TAGS.slice(5, 12)), 'Khác'],
        images: positive
          ? [`https://cdn.kendo.demo/feedback/received-${i + 1}.jpg`]
          : [
              `https://cdn.kendo.demo/feedback/issue-${i + 1}-a.jpg`,
              `https://cdn.kendo.demo/feedback/issue-${i + 1}-b.jpg`,
            ],
        createdBy,
        createdAt: addHours(order.createdAt, randomInt(6, 36)),
        updatedAt: addHours(order.createdAt, randomInt(7, 40)),
      });
    }

    if (feedbackDocs.length > 0) {
      await Feedback.insertMany(feedbackDocs, { ordered: false });
    }

    // STEP 3.5 - IngredientRequests via API (create -> approve -> complete + time-travel)
    log.step('3.5 Seeding IngredientRequests via API workflow...');

    const ingredientCandidates = ingredients.filter((i) => i.unit === 'kg');
    const createdIngredientRequests = [];

    // Step A: Kitchen creates 15 requests
    for (let i = 0; i < 15; i += 1) {
      const ingredient = pick(ingredientCandidates);

      const createResp = await callApi(
        `Create ingredient request ${i + 1}`,
        () =>
          apiKitchen.post('/ingredient-requests', {
            ingredientId: ingredient._id,
            quantityRequested: randomInt(50, 200),
            unit: 'kg',
            requestType: i % 3 === 0 ? 'PLANNED' : 'URGENT',
            neededByDate: addDays(NOW, randomInt(1, 10)).toISOString(),
            note: `Yêu cầu nhập ${ingredient.ingredientName} cho kế hoạch bếp #${i + 1}`,
          })
      );

      const createdReq = getDataPayload(createResp);
      const requestData = createdReq?.data || createdReq;
      if (requestData?._id) {
        createdIngredientRequests.push({
          _id: requestData._id,
          supplierId: suppliers[i % suppliers.length]._id,
        });
      }
    }

    // Step B: Coordinator approves ~10 requests
    const approvedIngredientRequests = createdIngredientRequests.slice(0, 10);
    for (const reqDoc of approvedIngredientRequests) {
      await callApi(
        `Approve ingredient request ${reqDoc._id}`,
        () =>
          apiCoordinator.put(`/ingredient-requests/${reqDoc._id}/status`, {
            status: 'APPROVED',
            expectedDeliveryDate: addDays(NOW, randomInt(1, 7)).toISOString(),
            supplierId: reqDoc.supplierId,
          })
      );
    }

    // Step C: Kitchen completes 7 approved requests
    const completedIngredientRequests = approvedIngredientRequests.slice(0, 7);
    for (const reqDoc of completedIngredientRequests) {
      const supplierDoc = suppliers.find((s) => s._id.toString() === reqDoc.supplierId.toString()) || suppliers[0];

      await callApi(
        `Complete ingredient request ${reqDoc._id}`,
        () =>
          apiKitchen.put(`/ingredient-requests/${reqDoc._id}/complete`, {
            actualCost: randomInt(8_000_000, 45_000_000),
            expiryDate: addDays(NOW, randomInt(30, 180)).toISOString(),
            supplierId: reqDoc.supplierId,
            supplierName: supplierDoc.name,
            receiptImage: `https://cdn.kendo.demo/receipts/ingredient-request-${reqDoc._id}.jpg`,
          }),
        { fatal: false }
      );
    }

    // Time-travel createdAt/updatedAt across last 30 days for dashboard charts
    for (const reqDoc of createdIngredientRequests) {
      const createdAt = randomPastDate(30);
      await IngredientRequest.findByIdAndUpdate(reqDoc._id, {
        createdAt,
        updatedAt: addHours(createdAt, randomInt(2, 72)),
      });
    }

    log.ok(
      `IngredientRequests seeded: ${createdIngredientRequests.length} created, ${approvedIngredientRequests.length} approved, ${completedIngredientRequests.length} completed`
    );

    // Final stats
    const [
      orderCount,
      invoiceCount,
      planCount,
      tripCount,
      feedbackCount,
      ingredientCount,
      ingredientBatchCount,
      ingredientRequestCount,
      productCount,
      walletTxCount,
    ] = await Promise.all([
      Order.countDocuments(),
      Invoice.countDocuments(),
      ProductionPlan.countDocuments(),
      DeliveryTrip.countDocuments(),
      Feedback.countDocuments(),
      Ingredient.countDocuments(),
      IngredientBatch.countDocuments(),
      IngredientRequest.countDocuments(),
      Product.countDocuments(),
      WalletTransaction.countDocuments(),
    ]);

    log.phase('================ ULTIMATE API SEEDER COMPLETE ================');
    log.ok(`Orders: ${orderCount}`);
    log.ok(`Invoices: ${invoiceCount}`);
    log.ok(`ProductionPlans: ${planCount}`);
    log.ok(`DeliveryTrips: ${tripCount}`);
    log.ok(`Feedbacks: ${feedbackCount}`);
    log.ok(`Ingredients: ${ingredientCount}`);
    log.ok(`IngredientBatches: ${ingredientBatchCount}`);
    log.ok(`IngredientRequests: ${ingredientRequestCount}`);
    log.ok(`Products: ${productCount}`);
    log.ok(`WalletTransactions: ${walletTxCount}`);
  } catch (error) {
    log.err('Seeder execution failed');
    console.error(`${C.red}${JSON.stringify(error.response?.data || error.message, null, 2)}${C.reset}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    log.ok('MongoDB disconnected');
  }
};

main();
