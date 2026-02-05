// User role types - matching backend enum
export type UserRole = 
  | 'Admin' 
  | 'Manager' 
  | 'KitchenStaff' 
  | 'StoreStaff' 
  | 'Coordinator';

// Role-based route mapping
export const ROLE_ROUTES: Record<UserRole, string> = {
  'Admin': '/admin/dashboard',
  'Manager': '/manager/dashboard',
  'KitchenStaff': '/kitchen/dashboard',
  'StoreStaff': '/store/dashboard',
  'Coordinator': '/coordinator/dashboard',
};

// API Response types - matching backend response
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  password: string;
  fullName: string;
  email: string;
  roleId: string;
  storeId?: string | null; // Required for StoreStaff, null for others
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  storeId: string | null;
  storeName: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface Role {
  _id: string;
  roleName: UserRole;
}

export interface Store {
  _id: string;
  storeName: string;
  address: string;
  phone?: string;
  status: boolean;
}

// UI State types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}
export interface RegisterResponse {
  success: boolean;
  message: string;
  data?: User;
}