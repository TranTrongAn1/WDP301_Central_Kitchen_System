export interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  avatar?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  user: User;
}
