# Báo cáo kiểm tra phân quyền theo Swagger (OpenAPI)

**Nguồn:** `swagger (5).json` – Kendo Mooncake Central Kitchen System API v2.0.0  
**Phương pháp:** Rà soát toàn bộ `paths` và `description` để suy ra role được phép gọi API.

---

## 1. Các role xuất hiện trong Swagger

| Role | Xuất hiện tại | Ghi chú |
|------|----------------|--------|
| **Admin** | Categories, Suppliers, Ingredients, Production Plans, Users | Toàn quyền hệ thống, quản lý user, xóa supplier/plan |
| **Manager** | Suppliers, Production Plans | Tạo/sửa supplier; cập nhật/xóa production plan (cùng Admin) |
| **Kitchen_Manager** | Categories, Ingredients; mô tả Delivery Trip | Quản lý danh mục, nguyên liệu; “Kitchen Manager” gán batch FEFO |
| **Kitchen Staff** | Production Plans (PUT, PATCH) | Cập nhật đơn sản xuất, đổi trạng thái, không được xóa plan |
| **StoreStaff** | Users PUT (validation) | Chỉ xuất hiện trong logic: đổi role sang StoreStaff thì bắt buộc `storeId` |

**Lưu ý:** Swagger **không** định nghĩa danh sách role (enum) hay security per-role; chỉ ghi trong phần mô tả text của từng API.

---

## 2. Ánh xạ API → Role (theo mô tả trong Swagger)

### 2.1 Health & Authentication

| Method | Path | Role ghi trong Swagger | Security |
|--------|------|-------------------------|----------|
| GET | /health | — | Không |
| POST | /api/auth/register | — | Không |
| POST | /api/auth/login | — | Không |
| GET | /api/auth/me | — | BearerAuth |

**Đánh giá:** Hợp lý. Không ghi role = có thể cho mọi client (login/register) hoặc mọi user đã đăng nhập (me).

---

### 2.2 Categories

| Method | Path | Role ghi trong Swagger | Security |
|--------|------|-------------------------|----------|
| GET | /api/categories | — | BearerAuth |
| POST | /api/categories | **Admin, Kitchen_Manager only** | BearerAuth |
| GET | /api/categories/{id} | — | BearerAuth |
| PUT | /api/categories/{id} | **Admin, Kitchen_Manager only** | BearerAuth |
| DELETE | /api/categories/{id} | **Admin, Kitchen_Manager only** | BearerAuth |

**Đánh giá:** Rõ ràng. Chỉ Admin/Kitchen_Manager tạo/sửa/xóa; GET có thể cho nhiều role (đọc danh mục).

---

### 2.3 Suppliers

| Method | Path | Role ghi trong Swagger | Security |
|--------|------|-------------------------|----------|
| GET | /api/suppliers | — | BearerAuth |
| POST | /api/suppliers | **Admin, Manager only** | BearerAuth |
| GET | /api/suppliers/{id} | — | BearerAuth |
| PUT | /api/suppliers/{id} | **Admin, Manager only** | BearerAuth |
| DELETE | /api/suppliers/{id} | **Admin only** | BearerAuth |

**Đánh giá:** Xóa nhà cung cấp thu hẹp hơn (chỉ Admin); tạo/sửa là Admin + Manager. Hợp lý nếu “Manager” là quản lý vận hành/nguồn hàng.

---

### 2.4 Ingredients & Ingredient Batches

| Method | Path | Role ghi trong Swagger | Security |
|--------|------|-------------------------|----------|
| GET | /api/ingredients | — | BearerAuth |
| POST | /api/ingredients | **Admin, Kitchen_Manager only** | BearerAuth |
| GET | /api/ingredients/{id} | — | BearerAuth |
| PUT | /api/ingredients/{id} | **Admin, Kitchen_Manager only** | BearerAuth |
| DELETE | /api/ingredients/{id} | **Admin, Kitchen_Manager only** | BearerAuth |
| POST | /api/ingredients/{id}/batches | — | BearerAuth |
| GET | /api/ingredients/{id}/batches | — | BearerAuth |
| GET | /api/ingredient-batches | — | BearerAuth |
| GET | /api/ingredient-batches/{id} | — | BearerAuth |
| PUT | /api/ingredient-batches/{id} | — | BearerAuth |

