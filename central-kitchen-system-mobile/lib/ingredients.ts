export type Ingredient = {
  _id: string;
  id?: string;
  name: string;
  unit: string;
  costPrice: number;
  warningThreshold: number;
  totalQuantity?: number;
  ingredientName?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  isBelowThreshold?: boolean;
  batches?: unknown[];
};

export type IngredientsResponse = {
  success: boolean;
  count: number;
  data: Ingredient[];
};

export type IngredientResponse = {
  success: boolean;
  data: Ingredient;
};
