import apiClient from './Client';
import type { DeliveryTrip } from '@/shared/types/logistics';

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

interface StartShippingResponseData {
  trip: DeliveryTrip;
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
    options?: { notes?: string; vehicleTypeId?: string; plannedShipDate?: string }
  ): Promise<LogisticsApiResponse<CreateTripResponseData>> => {
    const body: Record<string, unknown> = { orderIds };
    if (options?.notes != null && options.notes.trim() !== '') body.notes = options.notes.trim().slice(0, 500);
    if (options?.vehicleTypeId) body.vehicleTypeId = options.vehicleTypeId;
    if (options?.plannedShipDate) body.plannedShipDate = options.plannedShipDate;
    const res = await apiClient.post('/logistics/trips/create', body);
    return res as unknown as LogisticsApiResponse<CreateTripResponseData>;
  },

  deleteDeliveryTrip: async (id: string): Promise<LogisticsApiResponse<null>> => {
    const res = await apiClient.delete(`/logistics/trips/${id}`);
    return res as unknown as LogisticsApiResponse<null>;
  },

  addOrdersToDeliveryTrip: async (tripId: string, orderIds: string[]) => {
    const res = await apiClient.patch(`/logistics/trips/${tripId}/add-orders`, { orderIds });
    return res as unknown as LogisticsApiResponse<AddOrdersResponseData>;
  },

  removeOrdersFromDeliveryTrip: async (tripId: string, orderIds: string[]) => {
    const res = await apiClient.patch(`/logistics/trips/${tripId}/remove-orders`, { orderIds });
    return res as unknown as LogisticsApiResponse<RemoveOrdersResponseData>;
  },

  startShipping: async (tripId: string) => {
    const res = await apiClient.post(`/logistics/trips/${tripId}/start-shipping`);
    return res as unknown as LogisticsApiResponse<StartShippingResponseData>;
  },
};

export default DeliveryTripApi;