**Đánh giá:**  
- Nguyên liệu (CRUD): rõ (Admin, Kitchen_Manager).  
- **Thiếu:** Import batch (POST batches) và sửa batch (PUT ingredient-batches/{id}) **không** ghi role. Nếu chỉ Kitchen_Manager/Admin được nhập batch và sửa batch thì nên bổ sung mô tả role trong Swagger.

---

### 2.5 Products

| Method | Path | Role ghi trong Swagger | Security |
|--------|------|-------------------------|----------|
| GET | /api/products | — | BearerAuth |
| POST | /api/products | — | BearerAuth |
| GET | /api/products/{id} | — | BearerAuth |
| PUT | /api/products/{id} | — | BearerAuth |
| DELETE | /api/products/{id} | — | BearerAuth |

**Đánh giá:** Toàn bộ Products **không** ghi role. Thường sẽ là Admin/Kitchen_Manager (tạo/sửa/xóa sản phẩm). **Thiếu mô tả phân quyền** trong Swagger.

---

### 2.6 Production Plans & Production (complete-item)

| Method | Path | Role ghi trong Swagger | Security |
|--------|------|-------------------------|----------|
| GET | /api/production-plans | — | BearerAuth |
| POST | /api/production-plans | — | BearerAuth |
| GET | /api/production-plans/{id} | — | BearerAuth |
| PUT | /api/production-plans/{id} | **Admin, Manager, Kitchen Staff only** | BearerAuth |
| DELETE | /api/production-plans/{id} | **Admin, Manager only** | BearerAuth |
| PATCH | /api/production-plans/{id} | **Admin, Manager, Kitchen Staff only** | BearerAuth |
| POST | /api/production-plans/{planId}/complete-item | — | BearerAuth |

**Đánh giá:**  
- PUT/PATCH: Kitchen Staff được cập nhật/đổi trạng thái; không được xóa (chỉ Admin, Manager) → hợp lý.  
- **Thiếu:** POST production-plans (tạo kế hoạch) và POST complete-item **không** ghi role. Nên quy định rõ: tạo plan thường là Manager/Kitchen_Manager; complete-item là Kitchen Staff (và có thể Manager).

---

### 2.7 Finished Batches

| Method | Path | Role ghi trong Swagger | Security |
|--------|------|-------------------------|----------|
| GET | /api/batches | — | BearerAuth |
| POST | /api/batches | — | BearerAuth |
| GET | /api/batches/{id} | — | BearerAuth |
| PUT | /api/batches/{id} | — | BearerAuth |

**Đánh giá:** Swagger nói batch thường được tạo tự động từ complete-item. POST/PUT batches **không** ghi role. Nếu có chỗ cho tạo/sửa batch thủ công thì nên ghi rõ role (ví dụ Kitchen_Manager/Admin).

---

### 2.8 Logistics (Orders, Delivery Trips, Invoices)

| Method | Path | Role ghi trong Swagger | Security |
|--------|------|-------------------------|----------|
| GET | /api/logistics/orders | — | BearerAuth |
| POST | /api/logistics/orders | — | BearerAuth |
| GET | /api/logistics/orders/{id} | — | BearerAuth |
| PUT | /api/logistics/orders/{id} | — | BearerAuth |
| POST | /api/logistics/orders/{id}/cancel | — | BearerAuth |
| POST | /api/logistics/orders/{id}/approve-and-ship | — | BearerAuth |
| POST | /api/logistics/orders/{id}/receive | — | BearerAuth |
| GET/POST | /api/logistics/delivery-trips, /{id}, /{id}/depart | — | BearerAuth |
| GET | /api/logistics/invoices | — | BearerAuth |
| GET | /api/logistics/invoices/{id} | — | BearerAuth |
| POST | /api/logistics/invoices/{id}/payment | — | BearerAuth |

