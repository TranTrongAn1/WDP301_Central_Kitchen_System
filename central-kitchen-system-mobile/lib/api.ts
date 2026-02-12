import type { LoginResponse, MeResponse } from "@/lib/auth";
import type { CategoriesResponse } from "@/lib/categories";
import { API_BASE_URL } from "@/lib/env";
import type {
  Ingredient,
  IngredientResponse,
  IngredientsResponse,
} from "@/lib/ingredients";
import type {
  CreateOrderPayload,
  OrderResponse,
  OrdersResponse,
} from "@/lib/orders";
import type { StoreInventoryResponse } from "@/lib/inventory";
import type { Product, ProductsResponse } from "@/lib/products";
import type {
  ProductionPlanResponse,
  ProductionPlansResponse,
} from "@/lib/production-plans";
import { getApiErrorHandlers } from "@/lib/api-error-handler";

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
  updateStatus: (id: string, status: string, token?: string | null) =>
    request<ProductionPlanResponse>(`/api/production-plans/${id}`, {
      method: "PATCH",
      headers: withAuth(token),
      body: JSON.stringify({ status }),
    }),
  completeItem: (
    planId: string,
    payload: { productId: string; actualQuantity: number },
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
    request<OrderResponse>("/api/logistics/orders", {
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
