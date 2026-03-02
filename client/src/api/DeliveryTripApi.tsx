import apiClient from './Client';
import type { DeliveryTrip, CreateTripRequest } from '@/shared/types/logistics';
interface ExtendedCreateTripRequest extends CreateTripRequest {
  vehicleTypeId: string;
}
export interface LogisticsApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  count?: number;
}

interface CreateTripResponseData {
  trip: DeliveryTrip;
  totalOrders: number;
}
interface AddOrdersResponseData {
  trip: DeliveryTrip;
  ordersAdded: number;
  duplicatesSkipped?: number;
}

interface RemoveOrdersResponseData {
  trip: DeliveryTrip;
  ordersRemoved: number;
  ordersUpdated?: number;
  remainingOrders?: number;
}

interface FinalizeResponseData {
  trip: DeliveryTrip;
  ordersUpdated?: number;
  shippedDate?: string;
  totalOrders?: number;
}

export type ITrip = DeliveryTrip;

const DeliveryTripApi = {
  getAllDeliveryTrips: async (): Promise<LogisticsApiResponse<DeliveryTrip[]>> => {
    const res = await apiClient.get('/logistics/trips');
    return res as unknown as LogisticsApiResponse<DeliveryTrip[]>;
  },

  // THÊM: Tạo chuyến hàng với VehicleType
  createDeliveryTrip: async (
    orderIds: string[],
    notes?: string,
    vehicleTypeId?: string // Thêm tham số này
  ): Promise<LogisticsApiResponse<CreateTripResponseData>> => {
    const body: any = { orderIds };
    if (notes != null && notes.trim() !== '') body.notes = notes.trim().slice(0, 500);
    if (vehicleTypeId) body.vehicleTypeId = vehicleTypeId; // Đính kèm vehicleTypeId vào body

    const res = await apiClient.post('/logistics/trips/create', body);
    return res as unknown as LogisticsApiResponse<CreateTripResponseData>;
  },

  // THÊM: API Xóa Trip (Thường là DELETE /logistics/trips/:id)
  deleteDeliveryTrip: async (id: string): Promise<LogisticsApiResponse<null>> => {
    const res = await apiClient.delete(`/logistics/trips/${id}`);
    return res as unknown as LogisticsApiResponse<null>;
  },

  // ... các hàm khác giữ nguyên ...
  addOrdersToDeliveryTrip: async (tripId: string, orderIds: string[]) => {
    const res = await apiClient.patch(`/logistics/trips/${tripId}/add-orders`, { orderIds });
    return res as unknown as LogisticsApiResponse<AddOrdersResponseData>;
  },

  removeOrdersFromDeliveryTrip: async (tripId: string, orderIds: string[]) => {
    const res = await apiClient.patch(`/logistics/trips/${tripId}/remove-orders`, { orderIds });
    return res as unknown as LogisticsApiResponse<RemoveOrdersResponseData>;
  },

  finalizeTrip: async (tripId: string) => {
    const res = await apiClient.post(`/logistics/trips/${tripId}/finalize`);
    return res as unknown as LogisticsApiResponse<FinalizeResponseData>;
  },
};

export default DeliveryTripApi;
