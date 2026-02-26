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
  status: 'Pending' | 'In_Transit' | 'Completed' | 'Cancelled';
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
    const response = await apiClient.get<ApiResponse<ITrip[]>>('/logistics/delivery-trips');
    return response.data;
  },

  getDeliveryTripById: async (id: string): Promise<ApiResponse<ITrip>> => {
    const response = await apiClient.get<ApiResponse<ITrip>>(`/logistics/delivery-trips/${id}`);
    return response.data;
  },

  createDeliveryTrip: async (orderIds: string[]): Promise<ApiResponse<CreateTripData>> => {
    const response = await apiClient.post<ApiResponse<CreateTripData>>('/logistics/trips/create', {
      orderIds
    });
    return response.data;
  }
};

export default DeliveryTripApi;