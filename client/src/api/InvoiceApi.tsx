import apiClient from './Client';
import { paymentApi } from './PaymentApi';

export interface Invoice {
  _id: string;
  orderId: string;
  storeId?: string;
  invoiceNumber?: string;
  paymentStatus?: string;
  subtotal?: number;
  paidAmount?: number;
}

export interface InvoicePaymentResult {
  success: boolean;
  message?: string;
}

export interface RecordInvoicePaymentPayload {
  method: 'Wallet' | 'PayOS' | 'Cash';
  amount: number;
}

export const invoiceApi = {
  /** GET /api/logistics/invoices?orderId=... - Lấy invoice đầu tiên theo orderId */
  getFirstByOrderId: async (orderId: string): Promise<Invoice | null> => {
    const res = (await apiClient.get('/logistics/invoices', {
      params: { orderId },
    })) as { success?: boolean; data?: Invoice[] } | Invoice[];

    const list =
      res && typeof res === 'object' && 'data' in res
        ? ((res as any).data as Invoice[])
        : ((res as any) as Invoice[]) ?? [];

    if (!Array.isArray(list) || list.length === 0) return null;
    return list[0] ?? null;
  },

  /** POST /api/logistics/invoices/:id/payment - Ghi nhận thanh toán (Wallet/PayOS/Cash) */
  recordPayment: async (
    invoiceId: string,
    payload: RecordInvoicePaymentPayload
  ): Promise<InvoicePaymentResult> => {
    const res = await apiClient.post(
      `/logistics/invoices/${invoiceId}/payment`,
      payload
    );
    return (res as any)?.success
      ? { success: true }
      : { success: false, message: (res as any)?.message };
  },

  payWithWalletForInvoice: async (
    invoiceId: string,
    storeId: string,
    amount: number
  ): Promise<InvoicePaymentResult> => {
    await paymentApi.payWithWallet({
      storeId,
      invoiceId,
      amount,
    });
    return { success: true };
  },

  createPayOSLinkForInvoice: async (
    invoiceId: string,
    returnUrl: string,
    cancelUrl: string
  ): Promise<string | null> => {
    const res = await paymentApi.createPayOSLink({
      invoiceId,
      returnUrl,
      cancelUrl,
    });

    const url =
      (res as any)?.data?.checkoutUrl ??
      (res as any)?.data?.checkout_url ??
      (res as any)?.checkoutUrl ??
      null;
    return url;
  },
};

