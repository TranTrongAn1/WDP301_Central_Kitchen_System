import apiClient from './Client'; 

// --- Interfaces ---

export interface VehicleType {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  capacity?: number;
  unit?: 'kg' | 'ton' | 'box';
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleTypeInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}

// --- API Functions ---

const vehicleApi = {
  /**
   * Lấy danh sách tất cả loại xe
   * @access Private (Admin / Manager)
   */
  getAll: (): Promise<ApiResponse<VehicleType[]>> => {
    return apiClient.get('/vehicle-types');
  },

  /**
   * Lấy chi tiết một loại xe theo ID
   * @access Private
   */
  getById: (id: string): Promise<ApiResponse<VehicleType>> => {
    return apiClient.get(`/vehicle-types/${id}`);
  },

  /**
   * Tạo mới loại xe
   * @access Admin
   */
  create: (data: VehicleTypeInput): Promise<ApiResponse<VehicleType>> => {
    return apiClient.post('/vehicle-types', data);
  },

  /**
   * Cập nhật thông tin loại xe
   * @access Admin
   */
  update: (id: string, data: Partial<VehicleTypeInput>): Promise<ApiResponse<VehicleType>> => {
    return apiClient.put(`/vehicle-types/${id}`, data);
  },

  /**
   * Xóa loại xe (Soft delete - Deactivate)
   * @access Admin
   */
  delete: (id: string): Promise<ApiResponse<null>> => {
    return apiClient.delete(`/vehicle-types/${id}`);
  },
};

export default vehicleApi;