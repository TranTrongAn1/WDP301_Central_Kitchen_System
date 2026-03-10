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

/** Backend returns "InProgress"; FE cũng dùng "In_Progress" ở một số nơi - chấp nhận cả hai */
export type ProductionPlanStatus = 'Planned' | 'In_Progress' | 'InProgress' | 'Completed' | 'Cancelled';

export interface ProductionPlan {
    _id: string;
    planCode: string;
    planDate: string;
    status: ProductionPlanStatus;
    note?: string;
    details: ProductionPlanDetail[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateProductionPlanRequest {
    planCode: string;
    planDate: string;
    note?: string;
    /**
     * Danh sách order đã Approved dùng để tạo plan.
     * Backend sẽ tự gộp theo sản phẩm và sinh details + status.
     */
    orderIds: string[];
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
    usedIngredients: {
        ingredientBatchId: string;
        quantityUsed: number;
        note?: string;
    }[];
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

const BASE = '/production-plans';

/** Đồng bộ trạng thái khi gửi lên backend.
 * Backend hiện trả lỗi nếu không thuộc: Planned, In_Progress, Completed, Cancelled,
 * nên FE sẽ luôn gửi đúng các chuỗi này (nếu lỡ dùng InProgress thì map ngược về In_Progress). */
function toBackendStatus(s: string): string {
    if (s === 'InProgress') return 'In_Progress';
    return s;
}

/** Kiểm tra trạng thái "đang thực hiện" (BE trả InProgress, FE dùng In_Progress) */
export function isPlanInProgress(status: string): boolean {
    return status === 'In_Progress' || status === 'InProgress';
}

export const productionPlanApi = {
    getAll: (params?: ProductionPlanQueryParams) =>
        apiClient.get<ApiResponse<ProductionPlan[]>>(BASE, { params }),

    getById: (id: string) =>
        apiClient.get<ApiResponse<ProductionPlan>>(`${BASE}/${id}`),

    create: (data: CreateProductionPlanRequest) =>
        apiClient.post<ApiResponse<ProductionPlan>>(BASE, data),

    update: (id: string, data: UpdateProductionPlanRequest) => {
        const payload: UpdateProductionPlanRequest = { ...data };
        if (payload.status) {
            payload.status = toBackendStatus(payload.status) as UpdateProductionStatusRequest['status'];
        }
        return apiClient.put<ApiResponse<ProductionPlan>>(`${BASE}/${id}`, payload);
    },

    delete: (id: string) =>
        apiClient.delete<ApiResponse<null>>(`${BASE}/${id}`),

    completeItem: (planId: string, data: CompleteProductionItemRequest) =>
        apiClient.post<ApiResponse<{
            plan: ProductionPlan;
            batch: unknown;
            traceability: unknown;
        }>>(`${BASE}/${planId}/complete-item`, data),

    updateStatus: (planId: string, data: UpdateProductionStatusRequest) =>
        apiClient.patch<ApiResponse<ProductionPlan>>(`${BASE}/${planId}/status`, {
            status: toBackendStatus(data.status),
        }),
};
