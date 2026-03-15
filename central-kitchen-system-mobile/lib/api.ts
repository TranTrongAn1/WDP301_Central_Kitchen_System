import { getApiErrorHandlers } from "@/lib/api-error-handler";
import type { LoginResponse, MeResponse } from "@/lib/auth";
import type { CategoriesResponse } from "@/lib/categories";
import { API_BASE_URL } from "@/lib/env";
import type {
  CreateFeedbackPayload,
  FeedbackResponse,
  UpdateFeedbackPayload,
} from "@/lib/feedback";
import type {
  IngredientBatch,
  IngredientBatchResponse,
  IngredientBatchesResponse,
} from "@/lib/ingredient-batches";
import type { IngredientUsagesResponse } from "@/lib/ingredient-usages";
import type {
  Ingredient,
  IngredientResponse,
  IngredientsResponse,
} from "@/lib/ingredients";
import type { StoreInventoryResponse } from "@/lib/inventory";
import type {
  InvoiceResponse,
  InvoicesResponse,
  PaymentLinkResponse,
} from "@/lib/invoices";
import type { CreateOrderPayload, CreateOrderResponse, OrderResponse, OrdersResponse } from "@/lib/orders";
import type {
  CompleteItemPayload,
  ProductionPlan,
  ProductionPlanResponse,
  ProductionPlansResponse,
} from "@/lib/production-plans";
import type { Product, ProductsResponse } from "@/lib/products";
import type { SystemSettingResponse, SystemSettingsResponse } from "@/lib/system-settings";
import type {
  DeliveryTripResponse,
  DeliveryTripsResponse,
} from "@/lib/trips";
import type { WalletResponse } from "@/lib/wallet";

const API_REQUEST_TIMEOUT_MS = 10000; // 10 seconds

type ApiError = {
  success: false;
  message?: string;
};

const buildUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    API_REQUEST_TIMEOUT_MS,
  );

  try {
    const url = buildUrl(path);
    const method = options?.method ?? "GET";
    const hasBody = options?.body != null;
    const incomingHeaders = options?.headers;
    let normalizedHeaders: Record<string, string> = {};
    if (incomingHeaders != null) {
      if (incomingHeaders instanceof Headers) {
        normalizedHeaders = Object.fromEntries(incomingHeaders.entries()) as Record<string, string>;
      } else if (Array.isArray(incomingHeaders)) {
        normalizedHeaders = Object.fromEntries(incomingHeaders as [string, string][]) as Record<string, string>;
      } else if (typeof incomingHeaders === "object" && incomingHeaders !== null && !("length" in incomingHeaders)) {
        normalizedHeaders = { ...incomingHeaders } as Record<string, string>;
      }
    }
    const defaultHeaders: Record<string, string> = {
      Accept: "application/json",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...normalizedHeaders,
    };
    const response = await fetch(url, {
      signal: controller.signal,
      ...options,
      method,
      headers: defaultHeaders,
    });

    clearTimeout(timeoutId);

    let data: T | ApiError;
    try {
      data = (await response.json()) as T | ApiError;
    } catch (parseError) {
      if (__DEV__) {
        console.warn("[api] JSON parse error for", path, parseError);
      }
      throw new Error("Invalid response from server");
    }

    if (!response.ok) {
      const message =
        (data as ApiError).message ??
        `Request failed with status ${response.status}`;
      if (__DEV__) {
        console.warn("[api] Request failed:", path, response.status, message);
      }
      const errHandlers = getApiErrorHandlers();
      if (response.status === 401) {
        errHandlers.on401?.();
      } else if (response.status === 403) {
        errHandlers.on403?.(message);
      } else if (response.status >= 500) {
        errHandlers.on500?.(message);
      }
      const err = new Error(message) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }

    return data as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (__DEV__) {
      console.warn("[api] Error:", path, err);
    }
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new Error("Request timeout. Please try again.");
      }
      throw err;
    }
    throw new Error("Network error. Please try again.");
  }
};

const withAuth = (token?: string | null): Record<string, string> =>
  token
    ? {
      Authorization: `Bearer ${token}`,
    }
    : {};

