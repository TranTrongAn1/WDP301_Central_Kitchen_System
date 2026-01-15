# Master Data Management Guide

## 🎯 Overview

This guide covers the **Master Data Management** module for the Kendo Mooncake Central Kitchen System, including Categories, Ingredients, and Products with Recipe and Bundle capabilities.

## 📊 Data Models

### 1. Category
Organizes products into logical groups.

**Schema:**
```javascript
{
  name: String (required, unique),
  description: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Sample Categories:**
- Mooncake
- Gift Box
- Raw Material
- Combo Set

### 2. Ingredient
Represents raw materials used in production.

**Schema:**
```javascript
{
  name: String (required, unique),
  unit: String (enum: ['kg', 'g', 'l', 'ml', 'pcs'], required),
  costPrice: Number (required, min: 0),
  warningThreshold: Number (default: 10, min: 0),
  createdAt: Date,
  updatedAt: Date
}
```

**Sample Ingredients:**
- Flour (kg) - 25,000 VND
- Sugar (kg) - 30,000 VND
- Salted Egg Yolk (pcs) - 5,000 VND
- Green Bean Paste (kg) - 80,000 VND
- Lotus Seed Paste (kg) - 120,000 VND

### 3. Product
Represents products with optional recipe and bundle configurations.

**Schema:**
```javascript
{
  name: String (required),
  sku: String (required, unique, uppercase),
  categoryId: ObjectId (ref: 'Category', required),
  price: Number (required, min: 0),
  shelfLifeDays: Number (required, min: 1),
  image: String (URL format),
  
  // Recipe: ingredients needed to produce this product
  recipe: [
    {
      ingredientId: ObjectId (ref: 'Ingredient'),
      quantity: Number (min: 0)
    }
  ],
  
  // Bundle: child products included in combo
  bundleItems: [
    {
      childProductId: ObjectId (ref: 'Product'),
      quantity: Number (min: 1)
    }
  ],
  
  createdAt: Date,
  updatedAt: Date
}
```

**Product Types:**
1. **Regular Product with Recipe** - E.g., Green Bean Mooncake
2. **Bundle/Combo Product** - E.g., Mid-Autumn Festival Combo Set
3. **Simple Product** - E.g., Gift Box (no recipe or bundle)

## 🔐 Access Control

All endpoints require authentication. Authorization levels:

### Read Access (GET)
- ✅ Admin
- ✅ Manager
- ✅ StoreStaff
- ✅ KitchenStaff
- ✅ Coordinator

### Write Access (POST, PUT, DELETE)
- ✅ Admin
- ✅ Manager
- ❌ Others

## 📡 API Endpoints

### Categories

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/categories` | Get all categories | All roles |
| GET | `/api/categories/:id` | Get single category | All roles |
| POST | `/api/categories` | Create category | Admin, Manager |
| PUT | `/api/categories/:id` | Update category | Admin, Manager |
| DELETE | `/api/categories/:id` | Delete category* | Admin, Manager |

*Cannot delete if category is used by products

### Ingredients

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/ingredients` | Get all ingredients | All roles |
| GET | `/api/ingredients/:id` | Get single ingredient | All roles |
| POST | `/api/ingredients` | Create ingredient | Admin, Manager |
| PUT | `/api/ingredients/:id` | Update ingredient | Admin, Manager |
| DELETE | `/api/ingredients/:id` | Delete ingredient* | Admin, Manager |

*Cannot delete if ingredient is used in recipes

### Products

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/products` | Get all products | All roles |
| GET | `/api/products?categoryId=xxx` | Filter by category | All roles |
| GET | `/api/products/:id` | Get single product | All roles |
| POST | `/api/products` | Create product | Admin, Manager |
| PUT | `/api/products/:id` | Update product | Admin, Manager |
| DELETE | `/api/products/:id` | Delete product* | Admin, Manager |

*Cannot delete if product is used in bundles

