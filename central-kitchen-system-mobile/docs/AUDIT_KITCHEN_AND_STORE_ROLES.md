# Audit 2 role: KITCHEN_STAFF & STORE_STAFF

**Nguồn:** Swagger (OpenAPI JSON) – Kendo Mooncake Central Kitchen System API v2.0.0  
**Phạm vi:** Chỉ đánh giá 2 role **KITCHEN_STAFF** và **STORE_STAFF**.

**Context:** Mô hình Central Kitchen – Franchise Store  
Flow: Store (nhu cầu/bán) → Supply (Production Order) → **Kitchen** (sản xuất) → Logistics (giao) → **Store** (nhận & bán).

---

# 1. Danh sách API theo role (từ Swagger)

## 1.1 KITCHEN_STAFF

Trong Swagger **chỉ có 2 API ghi rõ** "Kitchen Staff" (cùng Admin, Manager):

| Method | Path | Ghi chú Swagger |
|--------|------|------------------|
| PUT | /api/production-plans/{id} | "Admin, Manager, **Kitchen Staff only**" |
| PATCH | /api/production-plans/{id} | "Admin, Manager, **Kitchen Staff only**" |

Các API **chỉ có BearerAuth, không ghi role** (backend có thể cho Kitchen gọi – cần kiểm tra thực tế):

| Method | Path | Dùng cho nghiệp vụ |
|--------|------|---------------------|
| GET | /api/auth/me | Đăng nhập / profile |
| GET | /api/production-plans | Xem danh sách đơn sản xuất |
| GET | /api/production-plans/{id} | Xem chi tiết đơn |
| POST | /api/production-plans/{planId}/complete-item | Hoàn thành mẻ (tạo finished batch) |
| GET | /api/ingredients | Xem tồn kho nguyên liệu |
| GET | /api/ingredients/{id} | Xem chi tiết nguyên liệu |
| GET | /api/categories | (nếu cần cho dropdown/ filter) |

**API Kitchen không được gọi (đã ghi rõ trong Swagger):**

| Method | Path | Lý do |
|--------|------|--------|
| POST | /api/production-plans | Không ghi Kitchen Staff; "tạo plan" = điều phối |
| DELETE | /api/production-plans/{id} | "**Admin, Manager only**" → Kitchen không được xóa |
| POST/PUT/DELETE | /api/categories | "Admin, Kitchen_Manager only" |
| POST/PUT/DELETE | /api/ingredients | "Admin, Kitchen_Manager only" |
| POST | /api/ingredients/{id}/batches | Import batch = quản lý nguồn, không phải Kitchen thực thi |

---

## 1.2 STORE_STAFF

Trong Swagger **không có API nào** ghi rõ "StoreStaff" hay "Store". Chỉ có BearerAuth cho hầu hết endpoint.

Nghiệp vụ Store cần dùng (suy từ flow Central Kitchen):

| Method | Path | Nghiệp vụ | Ghi role trong Swagger? |
|--------|------|-----------|--------------------------|
| GET | /api/auth/me | Profile, storeId | Không |
| GET | /api/products | Danh sách sản phẩm bán | Không |
| GET | /api/products/{id} | Chi tiết sản phẩm | Không |
| POST | /api/logistics/orders | Tạo đơn (POS / đặt hàng từ store) | Không |
| GET | /api/logistics/orders | Xem đơn (filter storeId) | Không |
| GET | /api/logistics/orders/{id} | Chi tiết đơn | Không |
| GET | /api/inventory/store/{storeId} | Tồn kho cửa hàng | Không |
| POST | /api/logistics/orders/{id}/receive | Xác nhận nhận hàng | Không |
| GET | /api/categories | (filter sản phẩm theo danh mục) | Không |

**API Store không được gọi (theo mô hình):**

| Method | Path | Lý do |
|--------|------|--------|
| POST/PUT/DELETE | /api/production-plans | Điều phối sản xuất, không thuộc Store |
| POST/PUT/DELETE | /api/categories | Quản lý danh mục toàn hệ thống |
| POST/PUT/DELETE | /api/ingredients | Quản lý nguyên liệu bếp trung tâm |
| POST | /api/logistics/orders/{id}/approve-and-ship | Duyệt & giao hàng = Logistics/Kitchen Manager |
| POST | /api/logistics/delivery-trips | Tạo chuyến giao = điều phối logistics |
| POST/PUT/DELETE | /api/products | Quản lý sản phẩm toàn hệ thống |
| POST/PUT/DELETE | /api/stores | Quản lý cửa hàng (Admin) |
| GET | /api/users | Admin only (đã ghi trong Swagger) |

---

# 2. Đánh giá từng role

## 2.1 KITCHEN_STAFF

### Nghiệp vụ kỳ vọng (đối chiếu)

