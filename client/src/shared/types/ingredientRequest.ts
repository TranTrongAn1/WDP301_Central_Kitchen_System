export type IngredientRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

export type RequestType = 'URGENT' | 'PLANNED';

export interface IngredientRequestIngredient {
  _id: string;
  name: string;
  code: string;
}

export interface IngredientRequest {
  _id: string;
  ingredientId: string | IngredientRequestIngredient;
  requestType: RequestType;
  quantityRequested: number;
  unit: string;
  status: IngredientRequestStatus;
  note?: string | null;
  
  // Các trường thời gian quan trọng
  neededByDate: string | null;         // Bếp nhập
  expectedDeliveryDate: string | null; // Điều phối nhập khi Duyệt
  
  // Tài chính & Truy xuất
  supplierId?: string | null;
  supplierName?: string;
  actualCost: number | null;
  receiptImage?: string;
  
  requestedBy: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// POST create body (Bếp tạo)
export interface CreateIngredientRequestBody {
  ingredientId: string;
  quantityRequested: number;
  requestType: RequestType;
  unit: string;
  note?: string;
  neededByDate: string; // Bắt buộc để Điều phối biết đường mà sắp xếp
}

// PUT status body (Điều phối Duyệt)
export interface UpdateIngredientRequestStatusBody {
  status: 'APPROVED' | 'REJECTED' | 'COMPLETED'; // 👈 thêm dòng này
}

// GET list query
export interface IngredientRequestListParams {
  status?: 'ALL' | IngredientRequestStatus;
  requestType?: RequestType; // Thêm dòng này để lọc
}

// PUT complete body (chốt hàng)
export interface CompleteIngredientRequestBody {
  actualCost: number;
  supplierId?: string | null;
  supplierName?: string;
  receiptImage?: string;
  expiryDate?: string;
  status: 'COMPLETED';
}

// API response wrappers
export interface IngredientRequestListResponse {
  success: boolean;
  data: IngredientRequest[];
}

export interface IngredientRequestSingleResponse {
  success: boolean;
  message?: string;
  data: IngredientRequest;
}

export interface IngredientRequestCompleteResponse {
  success: boolean;
  message: string;
}
