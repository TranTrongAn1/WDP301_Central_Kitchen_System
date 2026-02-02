import apiClient from './Client';

export interface TransferItem {
    batchId: {
        _id: string;
        batchCode: string;
        productId: {
            _id: string;
            name: string;
            sku: string;
            price?: number;
        };
        mfgDate: string;
        expDate: string;
        currentQuantity: number;
    } | string;
    quantity: number;
    _id?: string;
}

export interface Transfer {
    _id: string;
    transferCode: string;
    toStoreId: {
        _id: string;
        storeName: string;
        address: string;
    } | string;
    createdBy: {
        _id: string;
        fullName: string;
        username: string;
        email?: string;
    } | string;
    status: 'Pending' | 'Shipped' | 'Received' | 'Cancelled';
    shippedDate?: string;
    receivedDate?: string;
    items: TransferItem[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateTransferRequest {
    toStoreId: string;
    items: {
        productId: string;
        batchId: string;
        quantity: number;
    }[];
    note?: string;
}

export interface UpdateTransferStatusRequest {
    status: 'Shipped' | 'Received' | 'Cancelled';
}

export interface TransferQueryParams {
    status?: 'Pending' | 'Shipped' | 'Received' | 'Cancelled';
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    count?: number;
    data: T;
}

export const transferApi = {
    getAll: (params?: TransferQueryParams) =>
        apiClient.get<ApiResponse<Transfer[]>>('/transfers', { params }),

    getById: (id: string) =>
        apiClient.get<ApiResponse<Transfer>>(`/transfers/${id}`),

    create: (data: CreateTransferRequest) =>
        apiClient.post<ApiResponse<Transfer>>('/transfers', data),

    updateStatus: (id: string, data: UpdateTransferStatusRequest) =>
        apiClient.put<ApiResponse<Transfer>>(`/transfers/${id}/status`, data),

    delete: (id: string) =>
        apiClient.delete<ApiResponse<null>>(`/transfers/${id}`),
};
