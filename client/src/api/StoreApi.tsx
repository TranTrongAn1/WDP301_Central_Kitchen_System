import apiClient from './Client';

export interface Store {
  _id: string;
  name?: string;
  storeName?: string;
  store_code?: string;
  storeCode?: string;
  address: string;
  adress?: string;
  phone_number?: string;
  phone?: string;
  standardDeliveryMinutes?: number;
  status: 'Active' | 'Inactive' | boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Backend body: storeName, storeCode, address, phone, standardDeliveryMinutes, status */
export interface CreateStoreRequest {
  storeName: string;
  storeCode: string;
  address: string;
  phone: string;
  standardDeliveryMinutes?: number;
  status?: 'Active' | 'Inactive';
}

export interface UpdateStoreRequest {
  storeName?: string;
  storeCode?: string;
  address?: string;
  phone?: string;
  standardDeliveryMinutes?: number;
  status?: 'Active' | 'Inactive';
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}

export const storeApi = {
  getAllStores: async (): Promise<Store[]> => {
    const res = await apiClient.get<any>('/stores');
    const raw = res?.data ?? res;
    return Array.isArray(raw) ? raw : [];
  },

  getAll: () =>
    apiClient.get<ApiResponse<Store[]>>('/stores'),

  getById: (id: string) =>
    apiClient.get(`/stores/${id}`) as Promise<ApiResponse<Store>>,

  create: (data: CreateStoreRequest) =>
    apiClient.post<ApiResponse<Store>>('/stores', data),

  update: (id: string, data: UpdateStoreRequest) =>
    apiClient.put<ApiResponse<Store>>(`/stores/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/stores/${id}`),
};