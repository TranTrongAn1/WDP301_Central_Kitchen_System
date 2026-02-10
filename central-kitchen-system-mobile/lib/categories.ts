export type Category = {
  _id: string;
  categoryName: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CategoriesResponse = {
  success: boolean;
  count?: number;
  data: Category[];
};
