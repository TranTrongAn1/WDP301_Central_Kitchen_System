export type IngredientBatchStatusMeta = {
  isExpired?: boolean;
  isEmpty?: boolean;
  isActive?: boolean;
};

export type IngredientBatch = IngredientBatchStatusMeta & {
  _id: string;
  ingredientId: string;
  supplierId: string;
  batchCode: string;
  expiryDate: string; // ISO date (YYYY-MM-DD)
  receivedDate?: string; // ISO date
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

