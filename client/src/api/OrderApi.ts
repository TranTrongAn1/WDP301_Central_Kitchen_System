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

export interface CreateOrderItemPayload {
  productId: string;
  quantityRequested: number;
}

export type PaymentMethod = 'Wallet' | 'Cash' | 'BankTransfer' | 'Other';

export interface CreateOrderPayload {
  storeId: string;
  requestedDeliveryDate: string;
  recipientName: string;
  recipientPhone: string;
  address?: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  items: CreateOrderItemPayload[];
}

export interface UpdateOrderPayload {
  requestedDeliveryDate?: string;
  recipientName?: string;
  recipientPhone?: string;
  address?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  items?: CreateOrderItemPayload[];
}

export interface ReceiveOrderItemPayload {
  productId: string;
  receivedQuantity: number;
  note?: string;
  discrepancyReason?: 'Missing' | 'Damaged' | 'Other';
  discrepancyImageURL?: string;
}

export interface ReceiveOrderPayload {
  items: ReceiveOrderItemPayload[];
  receivedEvidenceImageURL?: string;
}

export interface CreateOrderResponseData {
  order: LogisticsOrder;
  invoice?: unknown;
  walletPayment?: {
    amountPaid: number;
    newBalance: number;
  };
}

export interface CreateOrderResponse {
  success: boolean;
  message?: string;
  data: CreateOrderResponseData;
}

export interface ApproveOrderResponseData {
  order: LogisticsOrder;
  invoice?: unknown;
}

export interface ApproveOrderResponse {
  success: boolean;
  message?: string;
  data: ApproveOrderResponseData;
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

  createOrder: async (payload: CreateOrderPayload): Promise<CreateOrderResponse> => {
    const res = (await apiClient.post('/logistics/orders', payload)) as CreateOrderResponse;
    return res;
  },

  updateOrder: async (orderId: string, payload: UpdateOrderPayload): Promise<OrderDetailResponse> => {
    const res = (await apiClient.put(`/logistics/orders/${orderId}`, payload)) as OrderDetailResponse;
    return res;
  },

  receiveOrder: async (orderId: string, payload: ReceiveOrderPayload): Promise<OrderDetailResponse> => {
    const res = (await apiClient.post(
      `/logistics/orders/${orderId}/receive`,
      payload
    )) as OrderDetailResponse;
    return res;
  },

  rejectOrder: async (orderId: string, reason: string): Promise<OrderDetailResponse> => {
    const res = (await apiClient.post(`/logistics/orders/${orderId}/reject`, {
      reason
    })) as OrderDetailResponse;
    return res;
  },

  approveOrder: async (orderId: string): Promise<ApproveOrderResponse> => {
    const res = (await apiClient.post(
      `/logistics/orders/${orderId}/approve`
    )) as ApproveOrderResponse;
    return res;
  },
};
