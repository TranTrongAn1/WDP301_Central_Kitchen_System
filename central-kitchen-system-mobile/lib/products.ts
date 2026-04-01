export type RecipeIngredient = {
  ingredientId: {
    _id: string;
    ingredientName: string;
    unit: string;
  };
  quantity: number; // quantity per unit (e.g., per cake)
};

export type BundleItem = {
  childProductId:
  | string
  | {
    _id: string;
    name?: string;
    sku?: string;
  };
  quantity: number;
};

export type Product = {
  _id: string;
  id?: string;
  name: string;
  sku?: string;
  categoryId?: string;
  price?: number;
  unit?: string;
  shelfLifeDays?: number;
  image?: string;
  recipe?: RecipeIngredient[];
  bundleItems?: BundleItem[];
  isActive?: boolean;
  isOutOfStock?: boolean;
};

export type ProductsResponse = {
  success: boolean;
  count?: number;
  data: Product[];
};