| Nghiệp vụ | API cần | Trạng thái | Ghi chú |
|------------|---------|------------|--------|
| Xem Production Orders được giao | GET /api/production-plans | ✅ Đủ (BearerAuth, không cấm Kitchen) | Swagger không ghi role; backend nên cho Kitchen gọi |
| Xem chi tiết Production Order | GET /api/production-plans/{id} | ✅ Đủ | Như trên |
| Cập nhật trạng thái (In_Progress, Completed) | PATCH /api/production-plans/{id} | ✅ Đúng quyền | Swagger ghi rõ "Kitchen Staff only" |
| Hoàn thành mẻ (tạo finished batch) | POST .../complete-item | ✅ Đủ | Swagger không ghi role; nghiệp vụ thuộc Kitchen |
| Xem tồn kho nguyên liệu | GET /api/ingredients, GET /api/ingredients/{id} | ✅ Đủ | Chỉ đọc; Swagger không cấm |
| Xem lịch sử sản xuất | GET /api/production-plans?status=Completed | ✅ Đủ | Cùng API danh sách + filter |

### Kitchen không được (kiểm tra Swagger)

| Hành vi | API | Trạng thái | Ghi chú |
|---------|-----|------------|--------|
| Tạo Production Order | POST /api/production-plans | ✅ Không ghi Kitchen | Nên giới hạn backend: chỉ Admin/Manager |
| Xóa Production Order | DELETE /api/production-plans/{id} | ✅ Đúng | Swagger: "Admin, Manager only" |
| Quản lý sản phẩm | POST/PUT/DELETE /api/products | ⚠️ Chưa rõ | Swagger không ghi role → backend nên **cấm** Kitchen |
| Điều phối logistics | Delivery trips, approve-and-ship | ⚠️ Chưa rõ | Swagger không ghi role → backend nên **cấm** Kitchen |

### Kết luận Kitchen

| Tiêu chí | Kết quả |
|----------|--------|
| **Đủ nghiệp vụ?** | **Đủ** – Nếu backend cho Kitchen gọi: GET production-plans, GET production-plans/{id}, PATCH, POST complete-item, GET ingredients, GET ingredients/{id}, GET auth/me. |
| **Thiếu API?** | **Không thiếu** – Đủ để: xem đơn, xem chi tiết, đổi trạng thái, hoàn thành mẻ, xem kho nguyên liệu, xem lịch sử. |
| **Quyền sai/dư?** | **Có rủi ro:** Products (POST/PUT/DELETE), Stores, Logistics (approve-and-ship, delivery-trips) **không** ghi role trong Swagger. Nếu backend cho mọi BearerAuth gọi → Kitchen sẽ **dư quyền**. Nên **giới hạn backend**: Kitchen chỉ được nhóm Production Plans (GET/PUT/PATCH + complete-item) + Ingredients (GET) + auth/me. |

---

## 2.2 STORE_STAFF

### Nghiệp vụ kỳ vọng (đối chiếu)

| Nghiệp vụ | API cần | Trạng thái | Ghi chú |
|------------|---------|------------|--------|
| Xem danh sách sản phẩm | GET /api/products | ✅ Đủ | BearerAuth; backend nên filter theo catalog (store có thể bán) |
| Tạo đơn bán hàng (POS / đặt hàng) | POST /api/logistics/orders | ✅ Đủ | Swagger: storeId trong body; backend lấy user storeId |
| Xem đơn trong ngày / theo store | GET /api/logistics/orders?storeId= | ✅ Đủ | Backend **bắt buộc** filter theo storeId của user (chỉ đơn cửa hàng mình) |
| Xem tồn kho cửa hàng | GET /api/inventory/store/{storeId} | ✅ Đủ | Backend **bắt buộc** chỉ cho storeId = store của user |
| Xác nhận nhận hàng | POST /api/logistics/orders/{id}/receive | ✅ Đủ | Nghiệp vụ Store; backend nên kiểm tra order thuộc store của user |

### Store không được (kiểm tra Swagger)

| Hành vi | API | Trạng thái | Ghi chú |
|---------|-----|------------|--------|
| Tạo Production Order | POST /api/production-plans | ⚠️ Chưa rõ | Swagger không ghi role → backend nên **cấm** Store |
| Điều phối sản xuất | PATCH/PUT production-plans, complete-item | ⚠️ Chưa rõ | Nên cấm Store |
| Quản lý sản phẩm toàn hệ thống | POST/PUT/DELETE /api/products | ⚠️ Chưa rõ | Nên cấm Store |
| Chỉnh tồn kho hệ thống | POST batches, PUT ingredient-batches | ⚠️ Chưa rõ | Nên cấm Store |

### Kết luận Store

