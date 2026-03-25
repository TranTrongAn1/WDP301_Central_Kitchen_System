import apiClient from './Client';
import type { LogisticsOrder } from '@/shared/types/logistics';

export interface ReturnItem {
  productId: string | { _id: string; name: string; sku?: string };
  quantity: number;
  reason: string;
}

export interface ReturnRequest {
  _id: string;
  orderId: string | { _id: string; orderCode?: string };
  storeId: string | { _id: string; storeName?: string };
  items: ReturnItem[];
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'Cancelled';
  reason: string;
  description?: string;
  images?: string[];
  createdBy: string | { _id: string; fullName?: string; email?: string };
  processedBy?: string | { _id: string; fullName?: string };
  processedAt?: string;
  processedNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReturnPayload {
  orderId: string;
  reason: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ReturnsListResult {
  items: ReturnRequest[];
  count?: number;
}

const BASE = '/logistics/orders';

export const returnsApi = {
  /**
   * GET /api/logistics/orders?status=Cancelled
   * Lấy danh sách đơn hàng bị hủy (đổi trả)
   */
  getList: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ReturnsListResult> => {
    const res = await apiClient.get(BASE, {
      params: { ...params, status: 'Cancelled' },
    }) as { success?: boolean; data?: LogisticsOrder[]; count?: number; message?: string };
    const data = res?.data ?? [];
    const items: ReturnRequest[] = (Array.isArray(data) ? data : []).map((order: LogisticsOrder) => ({
      _id: order._id,
      orderId: order.orderCode ? { _id: order._id, orderCode: order.orderCode } : order._id,
      storeId: order.storeId,
      items: [],
      status: 'Cancelled',
      reason: (order as any).cancellationReason || (order as any).reason || '',
      createdBy: order.createdBy || '',
      createdAt: order.createdAt || '',
      updatedAt: order.updatedAt || '',
    }));
    return { items, count: res?.count ?? items.length };
  },

  /**
   * GET /api/logistics/orders/:id - Lấy chi tiết một đơn hàng bị hủy
   */
  getById: async (id: string): Promise<ReturnRequest | null> => {
    try {
      const res = await apiClient.get(`${BASE}/${id}`) as LogisticsOrder | ApiResponse<LogisticsOrder>;
      let order: LogisticsOrder | null = null;
      if (!res) return null;
      if (typeof res === 'object' && 'data' in res && res.data) {
        order = res.data;
      } else if (typeof res === 'object' && '_id' in res) {
        order = res as LogisticsOrder;
      }
      if (!order) return null;
      return {
        _id: order._id,
        orderId: order.orderCode ? { _id: order._id, orderCode: order.orderCode } : order._id,
        storeId: order.storeId,
        items: [],
        status: 'Cancelled',
        reason: (order as any).cancellationReason || (order as any).reason || '',
        createdBy: order.createdBy || '',
        createdAt: order.createdAt || '',
        updatedAt: order.updatedAt || '',
      };
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  /**
   * POST /api/logistics/orders/:orderId/reject
   * Tạo đổi trả = Hủy đơn hàng
   * StoreStaff/Coordinator gọi endpoint này để hủy đơn. Tiền tự hoàn nếu đã thanh toán.
   */
  create: async (payload: CreateReturnPayload): Promise<ReturnRequest> => {
    const res = await apiClient.post(`${BASE}/${payload.orderId}/reject`, {
      reason: payload.reason,
    }) as ApiResponse<LogisticsOrder> | LogisticsOrder;
    let order: LogisticsOrder;
    if (typeof res === 'object' && 'data' in res && res.data) {
      order = res.data;
    } else {
      order = res as LogisticsOrder;
    }
    return {
      _id: order._id,
      orderId: order.orderCode ? { _id: order._id, orderCode: order.orderCode } : order._id,
      storeId: order.storeId,
      items: [],
      status: 'Cancelled',
      reason: payload.reason,
      createdBy: order.createdBy || '',
      createdAt: order.createdAt || '',
      updatedAt: order.updatedAt || '',
    };
  },

  /**
   * NOTE: Không có PUT /api/returns/:id/approve hay /reject riêng
   * Vì không có ReturnRequest model - đổi trả = hủy đơn trực tiếp
   * StoreStaff/Coordinator gọi POST /api/logistics/orders/:orderId/reject
   */
  approve: (_id: string, _note?: string) => {
    console.warn('approve() không áp dụng cho luồng đổi trả hiện tại. Đổi trả = Hủy đơn.');
    return Promise.reject(new Error('Không áp dụng: đổi trả = hủy đơn trực tiếp'));
  },

  reject: (_id: string, _note?: string) => {
    console.warn('reject() không áp dụng cho luồng đổi trả hiện tại. Đổi trả = Hủy đơn.');
    return Promise.reject(new Error('Không áp dụng: đổi trả = hủy đơn trực tiếp'));
  },

  /**
   * DELETE /api/logistics/orders/:id - Xóa đơn hàng bị hủy (nếu cần)
   */
  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`${BASE}/${id}`),
};