**Mô tả trong Swagger:**  
- Create delivery trip: “Kitchen Manager reviews the approved order”, “Kitchen Manager assigns … FEFO”.  
- Không có field “role” chính thức cho từng endpoint.

**Đánh giá:**  
- **Thiếu rõ ràng:** Toàn bộ Logistics chỉ BearerAuth, không ghi role. Theo nghiệp vụ thường:  
  - Tạo đơn: Store (StoreStaff).  
  - Duyệt/giao (approve-and-ship), tạo delivery trip, assign batch: Kitchen_Manager (hoặc Logistics role nếu có).  
  - Nhận hàng (receive): StoreStaff.  
  - Invoice/payment: thường Admin/Finance.  
- Nên bổ sung mô tả (hoặc security scheme) per-role cho từng nhóm API logistics.

---

### 2.9 Inventory

| Method | Path | Role ghi trong Swagger | Security |
|--------|------|-------------------------|----------|
| GET | /api/inventory/store/{storeId} | — | BearerAuth |
| GET | /api/inventory/expiring | — | BearerAuth |

**Đánh giá:** Chỉ đọc; không ghi role. Hợp lý nếu Store xem tồn store của mình, Kitchen/Admin xem tồn/expiring. Có thể ghi rõ “Store: store của mình; Admin/Manager: mọi store” để đồng bộ với phần còn lại.

---

### 2.10 Stores

| Method | Path | Role ghi trong Swagger | Security |
|--------|------|-------------------------|----------|
| GET | /api/stores | — | BearerAuth |
| POST | /api/stores | — | BearerAuth |
| GET | /api/stores/{id} | — | BearerAuth |
| PUT | /api/stores/{id} | — | BearerAuth |
| DELETE | /api/stores/{id} | — | BearerAuth |

**Đánh giá:** Không ghi role. Thường tạo/sửa/xóa store là **Admin** (hoặc Admin + Manager). **Thiếu mô tả phân quyền.**

---

### 2.11 Users

| Method | Path | Role ghi trong Swagger | Security |
|--------|------|-------------------------|----------|
| GET | /api/users | **Admin only** (403 Forbidden - Admin access required) | BearerAuth |
| GET | /api/users/{id} | — | BearerAuth |
| PUT | /api/users/{id} | “Handles logic for StoreStaff validation” | BearerAuth |
| DELETE | /api/users/{id} | — | BearerAuth |

**Đánh giá:**  
- GET /api/users: rõ (Admin only).  
- PUT/DELETE user: không ghi rõ role. Thường chỉ Admin (hoặc Admin + tự sửa profile cho chính user đó). Nên ghi rõ “Admin only” hoặc “Admin, or self for profile fields”.

---

## 3. Tóm tắt: Role vs trách nhiệm nghiệp vụ

| Role | Nghiệp vụ mong đợi | API có ghi rõ role | Ghi chú |
|------|--------------------|---------------------|--------|
| **Admin** | Hệ thống, user, danh mục, nguồn hàng, xóa dữ liệu nhạy cảm | Categories, Suppliers, Ingredients, Production Plans (delete), Users (GET) | Khớp với mô tả; Products/Stores/Users PUT-DELETE chưa ghi |
| **Manager** | Vận hành: supplier, kế hoạch sản xuất | Suppliers (CRUD trừ delete), Production Plans (update, delete, patch) | Không rõ “Manager” có phải Kitchen_Manager hay role riêng |
| **Kitchen_Manager** | Bếp trung tâm: danh mục, nguyên liệu, gán batch giao hàng | Categories, Ingredients; mô tả Delivery Trip | Hợp lý; thiếu role cho Products, Batches, Logistics (approve-and-ship, create trip) |
| **Kitchen Staff** | Thực thi sản xuất: xem/ cập nhật trạng thái đơn, hoàn thành mẻ | Production Plans (PUT, PATCH) | Hợp lý; complete-item chưa ghi role |
| **StoreStaff** | Cửa hàng: đặt hàng, xem đơn, nhận hàng, tồn store | Chỉ xuất hiện trong validation StoreStaff (storeId) | Thiếu mô tả rõ: POST orders, GET orders (store mình), receive, GET inventory/store |

