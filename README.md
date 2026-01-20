# Kendo Mooncake Central Kitchen System - Backend

Backend API for managing mooncake production, inventory, and distribution operations.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
MONGO_URI=mongodb://localhost:27017/kendo_mooncake_db
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=30d
```

### 3. Seed Database

```bash
npm run seed
```

### 4. Start Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 5. Access Swagger Documentation

Open your browser:
```
http://localhost:5000/api-docs
```

## 📁 Project Structure

```
├── config/             # Configuration files
│   └── db.js          # MongoDB connection
├── controllers/        # Business logic
│   ├── authController.js
│   ├── userController.js
│   └── storeController.js
├── middleware/         # Custom middleware
│   ├── authMiddleware.js
│   └── errorHandler.js
├── models/            # Mongoose schemas
│   ├── Role.js
│   ├── Store.js
│   └── User.js
├── routes/            # API routes
│   ├── authRoutes.js
│   ├── userRoutes.js
│   └── storeRoutes.js
├── app.js             # Express app setup
├── seeder.js          # Database seeder
├── swagger.yaml       # API documentation
└── package.json       # Dependencies
```

## 🎯 Feature 1: Authentication, User & Store Management

### Roles
- **Admin** - Full system access (HQ)
- **Manager** - Manages operations (HQ)
- **KitchenStaff** - Production management (HQ)
- **StoreStaff** - Store operations (Assigned to specific store)
- **Coordinator** - Coordination between stores and kitchen (HQ)

### Business Logic
- **HQ Staff** (Admin/Manager/Kitchen): `storeId` is `null`
- **Store Staff**: `storeId` is **required** and links to their store
- **Soft Delete**: Users are deactivated (`isActive: false`) instead of deleted

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user profile (Protected)

### Users (Admin/Manager only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Soft delete user (Admin only)

### Stores
- `GET /api/stores` - Get all stores (All authenticated)
- `GET /api/stores/:id` - Get store by ID
- `POST /api/stores` - Create store (Admin/Manager)
- `PUT /api/stores/:id` - Update store (Admin/Manager)
- `DELETE /api/stores/:id` - Delete store (Admin only)

## 🔑 Sample Credentials (After Seeding)

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Store Staff | `store1` | `store123` |

## 🛠️ Tech Stack

- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT + bcryptjs
- **Documentation:** Swagger UI Express + YAML
- **Dev Tools:** Nodemon

## 📚 Usage Example

### 1. Login
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### 2. Use Token
```bash
GET http://localhost:5000/api/auth/me
Authorization: Bearer YOUR_TOKEN_HERE
```

### 3. Test on Swagger
1. Go to http://localhost:5000/api-docs
2. Click "Authorize" button
3. Enter: `Bearer YOUR_TOKEN`
4. Test all endpoints!

## 🔐 Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Role-based authorization
- ✅ Protected routes
- ✅ Soft delete for users
- ✅ Business logic validation (StoreStaff must have store)

## 📝 Notes

- All passwords are hashed before saving
- JWT tokens expire in 30 days (configurable)
- Store Staff MUST be assigned to a store
- HQ staff (Admin, Manager, Kitchen) cannot be assigned to a store
- Soft delete preserves data integrity

---

**Happy Coding! 🚀**
