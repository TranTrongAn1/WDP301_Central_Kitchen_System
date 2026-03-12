/**
 * seedProducts.js
 *
 * Generates a matrix of 15 Mooncake products (5 flavors × 3 egg variations).
 * Deletes ONLY the Product collection before inserting — no other data is touched.
 *
 * Usage:
 *   node seedProducts.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Ingredient = require('./models/Ingredient');

// ============================================================
// FLAVOR DEFINITIONS
// pasteKey must exactly match the ingredientName in the DB (lowercased for map lookup)
// ============================================================
const FLAVORS = [
  { name: 'Green Bean', code: 'GB', basePrice: 150000, pasteKey: 'green bean paste' },
  { name: 'Mixed Nuts', code: 'MN', basePrice: 180000, pasteKey: 'mixed nuts'        },
  { name: 'Lotus Seed', code: 'LS', basePrice: 165000, pasteKey: 'lotus seed paste'  },
  { name: 'Taro',       code: 'TR', basePrice: 145000, pasteKey: 'taro paste'        },
  { name: 'Durian',     code: 'DR', basePrice: 200000, pasteKey: 'durian paste'      },
];

const seedProducts = async () => {
  await connectDB();

  try {
    // ============================================================
    // STEP 1: Clean up Product collection
    // ============================================================
    const deletedCount = await Product.deleteMany({});
    console.log(`\n🗑️  Deleted ${deletedCount.deletedCount} existing product(s).`);

    // ============================================================
    // STEP 2: Fetch base category
    // ============================================================
    const mooncakeCategory = await Category.findOne({ categoryName: /mooncake/i });
    if (!mooncakeCategory) {
      console.error('❌ Category "Mooncake" not found. Please seed categories first.');
      process.exit(1);
    }
    console.log(`✅ Found category: ${mooncakeCategory.categoryName} (${mooncakeCategory._id})`);

    // ============================================================
    // STEP 3: Fetch required ingredients (exact DB names)
    // ============================================================
    const ingredientNames = [
      'Flour',
      'Sugar',
      'Vegetable Oil',
      'Salted Egg Yolk',
      'Green Bean Paste',
      'Mixed Nuts',          // exact DB name — NOT "Mixed Nuts Paste"
      'Lotus Seed Paste',
      'Taro Paste',
      'Durian Paste',
    ];

    const ingredients = await Ingredient.find({ ingredientName: { $in: ingredientNames } });

    // Build a lookup map keyed by lowercased ingredientName
    const ingredientMap = {};
    for (const ing of ingredients) {
      ingredientMap[ing.ingredientName.toLowerCase()] = ing;
    }

    // Validate every required ingredient was found
    const missing = ingredientNames.filter(n => !ingredientMap[n.toLowerCase()]);
    if (missing.length > 0) {
      console.error(`❌ Missing ingredient(s): ${missing.join(', ')}`);
      console.error('Please seed ingredients first.');
      process.exit(1);
    }
    console.log(`✅ Found all ${ingredientNames.length} required ingredients.\n`);

    const flourId = ingredientMap['flour']._id;
    const sugarId = ingredientMap['sugar']._id;
    const oilId   = ingredientMap['vegetable oil']._id;
    const eggId   = ingredientMap['salted egg yolk']._id;

    // ============================================================
    // STEP 4: Build product matrix — 5 flavors × 3 variations = 15
    // ============================================================
    const products = [];

    for (const flavor of FLAVORS) {
      const pasteId = ingredientMap[flavor.pasteKey]._id;

      // Base recipe: flour + sugar + oil + flavor paste
      const baseRecipe = [
        { ingredientId: flourId, quantity: 0.05 },
        { ingredientId: sugarId, quantity: 0.02 },
        { ingredientId: oilId,   quantity: 0.01 },
        { ingredientId: pasteId, quantity: 0.08 },
      ];

      // ── 0 Egg variant ──────────────────────────────────────────
      products.push({
        name:          `${flavor.name} Mooncake (0 Egg)`,
        sku:           `MOON-${flavor.code}-0E`,
        categoryId:    mooncakeCategory._id,
        price:         flavor.basePrice,
        shelfLifeDays: 30,
        weight:        0.15,
        recipe:        [...baseRecipe],
      });

      // ── 1 Egg variant ──────────────────────────────────────────
      products.push({
        name:          `${flavor.name} Mooncake (1 Egg)`,
        sku:           `MOON-${flavor.code}-1E`,
        categoryId:    mooncakeCategory._id,
        price:         flavor.basePrice + 20000,
        shelfLifeDays: 30,
        weight:        0.18,
        recipe:        [...baseRecipe, { ingredientId: eggId, quantity: 1 }],
      });

      // ── 2 Eggs variant ─────────────────────────────────────────
      products.push({
        name:          `${flavor.name} Mooncake (2 Eggs)`,
        sku:           `MOON-${flavor.code}-2E`,
        categoryId:    mooncakeCategory._id,
        price:         flavor.basePrice + 40000,
        shelfLifeDays: 30,
        weight:        0.21,
        recipe:        [...baseRecipe, { ingredientId: eggId, quantity: 2 }],
      });
    }

    // ============================================================
    // STEP 5: Insert all 15 products
    // ============================================================
    const inserted = await Product.insertMany(products);

    console.log(`✅ Inserted ${inserted.length} products:\n`);
    inserted.forEach(p => {
      console.log(`   [${p.sku}]  ${p.name}  —  ${p.price.toLocaleString()} VND  (${p.weight} kg)`);
    });

    console.log('\n🎉 seedProducts completed successfully.\n');
  } catch (error) {
    console.error('❌ Seeder error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected.');
    process.exit(0);
  }
};

seedProducts();
