import apiClient from './Client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ApiResponse,
  User,
} from '@/shared/types/auth';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post('/auth/login', data) as Promise<LoginResponse>,

  register: (data: RegisterRequest) =>
    apiClient.post('/auth/register', data) as Promise<ApiResponse<User>>,

  getCurrentUser: () =>
    apiClient.get('/auth/me') as Promise<ApiResponse<User>>,

  logout: () =>
    apiClient.post('/auth/logout') as Promise<ApiResponse<null>>,
};