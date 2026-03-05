import apiClient from './Client';

// --- INTERFACES ---
export interface Role {
  _id: string;
  roleName: string;
}

export interface User {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  roleId: {
    _id: string;
    roleName: string;
  };
  isActive: boolean;
  storeId: any;
  createdAt: string;
}
// Payload for creating new user
export interface CreateUserPayload {
  username: string;
  password: string;
  fullName: string;
  email: string;
  roleId: string;
  storeId?: string;
}

// Payload for updating user
export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  password?: string;
  roleId?: string;
  storeId?: string | null;
  isActive?: boolean;
}

// --- API METHODS ---

export const userApi = {
  getAllUsers: async (): Promise<User[]> => {
    const res = await apiClient.get<any>('/users');
    if (Array.isArray(res?.data)) return res.data;
    if (res?.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  getById: async (id: string): Promise<User | null> => {
    try {
      const res = await apiClient.get<any>(`/users/${id}`);
      return res?.data ?? res ?? null;
    } catch {
      return null;
    }
  },

  getAllRoles: async (): Promise<Role[]> => {
    const res = await apiClient.get<any>('/roles');
    if (Array.isArray(res?.data)) return res.data;
    if (res?.data && Array.isArray(res.data.data)) return res.data.data;
    if (Array.isArray(res)) return res;
    return [];
  },

  // 3. CREATE USER
  createUser: async (payload: CreateUserPayload) => {
    const res = await apiClient.post('/users', payload);
    return res.data;
  },

  // 4. UPDATE USER
  updateUser: async (id: string, payload: UpdateUserPayload) => {
    const res = await apiClient.put(`/users/${id}`, payload);
    return res.data;
  },

  updateUserStatus: async (id: string, isActive: boolean) => {
    const res = await apiClient.put(`/users/${id}`, { isActive });
    return res.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};