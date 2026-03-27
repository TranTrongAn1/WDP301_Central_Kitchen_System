// lib/ingredient-requests.ts

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type RequestType = 'URGENT' | 'PLANNED';

// Khai báo chính xác cấu trúc Backend trả về
export interface IngredientRequest {
  _id: string;
  // Vì backend dùng populate nên ingredientId là một object
  ingredientId: {
    _id: string;
    name?: string;
    ingredientName?: string; // Thêm dòng này để backup vì có lúc backend trả về ingredientName
    code?: string;
  };
  requestType: RequestType;
  quantityRequested: number;
  unit: string;
  status: RequestStatus;
  note?: string;
  
  // ---- TRUY XUẤT NGUỒN GỐC & TÀI CHÍNH ----
  supplierId?: string | { _id: string; name: string }; // Có thể là chuỗi ID hoặc Object nếu dùng populate
  supplierName?: string;
  actualCost?: number;
  receiptImage?: string;
  
  // ---- THÔNG TIN THỜI GIAN ----
  expectedDeliveryDate?: string; // Điều phối chốt ngày giao
  neededByDate?: string;         // Bếp yêu cầu cần trước ngày này
  receivedDate?: string;         // Ngày thực tế nhận được hàng nhập kho
  
  // ---- THÔNG TIN NGƯỜI DÙNG ----
  requestedBy?: string | { _id: string; name: string }; // Người tạo phiếu
  approvedBy?: string | { _id: string; name: string };  // Người duyệt phiếu

  // ---- TIMESTAMPS ----
  createdAt: string;
  updatedAt: string;
}