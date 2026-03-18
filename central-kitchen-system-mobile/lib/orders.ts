import type { Invoice } from "./invoices";

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
  storeId:
  | string
  | {
    _id: string;
    name?: string;
    storeName?: string;
    storeCode?: string;
    address?: string;
  };
  orderDate: string;
  requestedDeliveryDate: string;
  recipientPhone?: string;
  recipientName?: string;
  address?: string;
  items: OrderItem[];
  totalAmount: number;
  status:
  | "Pending"
  | "Awaiting_Payment"
  | "Payment_Failed"
  | "Approved"
  | "Transferred_To_Kitchen"
  | "Ready_For_Shipping"
  | "In_Transit"
  | "Received"
  | "Cancelled";
  paymentMethod?: "Wallet" | "PayOS" | "Bank_Transfer" | "Cash" | "Other" | string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type OrdersResponse = {
  success: boolean;
  data: Order[];
};

// the response returned by Most GET endpoints
export type OrderResponse = {
  success: boolean;
  data: Order;
};

export type WalletPaymentResult = {
  amountPaid: number;
  newBalance: number;
  transactionId: string;
  walletId: string;
};

// data returned inside the `data` field when an order is created
export type CreateOrderData = {
  order: Order;
  invoice?: Invoice;
  walletPayment?: WalletPaymentResult;
};

export type CreateOrderResponse = {
  success: boolean;
  message?: string;
  data: CreateOrderData;
};

export type CreateOrderPayload = {
  storeId: string;
  requestedDeliveryDate: string; // YYYY-MM-DD
  recipientName?: string; // optional client-side, server may require
  recipientPhone?: string;
  address?: string;
  items: { productId: string; quantityRequested: number }[];
  notes?: string;
  paymentMethod: "Cash" | "Bank_Transfer" | "Credit_Card" | "Check" | "Wallet" | "Other";
};
