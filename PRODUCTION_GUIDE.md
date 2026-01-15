# Production & Batch Management Guide

## 🎯 Overview

This guide covers **Feature 3: Production & Batch Management** - the core production logic of the Kendo Mooncake Central Kitchen System. This module handles production planning and automatically creates inventory batches with calculated expiration dates.

## 🔄 Production Workflow

```
1. Create Production Plan (Manager/Kitchen)
   ↓
2. Start Production (Status: Planned → In_Progress)
   ↓
3. Complete Each Item (POST /complete-item)
   ↓
4. System AUTO-CREATES Batch with:
   - BatchCode = BATCH-YYYYMMDD-SKU
   - mfgDate = Today
   - expDate = Today + Product.shelfLifeDays
   ↓
5. All Items Completed → Plan Status: Completed
```

## 📊 Data Models

### 1. ProductionPlan

Represents a production plan with multiple products to be produced.

**Schema:**
```javascript
{
  planCode: String (unique, uppercase, required),
  planDate: Date (default: now),
  status: Enum ['Planned', 'In_Progress', 'Completed', 'Cancelled'],
  note: String,
  
  details: [
    {
      productId: ObjectId (ref: 'Product', required),
      plannedQuantity: Number (min: 1, required),
      actualQuantity: Number (default: 0),
      status: Enum ['Pending', 'In_Progress', 'Completed', 'Cancelled']
    }
  ],
  
  createdAt: Date,
  updatedAt: Date
}
```

**Validation:**
- Details array must have at least one item
- Cannot update if status is 'Completed' or 'Cancelled'
- To mark plan as 'Completed', all details must be completed

### 2. Batch (Updated)

Represents a production batch with auto-calculated expiration date.

**Schema:**
```javascript
{
  batchCode: String (unique, uppercase, required),
  productId: ObjectId (ref: 'Product', required),
  mfgDate: Date (default: now, required),
  expDate: Date (auto-calculated, required),
  initialQuantity: Number (min: 0, required),
  currentQuantity: Number (min: 0, required),
  
  createdAt: Date,
  updatedAt: Date
}
```

**Auto-calculation Logic:**
- `expDate` = `mfgDate` + `Product.shelfLifeDays`
- Example: If product shelfLife = 30 days, and mfgDate = 2026-01-15, then expDate = 2026-02-14

## 🔐 Access Control

### Production Plans

| Action | Admin | Manager | KitchenStaff | StoreStaff |
|--------|-------|---------|--------------|------------|
| View | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ |
| Update | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| Complete Item | ✅ | ✅ | ✅ | ❌ |

### Batches

| Action | Admin | Manager | KitchenStaff | StoreStaff |
|--------|-------|---------|--------------|------------|
| View | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |

## 📡 API Endpoints

### Production Plans

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/production` | Get all plans | All |
| GET | `/api/production?status=Planned` | Filter by status | All |
| GET | `/api/production/:id` | Get single plan | All |
| POST | `/api/production` | Create plan | Admin, Manager, Kitchen |
| PUT | `/api/production/:id` | Update plan | Admin, Manager, Kitchen |
| PATCH | `/api/production/:id/status` | Update status | Admin, Manager, Kitchen |
| POST | `/api/production/:planId/complete-item` | **Complete item & create batch** | Admin, Manager, Kitchen |
| DELETE | `/api/production/:id` | Delete plan | Admin, Manager |

### Batches

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/batches` | Get all batches | All |
| GET | `/api/batches?expiring=true` | Get expiring batches (next 7 days) | All |
| GET | `/api/batches?productId=xxx` | Filter by product | All |
| GET | `/api/batches/:id` | Get single batch | All |
| POST | `/api/batches` | Create batch manually | Admin, Manager, Kitchen |
| PUT | `/api/batches/:id` | Update batch | Admin, Manager |
| DELETE | `/api/batches/:id` | Delete batch | Admin, Manager |

## 🚀 Usage Examples

### 1. Create Production Plan

**Request:**
```bash
POST /api/production
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "planCode": "PLAN-20260120-001",
  "planDate": "2026-01-20",
  "note": "Production for Tet Holiday orders",
  "details": [
    {
      "productId": "GREEN_BEAN_MOONCAKE_ID",
      "plannedQuantity": 200
    },
    {
      "productId": "LOTUS_MOONCAKE_ID",
      "plannedQuantity": 300
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Production plan created successfully",
  "data": {
    "_id": "678...",
    "planCode": "PLAN-20260120-001",
    "planDate": "2026-01-20T00:00:00.000Z",
    "status": "Planned",
    "note": "Production for Tet Holiday orders",
    "details": [
      {
        "productId": {
          "_id": "678...",
          "name": "Green Bean Mooncake",
          "sku": "MOON-GB-001",
          "shelfLifeDays": 30
        },
        "plannedQuantity": 200,
        "actualQuantity": 0,
        "status": "Pending"
      },
      {
        "productId": {
          "_id": "678...",
          "name": "Lotus Seed Mooncake",
          "sku": "MOON-LS-002",
          "shelfLifeDays": 30
        },
        "plannedQuantity": 300,
        "actualQuantity": 0,
        "status": "Pending"
      }
    ],
    "createdAt": "2026-01-15T00:00:00.000Z"
  }
}
```

