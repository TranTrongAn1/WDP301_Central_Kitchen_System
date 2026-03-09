// Ingredient Request – Phiếu xin mua nguyên liệu
// Match backend status enum
export type IngredientRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

// Populated ingredient (from GET list/detail)
export interface IngredientRequestIngredient {
  _id: string;
  name: string;
  code: string;
}

export interface IngredientRequest {
  _id: string;
  ingredientId: string | IngredientRequestIngredient;
  quantityRequested: number;
  unit: string;
  status: IngredientRequestStatus;
  note?: string | null;
  actualCost: number | null;
  requestedBy: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// GET list query
export interface IngredientRequestListParams {
  status?: 'ALL' | IngredientRequestStatus;
}

// POST create body
export interface CreateIngredientRequestBody {
  ingredientId: string;
  quantityRequested: number;
  unit?: string;
  note?: string;
}

// PUT status body (approve/reject)
export interface UpdateIngredientRequestStatusBody {
  status: 'APPROVED' | 'REJECTED';
}

// PUT complete body (chốt hàng)
export interface CompleteIngredientRequestBody {
  actualCost: number;
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
