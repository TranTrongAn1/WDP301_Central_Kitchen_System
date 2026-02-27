import apiClient from './Client';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface IOrderItem {
  productId: string;
  quantityRequested: number;
  quantity: number;
  batchId: string;
  unitPrice: number;
  subtotal: number;
}

export interface IOrder {
  _id: string;
  orderNumber: string;
  storeId: string;
  orderDate: string;
  requestedDeliveryDate: string;
  items: IOrderItem[];
  totalAmount: number;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ITrip {
  _id: string;
  orders: string[]; 
  status: 'Planning' | 'In_Transit' | 'Completed' | 'Cancelled';
  completedTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripData {
  trip: ITrip;
  orders: IOrder[]; 
}

const DeliveryTripApi = {
  getAllDeliveryTrips: async (): Promise<ApiResponse<ITrip[]>> => {
    const response = await apiClient.get('/logistics/delivery-trips');
    return response as any;
  },

  getDeliveryTripById: async (id: string): Promise<ApiResponse<ITrip>> => {
    const response = await apiClient.get(`/logistics/delivery-trips/${id}`);
    return response as any; 
  },

  createDeliveryTrip: async (orderIds: string[]): Promise<ApiResponse<CreateTripData>> => {
    const response = await apiClient.post('/logistics/trips/create', { orderIds });
    return response as any; 
  },

  addOrdersToDeliveryTrip: async (tripId: string, orderIds: string[]): Promise<ApiResponse<ITrip>> => {
    const response = await apiClient.patch(`/logistics/trips/${tripId}/add-orders`, { orderIds });
    return response as any; 
  },

  removeOrdersFromDeliveryTrip: async (tripId: string, orderIds: string[]): Promise<ApiResponse<ITrip>> => {
    const response = await apiClient.patch(`/logistics/trips/${tripId}/remove-orders`, { orderIds });
    return response as any; 
  },

  finalizeTrip: async (tripId: string): Promise<ApiResponse<ITrip>> => {
    const response = await apiClient.post(`/logistics/trips/${tripId}/finalize`);
    return response as any; 
  }
};

export default DeliveryTripApi;