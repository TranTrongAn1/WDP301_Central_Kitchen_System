import { paymentApi } from './PaymentApi';

export interface InvoicePaymentResult {
  success: boolean;
  message?: string;
}

export const invoiceApi = {
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