## 🚀 Usage Examples

### 1. Create Category

**Request:**
```bash
POST /api/categories
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Mooncake",
  "description": "Traditional mooncake products"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "_id": "678...",
    "name": "Mooncake",
    "description": "Traditional mooncake products",
    "createdAt": "2026-01-15T00:00:00.000Z",
    "updatedAt": "2026-01-15T00:00:00.000Z"
  }
}
```

### 2. Create Ingredient

**Request:**
```bash
POST /api/ingredients
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Flour",
  "unit": "kg",
  "costPrice": 25000,
  "warningThreshold": 50
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Ingredient created successfully",
  "data": {
    "_id": "678...",
    "name": "Flour",
    "unit": "kg",
    "costPrice": 25000,
    "warningThreshold": 50,
    "createdAt": "2026-01-15T00:00:00.000Z",
    "updatedAt": "2026-01-15T00:00:00.000Z"
  }
}
```

### 3. Create Product with Recipe

**Request:**
```bash
POST /api/products
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Green Bean Mooncake",
  "sku": "MOON-GB-001",
  "categoryId": "CATEGORY_ID_HERE",
  "price": 150000,
  "shelfLifeDays": 30,
  "image": "https://example.com/mooncake.jpg",
  "recipe": [
    {
      "ingredientId": "FLOUR_ID",
      "quantity": 0.05
    },
    {
      "ingredientId": "SUGAR_ID",
      "quantity": 0.02
    },
    {
      "ingredientId": "GREEN_BEAN_PASTE_ID",
      "quantity": 0.08
    },
    {
      "ingredientId": "SALTED_EGG_ID",
      "quantity": 1
    }
  ],
  "bundleItems": []
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "_id": "678...",
    "name": "Green Bean Mooncake",
    "sku": "MOON-GB-001",
    "categoryId": {
      "_id": "678...",
      "name": "Mooncake",
      "description": "..."
    },
    "price": 150000,
    "shelfLifeDays": 30,
    "image": "https://example.com/mooncake.jpg",
    "recipe": [
      {
        "ingredientId": {
          "_id": "678...",
          "name": "Flour",
          "unit": "kg",
          "costPrice": 25000
        },
        "quantity": 0.05
      }
      // ... other ingredients
    ],
    "bundleItems": [],
    "createdAt": "2026-01-15T00:00:00.000Z",
    "updatedAt": "2026-01-15T00:00:00.000Z"
  }
}
```

### 4. Create Bundle/Combo Product

**Request:**
```bash
POST /api/products
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Mid-Autumn Festival Combo Set",
  "sku": "COMBO-MAF-001",
  "categoryId": "COMBO_CATEGORY_ID",
  "price": 450000,
  "shelfLifeDays": 30,
  "image": "https://example.com/combo.jpg",
  "recipe": [],
  "bundleItems": [
    {
      "childProductId": "GREEN_BEAN_MOONCAKE_ID",
      "quantity": 2
    },
    {
      "childProductId": "LOTUS_MOONCAKE_ID",
      "quantity": 2
    },
    {
      "childProductId": "GIFT_BOX_ID",
      "quantity": 1
    }
  ]
}
```

### 5. Get Products with Category Filter

**Request:**
```bash
GET /api/products?categoryId=MOONCAKE_CATEGORY_ID
Authorization: Bearer YOUR_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "678...",
      "name": "Green Bean Mooncake",
      "sku": "MOON-GB-001",
      "categoryId": {
        "_id": "678...",
        "name": "Mooncake"
      },
      "price": 150000,
      "shelfLifeDays": 30,
      "recipe": [...],
      "bundleItems": []
    }
    // ... more products
  ]
}
```

## ✅ Validation Rules

### Category
- ✅ Name must be unique
- ✅ Cannot delete if used by products

