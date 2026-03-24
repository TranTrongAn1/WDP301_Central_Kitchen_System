/** Feedback types from /api/feedback */

export const FEEDBACK_TAGS = [
  "Giao hàng nhanh/Đúng giờ",
  "Vận chuyển an toàn/Cẩn thận",
  "Thái độ Shipper tốt",
  "Sản phẩm chất lượng/Đẹp",
  "Đóng gói chắc chắn",
  "Giao hàng trễ hẹn",
  "Vận chuyển thiếu hàng",
  "Hàng hư hỏng do vận chuyển",
  "Giao sai sản phẩm",
  "Sản phẩm cận date/Hết hạn",
  "Bánh bị lỗi/Biến dạng",
  "Thái độ Shipper kém",
  "Khác",
] as const;

export type FeedbackTag = (typeof FEEDBACK_TAGS)[number];

export type FeedbackImageFile = {
  uri: string;
  name?: string;
  type?: string;
};

export type FeedbackOrderRef = {
  orderCode?: string;
  status?: string;
  receivedDate?: string;
};

export type FeedbackStoreRef = {
  storeName?: string;
  storeCode?: string;
  address?: string;
};

export type FeedbackCreatedByRef = {
  _id?: string;
  username?: string;
  email?: string;
};

export type Feedback = {
  _id: string;
  orderId: string | FeedbackOrderRef & { _id?: string };
  storeId: string | FeedbackStoreRef & { _id?: string };
  rating: number;
  content?: string;
  tags?: string[];
  images?: string[];
  createdBy?: string | FeedbackCreatedByRef;
  createdAt: string;
  updatedAt: string;
};

export type FeedbackResponse = {
  success: boolean;
  message?: string;
  data: Feedback;
};

export type FeedbacksResponse = {
  success: boolean;
  count?: number;
  data: Feedback[];
};

export type CreateFeedbackPayload = {
  rating: number; // 1–5, bắt buộc
  content?: string;
  tags?: string[];
  images?: string[]; // tối đa 5
  imageFiles?: FeedbackImageFile[];
};

export type UpdateFeedbackPayload = Partial<CreateFeedbackPayload>;
