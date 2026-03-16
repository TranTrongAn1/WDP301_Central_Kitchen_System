import apiClient from './Client';

export interface WalletTransaction {
  _id: string;
  amount: number;
  type: 'Deposit' | 'Withdrawal' | 'Refund' | 'Payment';
  description?: string;
  orderId?: string;
  createdAt: string;
}

export interface WalletInfo {
  id: string;
  storeId: string;
  balance: number;
  status: 'Active' | 'Locked';
  currency?: string;
  transactions?: WalletTransaction[];
}

export interface DepositRequest {
  storeId: string;
  amount: number;
  description?: string;
}

export interface PayWithWalletRequest {
  invoiceId: string;
}

export interface CreatePayOSLinkRequest {
  invoiceId: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CreateDepositLinkRequest {
  storeId: string;
  amount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const BASE = '/payment';

export const paymentApi = {
  getWallet: async (storeId: string): Promise<WalletInfo | null> => {
    const res = (await apiClient.get(`${BASE}/wallet/${storeId}`)) as
      | ApiResponse<{ wallet: { id: string; storeId: string; balance: number; status: 'Active' | 'Locked'; currency?: string }; transactions?: WalletTransaction[] }>
      | { wallet: { id: string; storeId: string; balance: number; status: 'Active' | 'Locked'; currency?: string }; transactions?: WalletTransaction[] }
      | null;

    const data = res && typeof res === 'object' && 'data' in res ? (res as any).data : res;
    if (!data || typeof data !== 'object') return null;

    const wallet = (data as any).wallet;
    const transactions = (data as any).transactions as WalletTransaction[] | undefined;
    if (!wallet || typeof wallet.balance !== 'number') return null;

    return {
      id: wallet.id,
      storeId: wallet.storeId,
      balance: wallet.balance,
      status: wallet.status,
      currency: wallet.currency,
      transactions: Array.isArray(transactions) ? transactions : undefined,
    };
  },

  /** Admin top-up ví store: POST /api/payment/deposit */
  deposit: (payload: DepositRequest) =>
    apiClient.post<ApiResponse<{ wallet: WalletInfo; transaction: WalletTransaction }>>(
      `${BASE}/deposit`,
      payload
    ),

  /** Thanh toán invoice bằng ví: POST /api/payment/pay-with-wallet */
  payWithWallet: (payload: PayWithWalletRequest) =>
    apiClient.post<ApiResponse<unknown>>(`${BASE}/pay-with-wallet`, payload),

  /** Tạo PayOS link cho invoice: POST /api/payment/create-link */
  createPayOSLink: (payload: CreatePayOSLinkRequest) =>
    apiClient.post<ApiResponse<{ checkoutUrl: string; qrCode?: string }>>(
      `${BASE}/create-link`,
      payload
    ),

  /** Tạo PayOS link nạp ví: POST /api/payment/deposit-link */
  createDepositLink: (payload: CreateDepositLinkRequest) =>
    apiClient.post<
      ApiResponse<{ checkoutUrl: string; qrCode: string; amount: number; storeId: string }>
    >(`${BASE}/deposit-link`, payload),
};

