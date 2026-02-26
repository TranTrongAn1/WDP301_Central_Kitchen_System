import apiClient from './Client';

export interface OrderItem {
  productId: string | { _id: string; name: string; price: number }; 
  quantity: number;
  price?: number; 
  _id?: string;
}

export interface Order {
  _id: string;
  orderCode: string; 
  storeId: string; 
  createdBy: string; 
  
  status: 'Pending' | 'Approved' | 'Shipped' | 'Received' | 'Cancelled';
  
  items: OrderItem[];
  totalAmount: number; 
  notes?: string;      
  
  requestedDeliveryDate: string; 
  createdAt: string;
  updatedAt: string;
}

export interface OrderQueryParams {
  status?: string;
  storeId?: string;
}

interface OrderListResponse {
  success: boolean;
  data: Order[]; 
  message?: string;
}

export const OrderApi = {
  getAllOrders: async (params?: OrderQueryParams): Promise<Order[]> => {
    try {
      const response = await apiClient.get('/logistics/orders', {
        params, 
      }) as unknown as OrderListResponse;
      
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