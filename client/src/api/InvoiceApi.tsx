import apiClient from './Client';
import { paymentApi } from './PaymentApi';

export interface InvoicePaymentResult {
  success: boolean;
  message?: string;
}

export interface RecordInvoicePaymentPayload {
  method: 'Wallet' | 'PayOS' | 'Cash';
  amount: number;
}

export const invoiceApi = {
  /** POST /api/logistics/invoices/:id/payment - Ghi nhận thanh toán (Wallet/PayOS/Cash) */
  recordPayment: async (invoiceId: string, payload: RecordInvoicePaymentPayload): Promise<InvoicePaymentResult> => {
    const res = await apiClient.post(`/logistics/invoices/${invoiceId}/payment`, payload);
    return (res as any)?.success ? { success: true } : { success: false, message: (res as any)?.message };
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

