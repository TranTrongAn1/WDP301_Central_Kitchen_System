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
  paymentMethod: 'Wallet' | 'PayOS' | 'Cash';
  amount: number;
  paymentNotes?: string;
}

export const invoiceApi = {
  /** GET /api/logistics/invoices?orderId=... - Lấy invoice đầu tiên theo orderId */
  getFirstByOrderId: async (orderId: string): Promise<Invoice | null> => {
    const res = (await apiClient.get('/logistics/invoices', {
      params: { orderId },
    })) as { success?: boolean; data?: Invoice[] } | Invoice[];

    const list =
      res && typeof res === 'object' && 'data' in res
        ? ((res as { data?: Invoice[] }).data as Invoice[] | undefined) ?? []
        : (res as Invoice[]) ?? [];

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
    const body = res as { success?: boolean; message?: string } | undefined;
    return body?.success
      ? { success: true }
      : { success: false, message: body?.message };
  },

  payWithWalletForInvoice: async (invoiceId: string): Promise<InvoicePaymentResult> => {
    await paymentApi.payWithWallet({ invoiceId });
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

    const typed =
      (res as { data?: { checkoutUrl?: string; checkout_url?: string }; checkoutUrl?: string }) ||
      {};
    const url =
      typed.data?.checkoutUrl ??
      typed.data?.checkout_url ??
      typed.checkoutUrl ??
      null;
    return url;
  },
};

