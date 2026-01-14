# Authentication & User Management Guide

## 🔐 Overview

This guide explains the Authentication and User Management system for the Kendo Mooncake Central Kitchen System.

## 📋 User Roles

The system supports 5 distinct roles:

1. **Admin** - Full system access, can manage all resources
2. **Manager** - Manages operations across all stores and kitchen
3. **StoreStaff** - Manages operations for a specific store
4. **KitchenStaff** - Manages kitchen and production operations
5. **Coordinator** - Coordinates between stores and kitchen

### Role-Store Relationship Rules

- **StoreStaff**: MUST be assigned to a specific store (storeId is required)
- **Manager, KitchenStaff, Admin, Coordinator**: MUST NOT have a storeId (automatically set to null)

## 🚀 Quick Start

### Step 1: Create .env file

Create a `.env` file in the root directory:

```env
MONGO_URI=mongodb://localhost:27017/kendo_mooncake_db
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRE=30d
```

**Important**: Change `JWT_SECRET` to a strong, random string in production!

### Step 2: Seed the Database

Run the seeder to populate the database with sample data:

```bash
npm run seed
```

This will create:
- 5 roles (Admin, Manager, StoreStaff, KitchenStaff, Coordinator)
- 3 sample stores
- Sample users for each role

### Step 3: Start the Server

```bash
npm start
```

## 🔑 Sample Login Credentials

After running the seeder, you can use these credentials:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Manager | `manager` | `manager123` |
| Kitchen Staff | `kitchen` | `kitchen123` |
| Store 1 Staff | `store1` | `store1123` |
| Store 2 Staff | `store2` | `store2123` |
| Store 3 Staff | `store3` | `store3123` |

## 📡 API Endpoints

### 1. Register New User

**POST** `/api/auth/register`

**Request Body:**
```json
{
  "username": "newuser",
  "password": "password123",
  "fullName": "New User",
  "email": "newuser@kendomooncake.com",
  "roleId": "ROLE_OBJECT_ID_HERE",
  "storeId": "STORE_OBJECT_ID_HERE_IF_STORE_STAFF"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "678...",
    "username": "newuser",
    "fullName": "New User",
    "email": "newuser@kendomooncake.com",
    "role": "StoreStaff",
    "storeId": "678...",
    "storeName": "Kendo Central Store",
    "isActive": true
  }
}
```

### 2. Login

**POST** `/api/auth/login`

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "678...",
    "username": "admin",
    "fullName": "System Administrator",
    "email": "admin@kendomooncake.com",
    "role": "Admin",
    "storeId": null,
    "storeName": null,
    "isActive": true
  }
}
```

### 3. Get Current User

**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "678...",
    "username": "admin",
    "fullName": "System Administrator",
    "email": "admin@kendomooncake.com",
    "role": "Admin",
    "storeId": null,
    "storeName": null,
    "isActive": true,
    "createdAt": "2026-01-15T00:00:00.000Z"
  }
}
```

## 🔒 Using Protected Routes

To access protected routes, include the JWT token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/auth/me
```

### Example with Axios (Frontend)

```javascript
const token = 'YOUR_JWT_TOKEN';

axios.get('http://localhost:5000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## 🛡️ Middleware Usage

### Protect Routes

Use the `protect` middleware to require authentication:

```javascript
const { protect } = require('../middleware/authMiddleware');

router.get('/protected-route', protect, yourController);
```

### Authorize by Role

Use the `authorize` middleware to restrict access by role:

```javascript
const { protect, authorize } = require('../middleware/authMiddleware');

// Only Admin can access
router.post('/admin-only', protect, authorize('Admin'), yourController);

// Admin and Manager can access
router.get('/management', protect, authorize('Admin', 'Manager'), yourController);
```

## 🧪 Testing with Swagger UI

1. Open `http://localhost:5000/api-docs`
2. Go to the **Authentication** section
3. Try the **POST /api/auth/login** endpoint with sample credentials
4. Copy the token from the response
5. Click the **Authorize** button at the top
6. Enter: `Bearer YOUR_TOKEN_HERE`
7. Now you can test protected endpoints!

## 📊 Database Schema

### User Schema
```javascript
{
  username: String (unique, required, min: 3),
  passwordHash: String (hashed, required, min: 6),
  fullName: String (required),
  email: String (unique, required, valid email),
  roleId: ObjectId (ref: 'Role', required),
  storeId: ObjectId (ref: 'Store', nullable),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### Role Schema
```javascript
{
  roleName: String (enum: ['Admin', 'Manager', 'StoreStaff', 'KitchenStaff', 'Coordinator']),
  createdAt: Date,
  updatedAt: Date
}
```

### Store Schema
```javascript
{
  storeName: String (required),
  address: String (required),
  status: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

## ⚙️ Configuration

### JWT Configuration

- **JWT_SECRET**: Secret key for signing tokens (must be strong in production)
- **JWT_EXPIRE**: Token expiration time (default: 30d)

### Password Hashing

Passwords are automatically hashed using bcrypt with a salt round of 10 before saving to the database.

## 🔄 Seeder Commands

```bash
# Import sample data
npm run seed

# Delete all data
npm run seed:destroy
```

## 🚨 Error Handling

All authentication errors return a consistent format:

```json
{
  "success": false,
  "message": "Error message here",
  "stack": "Stack trace (only in development)"
}
```

Common error codes:
- **400**: Bad Request (validation errors, duplicate username/email)
- **401**: Unauthorized (invalid credentials, missing/invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (user/role/store not found)

## 🔐 Security Best Practices

1. **Never commit .env file** - It's in .gitignore
2. **Use strong JWT_SECRET** - At least 32 characters, random
3. **Use HTTPS in production** - Never send tokens over HTTP
4. **Implement rate limiting** - Prevent brute force attacks
5. **Rotate tokens regularly** - Consider refresh tokens for long-lived sessions
6. **Validate all inputs** - Never trust user input
7. **Log authentication attempts** - Monitor for suspicious activity

## 🎯 Next Steps

1. Implement password reset functionality
2. Add email verification
3. Implement refresh tokens
4. Add rate limiting
5. Add audit logging
6. Implement two-factor authentication (2FA)

---

**Need Help?** Check the Swagger documentation at http://localhost:5000/api-docs
