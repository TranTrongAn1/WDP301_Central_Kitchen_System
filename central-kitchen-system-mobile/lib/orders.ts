/** Order & order item from /api/logistics/orders */
export type OrderItem = {
  productId: string | { _id: string; name?: string; price?: number };
  quantityRequested: number;
  quantity?: number;
  unitPrice?: number;
  subtotal?: number;
};

export type Order = {
  _id: string;
  orderNumber: string;
  storeId: string | { _id: string; name?: string };
  orderDate: string;
  requestedDeliveryDate: string;
  items: OrderItem[];
  totalAmount: number;
  status: "Pending" | "Approved" | "Shipped" | "Received" | "Cancelled";
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type OrdersResponse = {
  success: boolean;
  data: Order[];
};

export type OrderResponse = {
  success: boolean;
  data: Order;
};

export type CreateOrderPayload = {
  storeId: string;
  requestedDeliveryDate: string; // YYYY-MM-DD
  items: { productId: string; quantityRequested: number }[];
  notes?: string;
};
