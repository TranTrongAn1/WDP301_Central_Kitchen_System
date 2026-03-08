/** Feedback types from /api/feedback */

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
  images?: string[]; // tối đa 5
};

export type UpdateFeedbackPayload = Partial<CreateFeedbackPayload>;
