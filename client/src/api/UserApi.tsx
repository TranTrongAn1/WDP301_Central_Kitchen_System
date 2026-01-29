import apiClient from './Client';

// --- CÁC INTERFACE (Giữ nguyên) ---
export interface User {
  _id: string;
  username: string;
  email: string;
  fullName: string;
  roleId: { _id: string; roleName: string; };
  storeId?: { _id: string; storeName: string; address?: string; phone?: string; };
  isActive: boolean;
}

export interface Role {
  _id: string;
  roleName: string;
}

export interface Store {
  _id: string;
  name: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  fullName: string;
  email: string;
  roleId: string;
  storeId?: string;
}

export const userApi = {
  // 1. GET USERS
  getAllUsers: async () => {
    // TypeScript nghĩ đây là AxiosResponse, nhưng thực tế Runtime là { success, data }
    const res = await apiClient.get<{ success: boolean, data: User[] }>('/users');
    
    // Runtime: res.data chính là mảng User[]
    // TypeScript: res.data là object Body -> Ép kiểu về User[]
    return res.data as unknown as User[];
  },

  // 2. CREATE USER
  createUser: async (payload: CreateUserPayload) => {
    const res = await apiClient.post('/users', payload);
    return res;
  },

  // 3. GET ROLES (Sửa lỗi length ở đây)
  getAllRoles: async () => {
    const res = await apiClient.get<Role[]>('/roles');
    // Ép kiểu: "res" thực tế là mảng Role[]
    return res as unknown as Role[];
  },

  // 4. GET STORES (Sửa lỗi tương tự)
  getAllStores: async () => {
    const res = await apiClient.get<Store[]>('/stores');
    // Ép kiểu: "res" thực tế là mảng Store[]
    return res as unknown as Store[];
  },

  // ... Các hàm update khác
  updateUserRole: async (userId: string, roleId: string) => {
    const res = await apiClient.put(`/users/${userId}/role`, { roleId });
    return res;
  },

  updateUserStatus: async (userId: string, isActive: boolean) => {
    const res = await apiClient.put(`/users/${userId}/status`, { isActive });
    return res;
  }
};