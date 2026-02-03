import apiClient from './Client';

export interface Store {
  _id: string;
  name: string;
  storeName?: string;
  store_code: string;
  address: string;
  adress?: string;
  phone_number: string;
  status: 'Active' | 'Inactive' | boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStoreRequest {
  name: string;
  store_code: string;
  address: string;
  phone_number: string;
  status?: 'Active' | 'Inactive';
}

export interface UpdateStoreRequest {
  name?: string;
  store_code?: string;
  address?: string;
  phone_number?: string;
  status?: 'Active' | 'Inactive';
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}

export const storeApi = {
  getAllStores: async () => {
    const res = await apiClient.get<Store[]>('/stores');
    return res.data || [];
  },

  getAll: () =>
    apiClient.get<ApiResponse<Store[]>>('/stores'),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Store>>(`/stores/${id}`),

  create: (data: CreateStoreRequest) =>
    apiClient.post<ApiResponse<Store>>('/stores', data),

  update: (id: string, data: UpdateStoreRequest) =>
    apiClient.put<ApiResponse<Store>>(`/stores/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/stores/${id}`),
};