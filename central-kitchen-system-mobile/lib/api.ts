import { API_BASE_URL } from '@/lib/env';
import type { LoginResponse, MeResponse } from '@/lib/auth';

type ApiError = {
  success: false;
  message?: string;
};

const buildUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(buildUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const data = (await response.json()) as T | ApiError;

  if (!response.ok) {
    const message =
      (data as ApiError).message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
};

export const authApi = {
  login: (payload: { username: string; password: string }) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  me: (token: string) =>
    request<MeResponse>('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
};
