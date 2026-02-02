import apiClient from './Client';

export interface Batch {
    _id: string;
    batchCode: string;
    productionPlanId: string;
    productId: {
        _id: string;
        name: string;
        sku: string;
        price: number;
        shelfLifeDays: number;
    } | string;
    mfgDate: string;
    expDate: string;
    initialQuantity: number;
    currentQuantity: number;
    status: 'Active' | 'SoldOut' | 'Expired' | 'Recalled';
    isExpired?: boolean;
    ingredientBatchesUsed?: {
        ingredientBatchId: string;
        quantityUsed: number;
    }[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateBatchRequest {
    batchCode: string;
    productionPlanId: string;
    productId: string;
    mfgDate: string;
    expDate: string;
    initialQuantity: number;
    currentQuantity: number;
}

export interface UpdateBatchRequest {
    currentQuantity?: number;
    status?: 'Active' | 'SoldOut' | 'Expired' | 'Recalled';
}

export interface BatchQueryParams {
    productId?: string;
    status?: 'Active' | 'SoldOut' | 'Expired' | 'Recalled';
    expiring?: number;
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    count?: number;
    data: T;
}

export const batchApi = {
    getAll: (params?: BatchQueryParams) =>
        apiClient.get<ApiResponse<Batch[]>>('/batches', { params }),

    getById: (id: string) =>
        apiClient.get<ApiResponse<Batch>>(`/batches/${id}`),

    create: (data: CreateBatchRequest) =>
        apiClient.post<ApiResponse<Batch>>('/batches', data),

    update: (id: string, data: UpdateBatchRequest) =>
        apiClient.put<ApiResponse<Batch>>(`/batches/${id}`, data),

    delete: (id: string) =>
        apiClient.delete<ApiResponse<null>>(`/batches/${id}`),
};
