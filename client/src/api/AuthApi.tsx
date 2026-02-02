import apiclient from './Client';

export interface LoginFormData {
  username: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  password: string;
  fullName: string;
  email: string;
  roleId: string;
  storeId?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: any; 
}


export const authApi = {
  login: (data: LoginFormData) => {

    return apiclient.post('/auth/login', data) as Promise<AuthResponse>;
  },

  register: (data: RegisterFormData) => {
    return apiclient.post('/auth/register', data) as Promise<AuthResponse>;
  },

  getProfile: () => {
    return apiclient.get('/auth/profile') as Promise<AuthResponse>;
  },

  logout: () => {
    return apiclient.post('/auth/logout') as Promise<AuthResponse>;
  }
};