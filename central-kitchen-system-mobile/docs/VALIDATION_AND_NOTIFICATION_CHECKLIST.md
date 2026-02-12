# Checklist: Validation + Notification System (FE)

**Áp dụng cho:** Kitchen_Staff & Store_Staff – Central Kitchen mobile.

---

## I. STORE_STAFF

### 1. Tạo Order (POST /api/logistics/orders) – Cart

| Yêu cầu | Trạng thái |
|--------|------------|
| items không rỗng (sau merge) | ✅ Merge theo productId, filter quantity > 0; nếu rỗng không gọi API |
| Mỗi item có productId, quantity > 0 | ✅ `buildOrderItems()` lọc bỏ quantity <= 0 |
| Không submit nếu thiếu storeId / chưa đăng nhập | ✅ Disable nút khi `!token \|\| !user?.storeId` hoặc orderItems.length === 0 |
| Merge item trùng productId | ✅ `buildOrderItems()` gộp theo productId |
| Highlight input sai (border đỏ) | ✅ Inline message dưới nút (submitError) |
| Message dưới field / toast tổng hợp lỗi | ✅ Toast + `fieldError` text |
| Disable nút Submit khi invalid | ✅ `canSubmit = isValid && !submitting` |
| Thông báo: "Bạn chưa chọn sản phẩm.", "Số lượng phải lớn hơn 0.", "Giỏ hàng đang trống." | ✅ Toast tương ứng |
| Thành công: toast "Tạo đơn thành công.", reset form, refetch/redirect | ✅ clearCart, showToast, router.push orders/[id] |
| Lỗi API: không reset form, giữ dữ liệu | ✅ Chỉ clearCart khi success |
| Loading: disable nút, spinner | ✅ submitting + ActivityIndicator |

### 2. Receive Order (POST /api/logistics/orders/{id}/receive)

| Yêu cầu | Trạng thái |
|--------|------------|
| Chỉ gọi khi status = "Shipped" | ✅ Nút "Xác nhận nhận hàng" chỉ hiện khi order.status === "Shipped" |
| Confirm modal: "Xác nhận đã nhận đủ hàng?" | ✅ Alert.alert với 2 nút |
| 403 → toast "Bạn không có quyền nhận đơn này." | ✅ Catch và showToast |
| 400 → toast "Đơn không hợp lệ hoặc đã được nhận." | ✅ Catch và showToast |
| Loading: disable nút, spinner | ✅ receiving + ActivityIndicator |

### 3. Xem tồn kho

| Yêu cầu | Trạng thái |
|--------|------------|
| API trả về rỗng → Empty State (icon + "Cửa hàng chưa có tồn kho.") | ✅ Không hiển thị table trống |

---

## II. KITCHEN_STAFF

### 1. Update Production Plan (PATCH / PUT)

| Yêu cầu | Trạng thái |
|--------|------------|
| Không chuyển Pending → Completed trực tiếp (phải qua In_Progress) | ✅ Chỉ cho "Đóng đơn hoàn thành" khi allDetailsCompleted (đã qua In_Progress) |
| Không update nếu plan đã Completed | ✅ Nút chỉ hiện khi isPlanned hoặc isInProgress |
| Confirm: "Xác nhận bắt đầu sản xuất?" | ✅ Alert.alert trước khi updateStatus("In_Progress") |
| Confirm: "Xác nhận hoàn thành kế hoạch?" | ✅ Alert.alert trước khi updateStatus("Completed") |
| Toast thành công / lỗi | ✅ showToast thay Alert |
| Loading: disable nút | ✅ busy |

### 2. Complete Item (POST complete-item)

| Yêu cầu | Trạng thái |
|--------|------------|
| quantity hoàn thành > 0 | ✅ Validate planned > 0; disable nút khi planned <= 0 |
| Không vượt quá quantity yêu cầu | ✅ Gửi plannedQuantity; backend có thể validate thêm |
| Confirm modal trước khi hoàn thành mẻ | ✅ Alert.alert "Xác nhận đã hoàn thành mẻ này?" |
| Toast lỗi: "Số lượng hoàn thành không hợp lệ.", "Không thể hoàn thành vượt quá kế hoạch." | ✅ showToast tương ứng |
| Disable button khi sai / loading | ✅ disabled={busy \|\| planned <= 0} |

---

## III. Notification System

| Loại | Cách làm | Trạng thái |
|------|----------|------------|
| Field Error (inline) | Text đỏ dưới input, không dùng alert() | ✅ Login, Cart submitError |
| Toast | Thành công / lỗi API; auto hide 3–4s | ✅ NotificationProvider + useNotification() |
| Confirm Modal | Receive, Complete Production, Update Status | ✅ Alert.alert (native modal) |

---

## IV. Global Error Handling (API interceptor)

| Response | Hành vi | Trạng thái |
|----------|--------|------------|
| 401 | logout + redirect (AuthGate) + toast "Phiên đăng nhập đã hết hạn." | ✅ setApiErrorHandlers trong NotificationProvider |
| 403 | Toast "Không có quyền truy cập." (hoặc message từ server) | ✅ on403 |
| 500 | Toast "Lỗi hệ thống." (hoặc message từ server) | ✅ on500 |
| Không silent fail | Mọi lỗi đều throw + handler/toast | ✅ api.ts gọi handlers rồi throw |

---

## V. UX Rules

| Quy tắc | Trạng thái |
|--------|------------|
| Disable button khi loading | ✅ Cart, Order receive, Kitchen production |
| Spinner khi đang call API | ✅ ActivityIndicator trên nút |
| Không double submit | ✅ disabled khi submitting/receiving/busy |
| Sau thành công: reset form, refetch | ✅ Cart: clearCart + redirect; Order: load(); Kitchen: refetch/back |
| API fail: không reset form, giữ dữ liệu | ✅ Không clearCart / không xóa input khi catch |

---

## VI. Checklist cuối cùng

| Câu hỏi | Trạng thái |
|--------|------------|
| Có chỗ nào submit khi form rỗng không? | ✅ Không – Cart/Login disable submit khi invalid |
| Có chỗ nào không hiện lỗi khi API fail không? | ✅ Không – toast trong catch; global 401/403/500 |
| Có chỗ nào Kitchen làm action của Store không? | ✅ Không – UI theo role (tab); BE phân quyền |
| Có chỗ nào Store gọi API Production không? | ✅ Không – Store không có màn Production |
| Có chỗ nào thiếu confirm modal không? | ✅ Đủ – Receive, Bắt đầu sản xuất, Hoàn thành mẻ, Hoàn thành kế hoạch |
| Có chỗ nào không disable khi loading không? | ✅ Đều disable – canSubmit/receiving/busy |

---

*Tài liệu tham chiếu sau khi triển khai validation + notification cho Kitchen & Store.*
