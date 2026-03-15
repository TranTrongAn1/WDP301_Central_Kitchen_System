// lib/ingredient-requests.ts

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type RequestType = 'URGENT' | 'PLANNED';

// Khai báo chính xác cấu trúc Backend trả về
export interface IngredientRequest {
  _id: string;
  // Vì backend dùng populate nên ingredientId là một object
  ingredientId: {
    _id: string;
    name: string;
    code?: string;
  };
  requestType: RequestType;
  quantityRequested: number;
  unit: string;
  status: RequestStatus;
  note?: string;
  supplierName?: string;
  actualCost?: number;
  receiptImage?: string;
  createdAt: string;
  updatedAt: string;
}