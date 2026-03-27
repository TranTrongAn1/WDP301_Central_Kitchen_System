export type IngredientBatchStatusMeta = {
  isExpired?: boolean;
  isEmpty?: boolean;
  isActive?: boolean;
};

export type IngredientBatch = IngredientBatchStatusMeta & {
  _id: string;
  ingredientId: {
    _id: string;
    ingredientName?: string;
    unit?: string;
    costPrice?: number;
    totalQuantity?: number;
  } | string;
  supplierId: {
    _id: string;
    supplierName?: string;
    contactPhone?: string;
  } | string;
  batchCode: string;
  expiryDate: string;
  receivedDate?: string; 
  initialQuantity: number;
  currentQuantity: number;
  price: number;
  createdAt?: string;
  updatedAt?: string;
};

export type IngredientBatchesResponse = {
  success: boolean;
  count: number;
  data: IngredientBatch[];
};

export type IngredientBatchResponse = {
  success: boolean;
  data: IngredientBatch;
};