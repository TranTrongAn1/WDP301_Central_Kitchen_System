import apiClient from './Client';

export interface ProductionPlanDetail {
    productId: {
        _id: string;
        name: string;
        sku: string;
        price: number;
        shelfLifeDays: number;
    } | string;
    plannedQuantity: number;
    actualQuantity: number;
    status: 'Pending' | 'In_Progress' | 'Completed' | 'Cancelled';
}

export interface ProductionPlan {
    _id: string;
    planCode: string;
    planDate: string;
    status: 'Planned' | 'In_Progress' | 'Completed' | 'Cancelled';
    note?: string;
    details: ProductionPlanDetail[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateProductionPlanRequest {
    planCode: string;
    planDate: string;
    note?: string;
    status?: string;
    details: {
        productId: string;
        plannedQuantity: number;
        actualQuantity?: number;
        status?: string;
    }[];
}

export interface UpdateProductionPlanRequest {
    planDate?: string;
    note?: string;
    status?: 'Planned' | 'In_Progress' | 'Completed' | 'Cancelled';
}

export interface UpdateProductionStatusRequest {
    status: 'Planned' | 'In_Progress' | 'Completed' | 'Cancelled';
}

export interface CompleteProductionItemRequest {
    productId: string;
    actualQuantity: number;
}

export interface ProductionPlanQueryParams {
    status?: 'Planned' | 'In_Progress' | 'Completed' | 'Cancelled';
    planDate?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    count?: number;
    data: T;
}

export const productionPlanApi = {
    getAll: (params?: ProductionPlanQueryParams) =>
        apiClient.get<ApiResponse<ProductionPlan[]>>('/production', { params }),

    getById: (id: string) =>
        apiClient.get<ApiResponse<ProductionPlan>>(`/production/${id}`),

    create: (data: CreateProductionPlanRequest) =>
        apiClient.post<ApiResponse<ProductionPlan>>('/production', data),

    update: (id: string, data: UpdateProductionPlanRequest) =>
        apiClient.put<ApiResponse<ProductionPlan>>(`/production/${id}`, data),

    delete: (id: string) =>
        apiClient.delete<ApiResponse<null>>(`/production/${id}`),

    completeItem: (planId: string, data: CompleteProductionItemRequest) =>
        apiClient.post<ApiResponse<{
            plan: ProductionPlan;
            batch: unknown;
            traceability: unknown;
        }>>(`/production/${planId}/complete-item`, data),

    updateStatus: (planId: string, data: UpdateProductionStatusRequest) =>
        apiClient.patch<ApiResponse<ProductionPlan>>(`/production/${planId}/status`, data),
};