### 2. Complete Production Item (Auto-Create Batch) 🔥

This is the **CORE LOGIC** that automatically creates batches.

**Request:**
```bash
POST /api/production/{PLAN_ID}/complete-item
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "productId": "GREEN_BEAN_MOONCAKE_ID",
  "actualQuantity": 195
}
```

**What Happens:**
1. ✅ Validates production plan exists and is not completed/cancelled
2. ✅ Finds the product in plan details
3. ✅ Gets product's `shelfLifeDays` from database
4. ✅ Calculates dates:
   - `mfgDate` = Today (e.g., 2026-01-20)
   - `expDate` = Today + shelfLifeDays (e.g., 2026-02-19)
5. ✅ Generates `batchCode`: `BATCH-20260120-MOON-GB-001`
6. ✅ Auto-creates Batch with all calculated values
7. ✅ Updates production plan detail:
   - `actualQuantity` = 195
   - `status` = 'Completed'
8. ✅ Updates production plan status to 'In_Progress' (if was 'Planned')
9. ✅ If all details completed → plan status = 'Completed'

**Response (201):**
```json
{
  "success": true,
  "message": "Production item completed and batch created successfully",
  "data": {
    "plan": {
      "_id": "678...",
      "planCode": "PLAN-20260120-001",
      "status": "In_Progress",
      "details": [
        {
          "productId": {
            "name": "Green Bean Mooncake",
            "sku": "MOON-GB-001"
          },
          "plannedQuantity": 200,
          "actualQuantity": 195,
          "status": "Completed"
        },
        {
          "plannedQuantity": 300,
          "actualQuantity": 0,
          "status": "Pending"
        }
      ]
    },
    "batch": {
      "_id": "678...",
      "batchCode": "BATCH-20260120-MOON-GB-001",
      "productId": {
        "_id": "678...",
        "name": "Green Bean Mooncake",
        "sku": "MOON-GB-001",
        "shelfLifeDays": 30
      },
      "mfgDate": "2026-01-20T00:00:00.000Z",
      "expDate": "2026-02-19T00:00:00.000Z",
      "initialQuantity": 195,
      "currentQuantity": 195,
      "createdAt": "2026-01-20T00:00:00.000Z"
    }
  }
}
```

### 3. Get Expiring Batches (for StoreStaff)

**Request:**
```bash
GET /api/batches?expiring=true
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
      "batchCode": "BATCH-20260110-MOON-GB-001",
      "productId": {
        "name": "Green Bean Mooncake",
        "sku": "MOON-GB-001"
      },
      "mfgDate": "2026-01-10T00:00:00.000Z",
      "expDate": "2026-01-17T00:00:00.000Z",
      "currentQuantity": 45
    }
    // ... more expiring batches
  ]
}
```

### 4. Update Production Plan Status

**Request:**
```bash
PATCH /api/production/{PLAN_ID}/status
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "status": "Cancelled"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Production plan status updated successfully",
  "data": {
    "_id": "678...",
    "planCode": "PLAN-20260120-001",
    "status": "Cancelled",
    "details": [...]
  }
}
```

## 🔍 BatchCode Generation Logic

The system generates unique batch codes automatically:

**Format:** `BATCH-YYYYMMDD-{PRODUCT_SKU}`

**Example:**
- Product SKU: `MOON-GB-001`
- Manufacturing Date: January 15, 2026
- Generated Code: `BATCH-20260115-MOON-GB-001`

**Collision Handling:**
If the same batch code exists (same product, same day), it appends a counter:
- `BATCH-20260115-MOON-GB-001-1`
- `BATCH-20260115-MOON-GB-001-2`
- etc.

## 📅 Expiration Date Calculation

**Formula:**
```
expDate = mfgDate + product.shelfLifeDays
```

**Examples:**

| Product | Shelf Life | Mfg Date | Exp Date |
|---------|------------|----------|----------|
| Green Bean Mooncake | 30 days | 2026-01-15 | 2026-02-14 |
| Lotus Mooncake | 30 days | 2026-01-15 | 2026-02-14 |
| Gift Box | 365 days | 2026-01-15 | 2027-01-15 |

