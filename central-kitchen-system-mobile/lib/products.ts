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
};

export type ProductsResponse = {
  success: boolean;
  count?: number;
  data: Product[];
};
