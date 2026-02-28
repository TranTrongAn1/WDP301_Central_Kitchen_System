export type OrderStatus = 'Pending' | 'Approved' | 'In_Transit' | 'Received' | 'Cancelled';
export type TripStatus = 'Planning' | 'Pending' | 'In_Transit' | 'Completed' | 'Cancelled';

export interface StoreRef {
  _id: string;
  storeName: string;
  storeCode?: string;
  address?: string;
}

export interface UserRef {
  _id: string;
  fullName?: string;
  email?: string;
}

export interface ProductRef {
  _id: string;
  name: string;
  sku?: string;
  price?: number;
}

export interface OrderItem {
  productId: ProductRef | string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  batchId?: string;
}

export interface LogisticsOrder {
  _id: string;
  orderCode: string;
  storeId: StoreRef | string;
  createdBy: UserRef | string;
  status: OrderStatus;
  requestedDeliveryDate: string;
  items: OrderItem[];
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripOrderRef {
  _id: string;
  orderCode: string;
  storeId: { storeName?: string; storeCode?: string; address?: string };
  items?: Array<{
    productId: { name?: string; sku?: string };
    quantity: number;
    batchId?: string | { batchCode?: string; mfgDate?: string; expDate?: string };
  }>;
}

export interface DeliveryTrip {
  _id: string;
  tripCode: string;
  orders: TripOrderRef[] | string[];
  status: TripStatus;
  completedTime: string | null;
  notes?: string;
  departureTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripRequest {
  orderIds: string[];
  notes?: string;
}

export interface AddOrdersToTripRequest {
  orderIds: string[];
}

export interface RemoveOrdersFromTripRequest {
  orderIds: string[];
}
