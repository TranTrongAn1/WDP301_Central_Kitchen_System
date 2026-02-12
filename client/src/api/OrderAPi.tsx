import apiClient from './Client';

// 1. Định nghĩa Type cho Item trong giỏ hàng (Dựa trên cấu trúc thường thấy của MERN)
export interface OrderItem {
  productId: string | { _id: string; name: string; price: number }; // Có thể là ID hoặc Object nếu backend populate
  quantity: number;
  price?: number; // Giá tại thời điểm đặt
  _id?: string;
}

// 2. Định nghĩa Type cho Order (Map chuẩn theo ảnh Database image_5ec1d7.png)
export interface Order {
  _id: string;
  orderCode: string; // VD: "ORD-20260210-3304"
  storeId: string;   // ObjectId của Store
  createdBy: string; // ObjectId của User tạo đơn
  
  status: 'Pending' | 'Approved' | 'Shipped' | 'Received' | 'Cancelled';
  
  items: OrderItem[];
  totalAmount: number; // VD: 5700000
  notes?: string;      // VD: "Urgent order..."
  
  requestedDeliveryDate: string; // ISO Date
  createdAt: string;
  updatedAt: string;
}

// 3. Định nghĩa Params để lọc (Dựa theo Swagger image_5ebaca.png)
export interface OrderQueryParams {
  status?: string;
  storeId?: string;
}

// 4. Interface cho Response trả về (Thường backend sẽ bọc trong data)
interface OrderListResponse {
  success: boolean;
  data: Order[]; // Backend thường trả về { success: true, data: [...] }
  message?: string;
}

export const OrderApi = {
  getAllOrders: async (params?: OrderQueryParams): Promise<Order[]> => {
    try {
      // FIX: Thêm "as unknown as OrderListResponse" để báo TS biết đây là cục data đã xử lý
      const response = await apiClient.get('/logistics/orders', {
        params, 
      }) as unknown as OrderListResponse;
      
      // Bây giờ lấy .data sẽ ra mảng Order[] đúng ý
      return response.data || []; 
    } catch (error) {
      console.error("Get All Orders Error:", error);
      throw error;
    }
  },


  getOrderById: async (id: string): Promise<Order> => {
    const response = await apiClient.get<any>(`/logistics/orders/${id}`);
    return response.data;
  }
};