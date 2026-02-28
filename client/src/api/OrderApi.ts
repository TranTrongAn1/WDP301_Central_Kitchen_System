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

export const OrderApi = {
  getAllOrders: async (params?: OrderQueryParams): Promise<LogisticsOrder[]> => {
    const res = (await apiClient.get('/logistics/orders', { params })) as OrderListResponse;
    return res?.data ?? [];
  },

  getOrderById: async (id: string): Promise<LogisticsOrder> => {
    const res = (await apiClient.get(`/logistics/orders/${id}`)) as OrderDetailResponse | LogisticsOrder;
    if (res && typeof res === 'object' && 'data' in res && res.data) return res.data;
    if (res && typeof res === 'object' && '_id' in res && 'orderCode' in res) return res as LogisticsOrder;
    throw new Error('Order not found');
  },
};
