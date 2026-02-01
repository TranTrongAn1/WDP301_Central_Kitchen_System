import apiclient from '@/api/Client';

export interface Category {
  _id: string;
  categoryName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  categoryName: string;
}

export interface UpdateCategoryRequest {
  categoryName?: string;
}

export interface CategoryResponse {
  success: boolean;
  count?: number;
  message?: string;
  data?: Category | Category[];
}

export const categoryApi = {
  getAll: () => 
    apiclient.get<CategoryResponse>('/categories'),
  
  getById: (id: string) => 
    apiclient.get<CategoryResponse>(`/categories/${id}`),
  
  create: (data: CreateCategoryRequest) => 
    apiclient.post<CategoryResponse>('/categories', data),
  
  update: (id: string, data: UpdateCategoryRequest) => 
    apiclient.put<CategoryResponse>(`/categories/${id}`, data),
  
  delete: (id: string) => 
    apiclient.delete<CategoryResponse>(`/categories/${id}`),
};

