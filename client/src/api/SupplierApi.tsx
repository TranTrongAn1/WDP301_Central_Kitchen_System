import apiClient from './Client';

export interface Supplier {
    _id: string;
    name: string;
    contactPerson?: string;
    phone: string;
    email: string;
    address: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSupplierRequest {
    name: string;
    contactPerson?: string;
    phone: string;
    email: string;
    address: string;
}

export interface UpdateSupplierRequest {
    name?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    count?: number;
    data: T;
}

export const supplierApi = {
    getAll: () =>
        apiClient.get<ApiResponse<Supplier[]>>('/suppliers'),

    getById: (id: string) =>
        apiClient.get<ApiResponse<Supplier>>(`/suppliers/${id}`),

    create: (data: CreateSupplierRequest) =>
        apiClient.post<ApiResponse<Supplier>>('/suppliers', data),

    update: (id: string, data: UpdateSupplierRequest) =>
        apiClient.put<ApiResponse<Supplier>>(`/suppliers/${id}`, data),

    delete: (id: string) =>
        apiClient.delete<ApiResponse<null>>(`/suppliers/${id}`),
};
