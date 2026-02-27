export type InvoicePaymentStatus =
  | "Pending"
  | "Partial"
  | "Paid"
  | "Overdue"
  | "Cancelled";

export type Invoice = {
  _id: string;
  invoiceNumber: string;
  orderId: string;
  storeId: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount: number;
  paymentStatus: InvoicePaymentStatus;
  paidAmount?: number;
  paymentDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type InvoicesResponse = {
  success: boolean;
  data: Invoice[];
};

export type InvoiceResponse = {
  success: boolean;
  data: Invoice;
};

export type PaymentLinkResponse = {
  success: boolean;
  message?: string;
  data?: {
    checkoutUrl?: string;
    qrCode?: string;
    orderCode?: number;
    amount?: number;
    invoiceNumber?: string;
  };
};