| Tiêu chí | Kết quả |
|----------|--------|
| **Đủ nghiệp vụ?** | **Đủ** – Nếu backend cho Store gọi: GET products, GET products/{id}, POST logistics/orders, GET logistics/orders (theo storeId), GET logistics/orders/{id}, GET inventory/store/{storeId}, POST receive, GET auth/me (và có thể GET categories). |
| **Thiếu API?** | **Không thiếu** – Đủ để: bán hàng (xem SP, tạo đơn), xem đơn, xem tồn store, nhận hàng. |
| **Quyền sai/dư?** | **Có rủi ro:** Mọi API chỉ BearerAuth, không ghi "Store only" hay "chỉ store của mình". Backend **bắt buộc**: (1) Chỉ cho Store gọi đúng nhóm API (products read, logistics orders create/read/receive, inventory store read); (2) Luôn filter theo `user.storeId` (đơn, tồn kho, receive). Nếu không → Store có thể thấy đơn/tồn cửa hàng khác hoặc gọi API sản xuất → **sai mô hình**. |

---

# 3. Kết luận cuối cùng

## 3.1 Hai role đã đủ để triển khai frontend chưa?

| Role | Đủ cho frontend? | Ghi chú |
|------|------------------|--------|
| **KITCHEN_STAFF** | **Có** | Đủ API: production-plans (GET/PUT/PATCH + complete-item), ingredients (GET), auth/me. Frontend hiện tại đã dùng đúng nhóm này. |
| **STORE_STAFF** | **Có** | Đủ API: products (GET), logistics/orders (POST/GET + receive), inventory/store/{storeId}, auth/me. Frontend đã dùng đúng. |

**Điều kiện:** Backend thực tế **đã** (hoặc sẽ) giới hạn đúng theo role và theo storeId cho Store. Swagger không phản ánh đủ chi tiết đó.

---

## 3.2 Backend cần bổ sung / điều chỉnh gì?

| Hạng mục | Khuyến nghị |
|----------|-------------|
| **Bổ sung API mới** | **Không bắt buộc** – Đủ API cho 2 role. Có thể bổ sung API tiện ích (ví dụ: GET orders hôm nay, GET products có tồn) nếu cần tối ưu, không thiếu nghiệp vụ cơ bản. |
| **Phân quyền backend** | **Bắt buộc kiểm tra:** (1) **Kitchen:** Chỉ được gọi: GET/PUT/PATCH production-plans, POST complete-item, GET ingredients, GET ingredients/{id}, GET categories (nếu dùng), GET auth/me. Cấm: POST/DELETE production-plans, Products CRUD, Stores, Suppliers, Users, Logistics (approve-and-ship, delivery-trips, invoices). (2) **Store:** Chỉ được gọi: GET products, GET products/{id}, POST/GET logistics/orders, GET logistics/orders/{id}, POST receive, GET inventory/store/{storeId}, GET auth/me (và GET categories nếu cần). Đồng thời **ràng buộc storeId**: mọi dữ liệu đơn/tồn/receive chỉ của `user.storeId`. |
| **Swagger** | Nên bổ sung mô tả dạng: "Allowed: Kitchen Staff" / "Allowed: Store Staff (scope: own store)" cho từng endpoint để tài liệu khớp backend. |

---

## 3.3 API nên giới hạn quyền (backend)

| API | Giới hạn đề xuất |
|-----|-------------------|
| POST /api/production-plans | Chỉ **Admin, Manager** (hoặc Kitchen_Manager). **Cấm** Kitchen Staff, Store Staff. |
| DELETE /api/production-plans/{id} | Đã ghi "Admin, Manager only" – giữ nguyên. |
| POST /api/production-plans/{planId}/complete-item | Chỉ **Kitchen Staff** (và có thể Manager). Cấm Store Staff. |
| GET /api/production-plans, GET /api/production-plans/{id} | Cho **Kitchen Staff, Manager, Admin**. Cấm Store Staff (trừ khi có nhu cầu “store xem plan” – hiện không trong nghiệp vụ). |
| PUT/PATCH /api/production-plans/{id} | Đã ghi "Kitchen Staff" – giữ nguyên; cấm Store Staff. |
| POST/PUT/DELETE /api/products | Chỉ **Admin, Kitchen_Manager**. Cấm Kitchen Staff, Store Staff. |
| GET /api/products | Cho **Store Staff** (bán hàng), **Kitchen** (nếu cần đọc), Admin/Manager. |
| POST /api/logistics/orders | Chỉ **Store Staff** (và có thể Admin/Manager). Cấm Kitchen Staff. |
| GET /api/logistics/orders | **Store Staff:** chỉ trả về đơn có storeId = user.storeId. **Kitchen/Admin/Manager:** có thể xem rộng hơn (tùy nghiệp vụ). |
| POST /api/logistics/orders/{id}/receive | Chỉ **Store Staff** (store của đơn đó). Cấm Kitchen. |
| GET /api/inventory/store/{storeId} | **Store Staff:** chỉ cho storeId = user.storeId. Admin/Manager có thể xem mọi store. |
| POST /api/logistics/orders/{id}/approve-and-ship | Không cho Kitchen Staff, không cho Store Staff. Chỉ Logistics/Manager/Admin. |

---

*Tài liệu chỉ dựa trên Swagger và nghiệp vụ Central Kitchen – Store đã mô tả; phân quyền thực tế do backend quyết định.*