---

## 4. Vấn đề phát hiện

### 4.1 Role có thể thiếu quyền (thiếu nghiệp vụ)

- **StoreStaff:** Swagger không ghi role cho: POST/GET logistics orders, POST receive, GET inventory/store. Nếu backend đã giới hạn theo storeId/role thì nên **bổ sung mô tả** (ví dụ: “StoreStaff: chỉ store của mình”) để tài liệu đầy đủ.
- **Kitchen Staff:** POST complete-item không ghi role; nên ghi “Kitchen Staff (or Kitchen_Manager)” nếu đúng nghiệp vụ.

### 4.2 Role có thể dư quyền

- **Không thể kết luận từ Swagger:** Phân quyền thực tế nằm ở backend. Swagger chỉ có BearerAuth, nhiều API không ghi “X only”. Cần kiểm tra mã backend (middleware/guard) để xem có role nào được gọi API ngoài nghiệp vụ hay không.

### 4.3 API không ghi role (trách nhiệm chưa rõ)

Các nhóm sau **chỉ** có BearerAuth, không nêu role trong description:

- **Products:** GET/POST/PUT/DELETE  
- **Stores:** GET/POST/PUT/DELETE  
- **Users:** GET by id, PUT, DELETE  
- **Logistics:** toàn bộ (orders, delivery-trips, invoices)  
- **Finished Batches:** GET/POST/PUT  
- **Ingredient Batches:** POST import batch, PUT batch  
- **Production Plans:** GET, POST (tạo plan); POST complete-item  

Khuyến nghị: bổ sung vào từng endpoint (hoặc nhóm tag) câu dạng “Allowed roles: Admin” hoặc “Admin, Kitchen_Manager” để tài liệu phản ánh đúng trách nhiệm từng role.

### 4.4 API có thể gán sai trách nhiệm (cần xác nhận backend)

- **PUT /api/users/{id}:** Mô tả chỉ nói StoreStaff validation. Cần rõ: chỉ Admin sửa user khác, hay StoreStaff cũng có thể tự sửa profile (fullName, email) qua API này. Nếu StoreStaff chỉ sửa bản thân thì nên tách “update profile” (role = self) và “update user (role, store)” (Admin only).
- **POST /api/logistics/orders:** Nghiệp vụ là Store đặt hàng → nên ghi “StoreStaff (or store-scoped)” để tránh hiểu nhầm Kitchen/Admin cũng tạo đơn thay store.
- **POST /api/logistics/orders/{id}/receive:** Nghiệp vụ là cửa hàng nhận hàng → nên ghi “StoreStaff” (hoặc store có liên quan đơn).

---

## 5. Khuyến nghị

1. **Bổ sung mô tả role** cho mọi endpoint có phân quyền (Products, Stores, Users, Logistics, Batches, Ingredient Batches, Production POST/complete-item), dạng: “Allowed: Admin” hoặc “Admin, Kitchen_Manager”.
2. **Chuẩn hóa tên role:** Thống nhất “Manager” vs “Kitchen_Manager” (một role hay hai) và liệt kê rõ trong phần mô tả chung của API (info hoặc tag).
3. **StoreStaff:** Thêm mô tả rõ cho: tạo đơn, xem đơn (theo store), nhận đơn, xem tồn store.
4. **Backend:** Rà soát middleware/guard theo từng role và so với bảng trên; đảm bảo từ chối đúng request không đúng role (403) và trả về message rõ ràng.
5. **OpenAPI 3:** Cân nhắc dùng `security` với role (ví dụ extension `x-roles: ["Admin"]`) hoặc mô tả trong `description` để tool và con người đều dễ đọc.

---

*Báo cáo được tạo từ file Swagger (5).json; phân quyền thực tế do backend quyết định.*
