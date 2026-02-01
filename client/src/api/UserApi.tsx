import apiClient from './Client';

// --- INTERFACES ---

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

// Payload khi tạo mới (Create)
export interface CreateUserPayload {
  username: string;
  password: string;
  fullName: string;
  email: string;
  roleId: string;
  storeId?: string;
}

// Payload khi cập nhật (Update) - Dựa theo Swagger
export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  password?: string; // Gửi lên nếu muốn đổi pass, không thì thôi
  roleId?: string;
  storeId?: string | null; // Có thể null nếu chuyển về Kitchen/Admin
  isActive?: boolean; // Để support việc active/inactive user
}

// --- API METHODS ---

export const userApi = {
  // 1. GET ALL USERS
  getAllUsers: async () => {
    // API trả về { success: true, data: User[] }
    const res = await apiClient.get<any>('/users');
    // Trả về mảng data bên trong
    return res.data || [];
  },

  // 2. GET ALL ROLES
getAllRoles: async () => {
    const res = await apiClient.get<any>('/roles');
    
    // LOGIC AN TOÀN:
    // Kiểm tra xem res.data có phải là mảng không? Nếu đúng -> return luôn
    if (Array.isArray(res.data)) return res.data;
    
    // Nếu res.data là object và có thuộc tính .data là mảng -> return res.data.data
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    
    // Nếu apiClient trả về trực tiếp response object (không qua interceptor)
    if (Array.isArray(res)) return res;

    // Không tìm thấy mảng -> trả về rỗng để tránh lỗi
    return []; 
  },

  // 3. CREATE USER
  createUser: async (payload: CreateUserPayload) => {
    const res = await apiClient.post('/users', payload);
    return res.data;
  },

  // 4. UPDATE USER (Thay thế cho updateUserRole và updateUserStatus cũ)
  // Gọi vào PUT /api/users/{id}
  updateUser: async (id: string, payload: UpdateUserPayload) => {
    const res = await apiClient.put(`/users/${id}`, payload);
    return res.data;
  },

  // 5. UPDATE STATUS (Dùng hàm update chung luôn hoặc làm riêng nếu thích)
  // Trong UI bạn có nút toggle status, ta tái sử dụng hàm updateUser ở trên
  updateUserStatus: async (id: string, isActive: boolean) => {
    // Gọi PUT /users/{id} chỉ với field isActive
    const res = await apiClient.put(`/users/${id}`, { isActive });
    return res.data;
  }
};