import apiClient from './Client';

export interface FeedbackPayload {
  rating: number;
  content: string;
  images?: string[];
}

export interface Feedback extends FeedbackPayload {
  _id: string;
  orderId: string | { _id: string; orderCode?: string };
  createdBy: {
    _id: string;
    fullName?: string;
    email?: string;
  } | string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackListParams {
  page?: number;
  limit?: number;
  orderId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const BASE = '/feedback';

export const feedbackApi = {
  /** GET /api/feedback - Admin, Manager: danh sách toàn bộ phản hồi */
  getList: async (params?: FeedbackListParams): Promise<Feedback[]> => {
    const res = (await apiClient.get(BASE, { params })) as ApiResponse<Feedback[]> | { data: Feedback[] };
    const data = (res as any)?.data ?? res;
    return Array.isArray(data) ? data : [];
  },

  getByOrderId: async (orderId: string): Promise<Feedback | null> => {
    try {
      const res = (await apiClient.get(`${BASE}/${orderId}`)) as
        | ApiResponse<Feedback>
        | Feedback
        | null;

      if (!res) return null;
      if (typeof res === 'object' && 'data' in res && (res as any).data) {
        return (res as ApiResponse<Feedback>).data;
      }
      if (typeof res === 'object' && '_id' in res) {
        return res as Feedback;
      }
      return null;
    } catch (error: any) {
      // Nếu không có feedback cho order này, backend trả 404 => coi như không có feedback
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: (orderId: string, payload: FeedbackPayload) =>
    apiClient.post<ApiResponse<Feedback>>(`${BASE}/${orderId}`, payload),

  update: (orderId: string, payload: FeedbackPayload) =>
    apiClient.put<ApiResponse<Feedback>>(`${BASE}/${orderId}`, payload),

  delete: (orderId: string) =>
    apiClient.delete<ApiResponse<null>>(`${BASE}/${orderId}`),
};

