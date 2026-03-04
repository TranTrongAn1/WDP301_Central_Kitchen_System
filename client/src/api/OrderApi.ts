import apiClient from './Client';
import type { LogisticsOrder, OrderStatus } from '@/shared/types/logistics';

export type Order = LogisticsOrder;
export type { OrderStatus };

export interface OrderQueryParams {
  status?: string;
  storeId?: string;
}

interface OrderListResponse {
  success: boolean;
  count?: number;
  data: LogisticsOrder[];
  message?: string;
}

interface OrderDetailResponse {
  success: boolean;
  data: LogisticsOrder;
  message?: string;
}

export interface OrderAggregateItem {
  _id: string;
  productName: string;
  productSku: string;
  totalQuantity: number;
  orderCount: number;
}

export interface OrderAggregateResponse {
  success: boolean;
  date: string;
  count: number;
  data: OrderAggregateItem[];
}

export interface ApproveOrderItemPayload {
  productId: string;
  approvedQuantity: number;
  batches: { batchId: string; quantity: number }[];
}

export interface ApproveOrderPayload {
  items: ApproveOrderItemPayload[];
}

export const OrderApi = {
  getAllOrders: async (params?: OrderQueryParams): Promise<LogisticsOrder[]> => {
    const res = (await apiClient.get('/logistics/orders', { params })) as OrderListResponse;
    return res?.data ?? [];
  },

  getListWithCount: async (params?: OrderQueryParams): Promise<{ count: number; data: LogisticsOrder[] }> => {
    const res = (await apiClient.get('/logistics/orders', { params })) as OrderListResponse;
    const data = res?.data ?? [];
    return { count: res?.count ?? data.length, data };
  },

  getAggregate: async (date: string): Promise<OrderAggregateResponse> => {
    const res = (await apiClient.get('/logistics/orders/aggregate', { params: { date } })) as OrderAggregateResponse;
    return res ?? { success: true, date, count: 0, data: [] };
  },

  getOrderById: async (id: string): Promise<LogisticsOrder> => {
    const res = (await apiClient.get(`/logistics/orders/${id}`)) as OrderDetailResponse | LogisticsOrder;
    if (res && typeof res === 'object' && 'data' in res && res.data) return res.data;
    if (res && typeof res === 'object' && '_id' in res && 'orderCode' in res) return res as LogisticsOrder;
    throw new Error('Order not found');
  },

  rejectOrder: async (orderId: string, reason: string): Promise<OrderDetailResponse> => {
    const res = (await apiClient.post(`/logistics/orders/${orderId}/reject`, {
      reason
    })) as OrderDetailResponse;
    return res;
  },

  approveOrder: async (orderId: string, payload: ApproveOrderPayload): Promise<OrderDetailResponse> => {
    const res = (await apiClient.post(
      `/logistics/orders/${orderId}/approve`,
      payload
    )) as OrderDetailResponse;
    return res;
  },
};
