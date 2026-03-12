/**
 * seedTransactions.js
 *
 * Injects additional test data into the existing database WITHOUT wiping any
 * current data. Safe to run multiple times.
 *
 * What it creates:
 * - 4-5 new IngredientBatch documents FOR EACH existing Ingredient
 * - 5 Order documents            (status: 'Pending')
 * - 5 paired Invoice documents   (paymentMethod: 'Cash')
 *
 * Usage:
 * node seedTransactions.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const Ingredient = require('./models/Ingredient');
const IngredientBatch = require('./models/IngredientBatch');
const Order = require('./models/Order');
const Invoice = require('./models/Invoice');
const User = require('./models/User');
const Store = require('./models/Store');
const Product = require('./models/Product');
const Supplier = require('./models/Supplier');
const Role = require('./models/Role');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const futureDate = (daysMin, daysMax) => {
  const d = new Date();
  d.setDate(d.getDate() + randInt(daysMin, daysMax));
  return d;
};

const randomSuffix = () =>
  Math.random().toString(36).slice(2, 6).toUpperCase();

// ---------------------------------------------------------------------------
// Main seeder
// ---------------------------------------------------------------------------

const seedTransactions = async () => {
  await connectDB();

  // 1. Fetch required base data
  const store = await Store.findOne({ status: 'Active' });
  const preferredRoles = await Role.find({ roleName: { $in: ['StoreStaff', 'Manager'] } });
  const roleIds = preferredRoles.map((r) => r._id);
  const user = await User.findOne({ roleId: { $in: roleIds }, isActive: true });
  const product = await Product.findOne();
  const allIngredients = await Ingredient.find();
  const supplier = await Supplier.findOne({ status: 'Active' });

  if (!store || !user || !product || allIngredients.length === 0 || !supplier) {
    console.warn('⚠️  Missing required base data (Store, User, Product, Ingredient, or Supplier). Exiting.');
    process.exit(1);
  }

  const ts = Date.now();
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

  console.log('\n📦 Creating 4-5 IngredientBatches FOR EACH Ingredient...');
  
  // 2. Create 4-5 Batches for EACH Ingredient
  for (const ingredient of allIngredients) {
    const numBatches = randInt(4, 5);
    let totalQuantityAdded = 0;
    const batchDocs = [];

    for (let i = 1; i <= numBatches; i++) {
      const qty = randInt(50, 200);
      totalQuantityAdded += qty;

      batchDocs.push({
        ingredientId: ingredient._id,
        supplierId: supplier._id,
        batchCode: `IB-${ingredient.ingredientName.substring(0,3).toUpperCase()}-${ts}-${i}-${randomSuffix()}`,
        expiryDate: futureDate(30, 365),
        receivedDate: new Date(),
        initialQuantity: qty,
        currentQuantity: qty,
        price: ingredient.costPrice || 25000,
        isActive: true,
      });
    }

    await IngredientBatch.insertMany(batchDocs);
    await Ingredient.findByIdAndUpdate(ingredient._id, {
      $inc: { totalQuantity: totalQuantityAdded },
    });

    console.log(`  ✅ Added ${numBatches} batches for "${ingredient.ingredientName}" (Total +${totalQuantityAdded} ${ingredient.unit})`);
  }

  console.log('\n🛒 Creating 5 Order + Cash Invoice documents...');
  const TEST_PHONE = '0901234567';

  // 3. Create Orders and Cash Invoices
  for (let i = 1; i <= 30; i++) {
    const quantity = randInt(5, 30);
    const unitPrice = product.price;
    const subtotal = quantity * unitPrice;

    // --- Order ---
    const orderNumber = `ORD-SEED-${ts}-${i}`;
    const order = await Order.create({
      orderNumber: orderNumber,
      storeId: store._id,
      createdBy: user._id,
      status: 'Pending',
      requestedDeliveryDate: futureDate(3, 30),
      address: store.address,
      recipientName: user.fullName,
      recipientPhone: TEST_PHONE,
      items: [
        {
          productId: product._id,
          quantityRequested: quantity,
          quantity: quantity, // Assuming full fulfillment for simplicity
          unitPrice,
          subtotal,
        },
      ],
      totalAmount: subtotal,
      notes: 'Seeded by seedTransactions.js | Payment method: Cash',
    });

    // --- Invoice (Cash Payment) ---
    const invoiceNumber = `INV-SEED-${dateStr}-${i}-${randomSuffix()}`;

    const invoice = await Invoice.create({
      invoiceNumber,
      orderId: order._id,
      storeId: store._id,
      invoiceDate: new Date(),
      dueDate: futureDate(7, 14),
      subtotal,
      taxRate: 8, // Adding some realistic tax
      paymentStatus: 'Pending',
      paymentMethod: 'Cash', 
      notes: `Seeded test invoice. Planned payment method: Cash.`,
    });

    console.log(
      `  ✅ Order #${i}: ${order.orderNumber} (Qty: ${quantity}, Subtotal: ${subtotal.toLocaleString()}) -> Invoice: ${invoice.invoiceNumber}`
    );
  }

  console.log('\n🎉 seedTransactions.js completed successfully!\n');
  process.exit(0);
};

seedTransactions().catch((err) => {
  console.error('❌ Seeder failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});