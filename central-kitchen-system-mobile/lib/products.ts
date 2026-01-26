export type Product = {
  _id: string;
  id?: string;
  name: string;
  sku?: string;
  categoryId?: string;
  price?: number;
  shelfLifeDays?: number;
};

export type ProductsResponse = {
  success: boolean;
  count?: number;
  data: Product[];
};
