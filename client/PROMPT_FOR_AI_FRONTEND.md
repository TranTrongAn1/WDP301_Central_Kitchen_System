# 🤖 PROMPT CHO AI FRONTEND - AUTHENTICATION & ROLE-BASED ROUTING

> **Tạo bởi:** Senior Frontend Engineer  
> **Dự án:** Central Kitchen System  
> **Ngày:** 2026-01-26

---

## 📌 TỔNG QUAN HỆ THỐNG

### Công nghệ:
- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Auth:** JWT (JSON Web Token)
- **Token expiration:** 30 ngày (hoặc cấu hình trong `JWT_EXPIRE`)

---

## 🔐 AUTHENTICATION API

### 1. **POST /api/auth/login** - Đăng nhập

**Request Body:**
```json
{
  "username": "string (bắt buộc)",
  "password": "string (bắt buộc, tối thiểu 6 ký tự)"
}
```

**Response thành công (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
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

**Response thất bại (401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

### 2. **POST /api/auth/register** - Đăng ký (CHỈ ADMIN)

**Request Header:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "username": "string (bắt buộc, tối thiểu 3 ký tự, unique)",
  "password": "string (bắt buộc, tối thiểu 6 ký tự)",
  "fullName": "string (bắt buộc)",
  "email": "string (bắt buộc, unique, đúng định dạng email)",
  "roleId": "string (ObjectId, bắt buộc)",
  "storeId": "string (ObjectId, BẮT BUỘC nếu role là 'StoreStaff', null nếu role khác)"
}
```

**Response thành công (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "store1",
    "fullName": "Kendo Central Store Staff",
    "email": "store1@kendomooncake.com",
    "role": "StoreStaff",
    "storeId": "507f1f77bcf86cd799439022",
    "storeName": "Kendo Central Store",
    "isActive": true
  }
}
```

**Response lỗi (400):**
```json
{
  "success": false,
  "message": "Username already exists" // hoặc "Email already exists", "Invalid role", "StoreStaff must be assigned to a store", "Invalid store"
}
```

---

### 3. **GET /api/auth/me** - Lấy thông tin user hiện tại

**Request Header:**
```
Authorization: Bearer <token>
```

**Response thành công (200):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "fullName": "System Administrator",
    "email": "admin@kendomooncake.com",
    "role": "Admin",
    "storeId": null,
    "storeName": null,
    "isActive": true,
    "createdAt": "2026-01-10T08:00:00.000Z"
  }
}
```

**Response lỗi (401):**
```json
{
  "success": false,
  "message": "Not authorized, no token" // hoặc "Not authorized, token failed", "Account is deactivated"
}
```

---

## 👥 USER ROLES (5 VAI TRÒ)

### **Danh sách roles và quyền hạn:**

| Role | Mô tả | Cần Store | Trang dashboard |
|------|-------|-----------|-----------------|
| **Admin** | Quản trị hệ thống | ❌ | `/admin/dashboard` |
| **Manager** | Quản lý trung tâm | ❌ | `/manager/dashboard` |
| **KitchenStaff** | Nhân viên bếp | ❌ | `/kitchen/dashboard` |
| **StoreStaff** | Nhân viên cửa hàng | ✅ | `/store/dashboard` |
| **Coordinator** | Điều phối viên | ❌ | `/coordinator/dashboard` |

---

## 🗂️ DATABASE SCHEMAS

### **User Schema:**
```javascript
{
  _id: ObjectId,
  username: String (unique, required, min 3 chars),
  passwordHash: String (required, min 6 chars, select: false),
  fullName: String (required),
  email: String (unique, required, validate email format),
  roleId: ObjectId (ref: Role, required),
  storeId: ObjectId (ref: Store, default: null),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### **Role Schema:**
```javascript
{
  _id: ObjectId,
  roleName: String (enum: ['Admin', 'Manager', 'StoreStaff', 'KitchenStaff', 'Coordinator'], unique)
}
```

### **Store Schema:**
```javascript
{
  _id: ObjectId,
  storeName: String (required),
  address: String (required),
  phone: String,
  status: Boolean (default: true)
}
```

---

## 🔄 AUTH FLOW CHO FRONTEND

```
1. User nhập username/password → Gọi POST /api/auth/login
2. Backend trả về { token, user }
3. Frontend lưu token vào localStorage/cookie
4. Frontend đọc user.role → Chuyển đến trang tương ứng

Lưu ý: 
- Luôn gửi Authorization header: "Bearer " + token
- Token hết hạn sau 30 ngày hoặc khi backend trả về 401
- Khi token hết hạng → clear localStorage → chuyển về /login
```

---

## 📍 ROLE-BASED REDIRECTION MAP

```javascript
const roleRoutes = {
  'Admin': '/admin/dashboard',
  'Manager': '/manager/dashboard', 
  'KitchenStaff': '/kitchen/dashboard',
  'StoreStaff': '/store/dashboard',
  'Coordinator': '/coordinator/dashboard'
};

// Logic redirect sau login:
const redirectAfterLogin = (userRole) => {
  return roleRoutes[userRole] || '/login';
};
```

---

## 🧪 TEST ACCOUNTS (Sau khi chạy `npm run seed`)

| Role | Username | Password | Store |
|------|----------|----------|-------|
| Admin | `admin` | `admin123` | - |
| Manager | `manager` | `manager123` | - |
| KitchenStaff | `kitchen` | `kitchen123` | - |
| StoreStaff | `store1` | `store1123` | Kendo Central Store |
| StoreStaff | `store2` | `store2123` | Kendo North Branch |
| StoreStaff | `store3` | `store3123` | Kendo West Branch |

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Register chỉ dành cho Admin** - Frontend nên ẩn chức năng register với user thường

2. **StoreId bắt buộc cho StoreStaff** - Khi tạo user mới với role StoreStaff, phải chọn store từ dropdown

3. **Token management** - Xử lý token hết hạng và refresh token (nếu có)

4. **403 Forbidden** - User không có quyền truy cập route → hiển thị thông báo "Bạn không có quyền truy cập trang này"

5. **Auth Middleware** - Backend có `protect` middleware check token, `authorize(...roles)` middleware check quyền

---

## 📁 FILE CẤU TRÚC ĐỀ XUẤT CHO FRONTEND

```
client/
├── features/
│   ├── auth/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx    # Chỉ Admin mới thấy
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   └── hooks/
│   │       └── useAuth.ts          # Hook cho auth operations
│   │
│   ├── admin/
│   │   └── pages/
│   │       └── AdminDashboard.tsx
│   │
│   ├── manager/
│   │   └── pages/
│   │       └── ManagerDashboard.tsx
│   │
│   ├── kitchen/
│   │   └── pages/
│   │       └── KitchenDashboard.tsx
│   │
│   ├── store/
│   │   └── pages/
│   │       └── StoreDashboard.tsx
│   │
│   └── coordinator/
│       └── pages/
│           └── CoordinatorDashboard.tsx
│
├── shared/
│   ├── store/
│   │   └── authStore.ts           # Lưu token, user, role
│   ├── components/
│   │   └── ui/
│   │       ├── ProtectedRoute.tsx # Component bảo vệ route theo role
│   │       └── RoleGuard.tsx      # Component check quyền
│   ├── lib/
│   │   └── axios.ts               # Axios instance với interceptor
│   └── types/
│       └── auth.ts                # User type, role types
│
└── App.tsx                        # React Router với role-based routes
```