export const authApi = {
  login: (payload: { username: string; password: string }) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: (token: string) =>
    request<MeResponse>("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
};

export const ingredientsApi = {
  getAll: (token?: string | null) =>
    request<IngredientsResponse>("/api/ingredients", {
      headers: withAuth(token),
    }),
  getById: (id: string, token?: string | null) =>
    request<IngredientResponse>(`/api/ingredients/${id}`, {
      headers: withAuth(token),
    }),
  create: (payload: Partial<Ingredient>, token?: string | null) =>
    request<IngredientResponse>("/api/ingredients", {
      method: "POST",
      headers: withAuth(token),
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<Ingredient>, token?: string | null) =>
    request<IngredientResponse>(`/api/ingredients/${id}`, {
      method: "PUT",
      headers: withAuth(token),
      body: JSON.stringify(payload),
    }),
  remove: (id: string, token?: string | null) =>
    request<{ success: boolean }>(`/api/ingredients/${id}`, {
      method: "DELETE",
      headers: withAuth(token),
    }),
};

export const productsApi = {
  getAll: (token?: string | null) =>
    request<ProductsResponse>("/api/products", {
      headers: withAuth(token),
    }),
  getById: (id: string, token?: string | null) =>
    request<{ success: boolean; data: Product }>(`/api/products/${id}`, {
      headers: withAuth(token),
    }),
};

export const storeInventoryApi = {
  getByStore: (storeId: string, token?: string | null) =>
    request<StoreInventoryResponse>(`/api/inventory/store/${storeId}`, {
      headers: withAuth(token),
    }),
};

export const productionPlansApi = {
  getAll: (
    params?: { status?: string; planDate?: string },
    token?: string | null
  ) => {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.planDate) search.set("planDate", params.planDate);
    const qs = search.toString();
    return request<ProductionPlansResponse>(
      `/api/production-plans${qs ? `?${qs}` : ""}`,
      { headers: withAuth(token) }
    );
  },
  getById: (id: string, token?: string | null) =>
    request<ProductionPlanResponse>(`/api/production-plans/${id}`, {
      headers: withAuth(token),
    }),
  updateStatus: (id: string, payload: Partial<ProductionPlan>, token?: string | null) =>
    request<ProductionPlanResponse>(`/api/production-plans/${id}`, {
      method: "PUT",
      headers: withAuth(token),
      body: JSON.stringify(payload),
    }),
  completeItem: (
    planId: string,
    payload: CompleteItemPayload,
    token?: string | null
  ) =>
    request<{
      success: boolean;
      message?: string;
      data?: { productionPlan?: unknown; batch?: unknown };
    }>(`/api/production-plans/${planId}/complete-item`, {
      method: "POST",
      headers: withAuth(token),
      body: JSON.stringify(payload),
    }),
};

export const categoriesApi = {
  getAll: (token?: string | null) =>
    request<CategoriesResponse>("/api/categories", {
      headers: withAuth(token),
    }),
};

export const ingredientBatchesApi = {
  getForIngredient: (
    ingredientId: string,
    params?: { activeOnly?: boolean },
    token?: string | null,
  ) => {
    const search = new URLSearchParams();
    if (params?.activeOnly != null) {
      search.set("activeOnly", String(params.activeOnly));
    }
    const qs = search.toString();
    return request<IngredientBatchesResponse>(
      `/api/ingredients/${ingredientId}/batches${qs ? `?${qs}` : ""}`,
      { headers: withAuth(token) },
    );
  },
  getById: (id: string, token?: string | null) =>
    request<IngredientBatchResponse>(`/api/ingredient-batches/${id}`, {
      headers: withAuth(token),
    }),
  createForIngredient: (
    ingredientId: string,
    payload: {
      supplierId: string;
      batchCode: string;
      initialQuantity: number;
      price: number;
      expiryDate: string; // YYYY-MM-DD
      receivedDate?: string; // YYYY-MM-DD
    },
    token?: string | null,
  ) =>
    request<IngredientBatchResponse>(`/api/ingredients/${ingredientId}/batches`, {
      method: "POST",
      headers: withAuth(token),
      body: JSON.stringify(payload),
    }),
  update: (
    id: string,
    payload: Partial<Pick<IngredientBatch, "currentQuantity" | "price" | "isActive">>,
    token?: string | null,
  ) =>
    request<IngredientBatchResponse>(`/api/ingredient-batches/${id}`, {
      method: "PUT",
      headers: withAuth(token),
      body: JSON.stringify(payload),
    }),
};

export const ingredientUsagesApi = {
  getAll: (
    params?: { productionPlanId?: string },
    token?: string | null,
  ) => {
    const search = new URLSearchParams();
    if (params?.productionPlanId) {
      search.set("productionPlanId", params.productionPlanId);
    }
    const qs = search.toString();
    return request<IngredientUsagesResponse>(
      `/api/ingredient-usages${qs ? `?${qs}` : ""}`,
      { headers: withAuth(token) },
    );
  },
};

export const logisticsOrdersApi = {
  getAll: (params?: { storeId?: string; status?: string }, token?: string | null) => {
    const search = new URLSearchParams();
    if (params?.storeId) search.set("storeId", params.storeId);
    if (params?.status) search.set("status", params.status);
    const qs = search.toString();
    return request<OrdersResponse>(
      `/api/logistics/orders${qs ? `?${qs}` : ""}`,
      { headers: withAuth(token) },
    );
  },
  getById: (id: string, token?: string | null) =>
    request<OrderResponse>(`/api/logistics/orders/${id}`, {
      headers: withAuth(token),
    }),
  create: (payload: CreateOrderPayload, token?: string | null) =>
    request<CreateOrderResponse>("/api/logistics/orders", {
      method: "POST",
      headers: withAuth(token),
      body: JSON.stringify(payload),
    }),
  receive: (orderId: string, token?: string | null) =>
    request<OrderResponse>(`/api/logistics/orders/${orderId}/receive`, {
      method: "POST",
      headers: withAuth(token),
    }),
};

export const deliveryTripsApi = {
  getAll: (params?: { status?: string }, token?: string | null) => {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    const qs = search.toString();
    return request<DeliveryTripsResponse>(
      `/api/logistics/trips${qs ? `?${qs}` : ""}`,
      { headers: withAuth(token) }
    );
  },
  getById: (id: string, token?: string | null) =>
    request<DeliveryTripResponse>(`/api/logistics/trips/${id}`, {
      headers: withAuth(token),
    }),
  startShipping: (id: string, token?: string | null) =>
    request<{ success: boolean; message?: string; data?: unknown }>(
      `/api/logistics/trips/${id}/start-shipping`,
      {
        method: "POST",
        headers: withAuth(token),
      }
    ),
};

export const invoicesApi = {
  getAll: (
    params?: { orderId?: string; storeId?: string; paymentStatus?: string },
    token?: string | null
  ) => {
    const search = new URLSearchParams();
    if (params?.orderId) search.set("orderId", params.orderId);
    if (params?.storeId) search.set("storeId", params.storeId);
    if (params?.paymentStatus) search.set("paymentStatus", params.paymentStatus);
    const qs = search.toString();
    return request<InvoicesResponse>(
      `/api/logistics/invoices${qs ? `?${qs}` : ""}`,
      { headers: withAuth(token) },
    );
  },
  getById: (id: string, token?: string | null) =>
    request<InvoiceResponse>(`/api/logistics/invoices/${id}`, {
      headers: withAuth(token),
    }),
  getByOrder: (orderId: string, token?: string | null) =>
    request<InvoicesResponse>(`/api/logistics/invoices?orderId=${encodeURIComponent(orderId)}`, {
      headers: withAuth(token),
    }),
};

export const paymentApi = {
  createLink: (invoiceId: string, token?: string | null) =>
    request<PaymentLinkResponse>("/api/payment/create-link", {
      method: "POST",
      headers: withAuth(token),
      body: JSON.stringify({ invoiceId }),
    }),
};

/** Feedback API – đánh giá đơn hàng (chỉ khi order status = Received) */
export const feedbackApi = {
  getByOrderId: (orderId: string, token?: string | null) =>
    request<FeedbackResponse>(`/api/feedback/${orderId}`, {
      headers: withAuth(token),
    }),
  create: (orderId: string, payload: CreateFeedbackPayload, token?: string | null) =>
    request<FeedbackResponse>(`/api/feedback/${orderId}`, {
      method: "POST",
      headers: withAuth(token),
      body: JSON.stringify(payload),
    }),
  update: (orderId: string, payload: UpdateFeedbackPayload, token?: string | null) =>
    request<FeedbackResponse>(`/api/feedback/${orderId}`, {
      method: "PUT",
      headers: withAuth(token),
      body: JSON.stringify(payload),
    }),
  delete: (orderId: string, token?: string | null) =>
    request<{ success: boolean; message?: string; data?: Record<string, unknown> }>(
      `/api/feedback/${orderId}`,
      { method: "DELETE", headers: withAuth(token) }
    ),
};

// store endpoints used by client to prefill order recipient fields
export const storeApi = {
  getById: (id: string, token?: string | null) =>
    request<{ success: boolean; data: any }>(`/api/stores/${id}`, {
      headers: withAuth(token),
    }),
};

/** System Settings API – fetch global settings like TAX_RATE and SHIPPING_COST_BASE */
export const systemSettingsApi = {
  getAll: (publicOnly = true, token?: string | null) =>
    request<SystemSettingsResponse>(`/api/system-settings?publicOnly=${publicOnly}`, {
      headers: withAuth(token),
    }),
  getByKey: (key: string, token?: string | null) =>
    request<SystemSettingResponse>(`/api/system-settings/${key}`, {
      headers: withAuth(token),
    }),
};

/** Wallet API – fetch wallet balance and transaction history */
export const walletApi = {
  getByStoreId: (storeId: string, token?: string | null) =>
    request<WalletResponse>(`/api/payment/wallet/${storeId}`, {
      headers: withAuth(token),
    }),
};

export const ingredientRequestsApi = {
  getAll: async (status: string, token: string | undefined | null) => {
    // 1. Khai báo headers chuẩn TypeScript
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // 2. Nếu có token thì nhét thêm vào
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/ingredient-requests?status=${status}`,
      {
        method: "GET",
        headers, 
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Lỗi khi gọi API danh sách yêu cầu");
    }

    return response.json();
  },

  create: async (data: any, token: string | undefined | null) => {
    // Tương tự cho hàm create
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/ingredient-requests`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Lỗi khi tạo yêu cầu mới");
    }

    return response.json();
  },
};
