import apiclient from '@/api/Client';

export interface Ingredient {
  _id: string;
  ingredientName: string;
  unit: string;
  costPrice: number;
  warningThreshold: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
  isBelowThreshold?: boolean;
}

export interface Supplier {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive';
}

export interface IngredientBatch {
  _id: string;
  ingredientId: {
    _id: string;
    ingredientName: string;
    unit: string;
  };
  supplierId: Supplier;
  batchCode: string;
  expiryDate: string;
  receivedDate: string;
  initialQuantity: number;
  currentQuantity: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIngredientRequest {
  ingredientName: string;
  unit: string;
  costPrice: number;
  warningThreshold?: number;
}

export interface UpdateIngredientRequest {
  ingredientName?: string;
  unit?: string;
  costPrice?: number;
  warningThreshold?: number;
}

export interface CreateBatchRequest {
  batchCode: string;
  expiryDate: string;
  initialQuantity: number;
  price: number;
  supplierId: string;
}

export interface IngredientResponse {
  success: boolean;
  count?: number;
  message?: string;
  data?: Ingredient | Ingredient[] | {
    batch?: IngredientBatch;
    ingredient?: Partial<Ingredient>;
  };
}

export interface BatchListResponse {
  success: boolean;
  count: number;
  data: IngredientBatch[];
  note?: string;
}

export const ingredientApi = {
  getAll: () => 
    apiclient.get<IngredientResponse>('/ingredients'),
  
  getById: (id: string) => 
    apiclient.get<IngredientResponse>(`/ingredients/${id}`),
  
  create: (data: CreateIngredientRequest) => 
    apiclient.post<IngredientResponse>('/ingredients', data),
  
  update: (id: string, data: UpdateIngredientRequest) => 
    apiclient.put<IngredientResponse>(`/ingredients/${id}`, data),
  
  delete: (id: string) => 
    apiclient.delete<IngredientResponse>(`/ingredients/${id}`),
  
  getBatches: (ingredientId: string) => 
    apiclient.get<BatchListResponse>(`/ingredients/${ingredientId}/batches`),
  
  addBatch: (ingredientId: string, data: CreateBatchRequest) => 
    apiclient.post<IngredientResponse>(`/ingredients/${ingredientId}/batches`, data),
};

