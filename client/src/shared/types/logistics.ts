export type OrderStatus =
  | 'Pending'
  | 'Approved'
  | 'In_Transit'
  | 'Received'
  | 'Cancelled';

export type TripStatus =
  | 'Planning'
  | 'Pending'
  | 'Transferred_To_Kitchen'
  | 'ReadyForShipping'
  | 'Ready_For_Shipping'
  | 'Ready for shipping'
  | 'In_Transit'
  | 'Completed'
  | 'Cancelled';

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
  quantityRequested?: number;
  approvedQuantity?: number;
  receivedQuantity?: number;
  discrepancyReason?: 'Missing' | 'Damaged' | 'Other' | string;
  discrepancyImageURL?: string;
  note?: string;
}

export interface LogisticsOrder {
  _id: string;
  orderCode: string;
  orderNumber?: string;
  storeId: StoreRef | string;
  createdBy: UserRef | string;
  status: OrderStatus;
  requestedDeliveryDate: string;
  items: OrderItem[];
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  receivedDate?: string;
  // Optional fields used in store flows
  recipientName?: string;
  recipientPhone?: string;
  address?: string;
  paymentMethod?: 'Wallet' | 'Other' | string;
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