**Implementation:**
```javascript
const mfgDate = new Date();
const expDate = new Date();
expDate.setDate(expDate.getDate() + product.shelfLifeDays);
```

## ✅ Validation Rules

### Production Plan
- ✅ Plan code must be unique
- ✅ Details array must not be empty
- ✅ All products must exist in database
- ✅ Cannot update if status is 'Completed' or 'Cancelled'
- ✅ To mark as 'Completed', all detail items must be completed
- ✅ Can only delete if status is 'Planned' or 'Cancelled'

### Complete Production Item
- ✅ Plan must exist and not be 'Completed' or 'Cancelled'
- ✅ Product must be in the plan details
- ✅ Product must not already be completed
- ✅ Actual quantity must be > 0
- ✅ Product must exist in database (to get shelf life)

### Batch
- ✅ Batch code must be unique
- ✅ Product must exist
- ✅ Expiration date must be after manufacturing date
- ✅ Initial quantity and current quantity must be >= 0

## 🌱 Seeder Data

Run the seeder to get sample production plan:

```bash
node seeder.js
```

**Creates:**
- 1 Production Plan with status 'Planned'
- 3 Product details (Green Bean, Lotus, Mixed Mooncake)
- All with 'Pending' status, ready to be completed

## 🧪 Testing Workflow

### **Complete Test Scenario:**

1. **Login as Kitchen Staff**
```bash
POST /api/auth/login
{
  "username": "kitchen",
  "password": "kitchen123"
}
```

2. **View Production Plans**
```bash
GET /api/production
```

3. **Complete First Item**
```bash
POST /api/production/{PLAN_ID}/complete-item
{
  "productId": "GREEN_BEAN_MOONCAKE_ID",
  "actualQuantity": 95
}
```

4. **Verify Batch Created**
```bash
GET /api/batches
# Should see new batch with:
# - batchCode: BATCH-YYYYMMDD-MOON-GB-001
# - expDate: calculated from mfgDate + 30 days
```

5. **Complete Remaining Items**
```bash
POST /api/production/{PLAN_ID}/complete-item
{
  "productId": "LOTUS_MOONCAKE_ID",
  "actualQuantity": 145
}

POST /api/production/{PLAN_ID}/complete-item
{
  "productId": "MIXED_MOONCAKE_ID",
  "actualQuantity": 78
}
```

6. **Verify Plan Status**
```bash
GET /api/production/{PLAN_ID}
# Status should now be "Completed"
```

7. **Check Expiring Batches (as StoreStaff)**
```bash
POST /api/auth/login
{
  "username": "store1",
  "password": "store1123"
}

GET /api/batches?expiring=true
```

## 🐛 Troubleshooting

### Error: "Production plan must have at least one product detail"
- Ensure `details` array is not empty in request body

### Error: "StoreStaff must be assigned to a store"
- This is from the User model, unrelated to production

### Error: "Cannot mark plan as Completed. Not all items are completed"
- Complete all detail items first using `/complete-item` endpoint
- Or complete items individually

### Error: "This production item is already completed"
- The item has already been completed
- Check plan details to see actual quantity

### Error: "Product not found in this production plan"
- Verify the productId is in the plan's details array
- Get plan first: `GET /api/production/{id}`

## 📊 Business Logic Flow

```
┌─────────────────────────────────────────┐
│  1. Kitchen Creates Production Plan     │
│     - Multiple products                  │
│     - Planned quantities                 │
│     - Status: Planned                    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  2. Kitchen Starts Production           │
│     - Updates status to In_Progress     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  3. Complete Each Product Item          │
│     POST /complete-item                  │
│     ┌───────────────────────────────┐   │
│     │ • Get Product.shelfLifeDays   │   │
│     │ • Calculate expDate           │   │
│     │ • Generate BatchCode          │   │
│     │ • Create Batch (AUTO)         │   │
│     │ • Update Plan Detail          │   │
│     └───────────────────────────────┘   │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  4. All Items Completed?                │
│     YES → Plan Status: Completed        │
│     NO  → Plan Status: In_Progress      │
└─────────────────────────────────────────┘
```

## 💡 Pro Tips

1. **Batch Code Uniqueness:** The system handles same-day production of same product by adding counters

2. **Shelf Life Accuracy:** Always update product shelf life before production if changed

3. **Expiring Batches:** Store staff can monitor with `?expiring=true` query parameter

4. **Production Planning:** Create plans in advance, complete items as production finishes

5. **Partial Production:** Actual quantity can differ from planned (e.g., 95 instead of 100)

6. **Status Transitions:**
   - Planned → In_Progress (auto when first item completed)
   - In_Progress → Completed (auto when all items completed)
   - Any → Cancelled (manual)

---

**Need Help?** Check the Swagger documentation at http://localhost:5000/api-docs
