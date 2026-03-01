import apiClient from './Client';
import type { DeliveryTrip, CreateTripRequest } from '@/shared/types/logistics';

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

  getDeliveryTripById: async (id: string): Promise<LogisticsApiResponse<DeliveryTrip>> => {
    const res = await apiClient.get(`/logistics/trips/${id}`);
    return res as unknown as LogisticsApiResponse<DeliveryTrip>;
  },

  createDeliveryTrip: async (
    orderIds: string[],
    notes?: string
  ): Promise<LogisticsApiResponse<{ trip: DeliveryTrip; totalOrders: number }>> => {
    const body: CreateTripRequest = { orderIds };
    if (notes != null && notes.trim() !== '') body.notes = notes.trim().slice(0, 500);
    const res = await apiClient.post('/logistics/trips/create', body);
    return res as unknown as LogisticsApiResponse<CreateTripResponseData>;
  },

  addOrdersToDeliveryTrip: async (
    tripId: string,
    orderIds: string[]
  ): Promise<LogisticsApiResponse<AddOrdersResponseData>> => {
    const res = await apiClient.patch(`/logistics/trips/${tripId}/add-orders`, { orderIds });
    return res as unknown as LogisticsApiResponse<AddOrdersResponseData>;
  },

  removeOrdersFromDeliveryTrip: async (
    tripId: string,
    orderIds: string[]
  ): Promise<LogisticsApiResponse<RemoveOrdersResponseData>> => {
    const res = await apiClient.patch(`/logistics/trips/${tripId}/remove-orders`, { orderIds });
    return res as unknown as LogisticsApiResponse<RemoveOrdersResponseData>;
  },

  finalizeTrip: async (tripId: string): Promise<LogisticsApiResponse<FinalizeResponseData>> => {
    const res = await apiClient.post(`/logistics/trips/${tripId}/finalize`);
    return res as unknown as LogisticsApiResponse<FinalizeResponseData>;
  },
};

export default DeliveryTripApi;
