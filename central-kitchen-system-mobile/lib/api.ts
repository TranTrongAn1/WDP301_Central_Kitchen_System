import type { LoginResponse, MeResponse } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/env";
import type {
  Ingredient,
  IngredientResponse,
  IngredientsResponse,
} from "@/lib/ingredients";
import type { Product, ProductsResponse } from "@/lib/products";

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
  const response = await fetch(buildUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const data = (await response.json()) as T | ApiError;

  if (!response.ok) {
    const message =
      (data as ApiError).message ??
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
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
    request<{ success: boolean; data: unknown[] }>(
      `/api/inventory/store/${storeId}`,
      {
        headers: withAuth(token),
      },
    ),
};