### Ingredient
- ✅ Name must be unique
- ✅ Unit must be one of: kg, g, l, ml, pcs
- ✅ Cost price must be >= 0
- ✅ Warning threshold must be >= 0
- ✅ Cannot delete if used in product recipes

### Product
- ✅ SKU must be unique and uppercase
- ✅ Category must exist
- ✅ Price must be >= 0
- ✅ Shelf life must be >= 1 day
- ✅ Image must be valid URL (if provided)
- ✅ All ingredients in recipe must exist
- ✅ All child products in bundle must exist
- ✅ Product cannot be bundled with itself
- ✅ Cannot delete if used in other product bundles

## 🌱 Seeder Data

Run the seeder to populate sample data:

```bash
node seeder.js
```

**Creates:**
- 4 Categories (Mooncake, Gift Box, Raw Material, Combo Set)
- 7 Ingredients (Flour, Sugar, Salted Egg, etc.)
- 5 Products:
  1. Green Bean Mooncake (with recipe)
  2. Lotus Seed Mooncake (with recipe)
  3. Mixed Flavor Mooncake (with recipe)
  4. Premium Gift Box (simple product)
  5. Mid-Autumn Festival Combo Set (bundle product)

## 🧪 Testing with Swagger

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open Swagger UI:**
   ```
   http://localhost:5000/api-docs
   ```

3. **Login and get token:**
   - Use `/api/auth/login` with credentials:
     - Username: `admin` or `manager`
     - Password: `admin123` or `manager123`

4. **Authorize:**
   - Click the "Authorize" button
   - Enter: `Bearer YOUR_TOKEN`

5. **Test the endpoints:**
   - Navigate to Categories, Ingredients, or Products sections
   - Try the GET, POST, PUT, DELETE operations

## 🔍 Business Logic

### Recipe Logic
When a product has a recipe:
- It defines the ingredients and quantities needed to produce one unit
- Useful for calculating production costs
- Helps in inventory management and procurement

**Example:**
```
1 Green Bean Mooncake requires:
- 0.05 kg Flour (50g)
- 0.02 kg Sugar (20g)
- 0.08 kg Green Bean Paste (80g)
- 1 piece Salted Egg Yolk
- 0.01 l Cooking Oil (10ml)
- 1 Egg (for brushing)
```

### Bundle Logic
When a product has bundleItems:
- It's a combo/set product containing other products
- Recipe should be empty for bundle products
- Useful for promotional packages and gift sets

**Example:**
```
1 Mid-Autumn Festival Combo Set contains:
- 2x Green Bean Mooncake
- 2x Lotus Seed Mooncake
- 1x Premium Gift Box
```

## 📈 Future Enhancements

1. **Inventory Integration**
   - Track ingredient stock levels
   - Alert when below warning threshold
   - Auto-calculate required ingredients for production orders

2. **Cost Calculation**
   - Auto-calculate product cost from recipe
   - Profit margin analysis
   - Pricing recommendations

3. **Image Upload**
   - Direct image upload (not just URL)
   - Image compression and optimization
   - Multiple images per product

4. **Versioning**
   - Track recipe changes over time
   - Historical cost data
   - Audit trail

5. **Bulk Operations**
   - Import/export via CSV
   - Bulk price updates
   - Batch product creation

## 🐛 Troubleshooting

### Error: "Category with this name already exists"
- Check if category name is unique
- Category names are case-sensitive

### Error: "Invalid category"
- Ensure the categoryId exists in the database
- Use a valid MongoDB ObjectId format

### Error: "Invalid ingredient ID"
- Check that all ingredientIds in recipe exist
- Verify ObjectId format

### Error: "A product cannot be bundled with itself"
- Remove any self-references in bundleItems
- Circular references are not allowed

### Error: "Cannot delete - in use"
- Check which products are using the category/ingredient
- Remove or reassign those products first
- Or use cascade delete (implement carefully)

---

**Need Help?** Check the Swagger documentation at http://localhost:5000/api-docs
