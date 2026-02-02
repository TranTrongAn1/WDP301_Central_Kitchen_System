import apiClient from './Client';

export interface RecipeItem {
    ingredientId: {
        _id: string;
        name: string;
        unit: string;
        costPrice: number;
    } | string;
    quantity: number;
}

export interface BundleItem {
    childProductId: {
        _id: string;
        name: string;
        sku: string;
    } | string;
    quantity: number;
}

export interface Product {
    _id: string;
    name: string;
    sku: string;
    categoryId: {
        _id: string;
        name: string;
        description?: string;
    } | string;
    price: number;
    shelfLifeDays: number;
    image?: string;
    recipe: RecipeItem[];
    bundleItems: BundleItem[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateProductRequest {
    name: string;
    sku: string;
    categoryId: string;
    price: number;
    shelfLifeDays: number;
    image?: string;
    recipe?: {
        ingredientId: string;
        quantity: number;
    }[];
    bundleItems?: {
        childProductId: string;
        quantity: number;
    }[];
}

export interface UpdateProductRequest {
    name?: string;
    sku?: string;
    categoryId?: string;
    price?: number;
    shelfLifeDays?: number;
    image?: string;
    recipe?: {
        ingredientId: string;
        quantity: number;
    }[];
    bundleItems?: {
        childProductId: string;
        quantity: number;
    }[];
}

export interface ProductQueryParams {
    categoryId?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    count?: number;
    data: T;
}

export const productApi = {
    getAll: (params?: ProductQueryParams) =>
        apiClient.get<ApiResponse<Product[]>>('/products', { params }),

    getById: (id: string) =>
        apiClient.get<ApiResponse<Product>>(`/products/${id}`),

    create: (data: CreateProductRequest) =>
        apiClient.post<ApiResponse<Product>>('/products', data),

    update: (id: string, data: UpdateProductRequest) =>
        apiClient.put<ApiResponse<Product>>(`/products/${id}`, data),

    delete: (id: string) =>
        apiClient.delete<ApiResponse<null>>(`/products/${id}`),
};
