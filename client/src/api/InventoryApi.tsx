import apiClient from './Client';

export interface IngredientBatch {
    _id: string;
    ingredientId: {
        _id: string;
        ingredientName: string;
        unit: string;
    } | string;
    supplierId: {
        _id: string;
        name: string;
    } | string;
    batchCode: string;
    expiryDate: string;
    receivedDate: string;
    initialQuantity: number;
    currentQuantity: number;
    price: number;
    isActive: boolean;
    isExpired?: boolean;
    isEmpty?: boolean;
}

export interface Ingredient {
    _id: string;
    ingredientName: string;
    unit: string;
    costPrice: number;
    warningThreshold: number;
    totalQuantity: number;
    isBelowThreshold: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateIngredientRequest {
    ingredientName: string;
    unit: string;
    costPrice: number;
    warningThreshold: number;
}

export interface CreateIngredientBatchRequest {
    supplierId: string;
    batchCode: string;
    initialQuantity: number;
    price: number;
    expiryDate: string;
    receivedDate: string;
}

export interface IngredientQueryParams {
    lowStock?: boolean;
}

export interface StoreInventoryItem {
    _id: string;
    storeId: {
        _id: string;
        storeName: string;
    };
    productId: {
        _id: string;
        name: string;
        sku: string;
        price: number;
        shelfLifeDays: number;
    };
    batchId: {
        _id: string;
        batchCode: string;
        mfgDate: string;
        expDate: string;
    };
    quantity: number;
    createdAt: string;
    updatedAt: string;
}

export interface StoreInventoryResponse {
    success: boolean;
    store: {
        id: string;
        name: string;
        address: string;
    };
    summary: {
        productId: string;
        productName: string;
        productSku: string;
        totalQuantity: number;
        batches: number;
    }[];
    count: number;
    data: StoreInventoryItem[];
}

export interface AllInventoryResponse {
    success: boolean;
    storeCount: number;
    totalItems: number;
    data: {
        store: {
            id: string;
            name: string;
            address: string;
        };
        items: StoreInventoryItem[];
        totalQuantity: number;
    }[];
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    count?: number;
    data: T;
}

export const ingredientApi = {
    getAll: (params?: IngredientQueryParams) =>
        apiClient.get<ApiResponse<Ingredient[]>>('/ingredients', { params }),

    getById: (id: string) =>
        apiClient.get<ApiResponse<Ingredient>>(`/ingredients/${id}`),

    create: (data: CreateIngredientRequest) =>
        apiClient.post<ApiResponse<Ingredient>>('/ingredients', data),

    update: (id: string, data: Partial<CreateIngredientRequest>) =>
        apiClient.put<ApiResponse<Ingredient>>(`/ingredients/${id}`, data),

    delete: (id: string) =>
        apiClient.delete<ApiResponse<null>>(`/ingredients/${id}`),

    getBatches: (ingredientId: string) =>
        apiClient.get<ApiResponse<IngredientBatch[]>>(`/ingredients/${ingredientId}/batches`),

    addBatch: (ingredientId: string, data: CreateIngredientBatchRequest) =>
        apiClient.post<ApiResponse<{
            batch: IngredientBatch;
            ingredient: Ingredient;
        }>>(`/ingredients/${ingredientId}/batches`, data),
};

export const inventoryApi = {
    getByStore: (storeId: string, params?: { productId?: string; lowStock?: boolean }) =>
        apiClient.get<StoreInventoryResponse>(`/inventory/store/${storeId}`, { params }),

    getAll: () =>
        apiClient.get<AllInventoryResponse>('/inventory/all'),

    getExpiring: (days?: number) =>
        apiClient.get<ApiResponse<StoreInventoryItem[]>>('/inventory/expiring', { params: { days } }),

    getAllIngredientBatches: () =>
        apiClient.get<ApiResponse<IngredientBatch[]>>('/ingredient-batches'),
};
