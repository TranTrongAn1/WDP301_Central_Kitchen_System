import apiClient from './Client';

export interface WalletTransaction {
  _id: string;
  amount: number;
  type: 'Deposit' | 'Payment' | 'Adjustment';
  description?: string;
  orderId?: string;
  createdAt: string;
}

export interface WalletInfo {
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
  storeId: string;
  invoiceId: string;
  amount: number;
}

export interface CreatePayOSLinkRequest {
  invoiceId: string;
  returnUrl: string;
  cancelUrl: string;
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
      storeId: wallet.storeId,
      balance: wallet.balance,
      status: wallet.status,
      currency: wallet.currency,
      transactions: Array.isArray(transactions) ? transactions : undefined,
    };
  },

  deposit: (payload: DepositRequest) =>
    apiClient.post<ApiResponse<WalletInfo>>(`${BASE}/deposit`, payload),

  payWithWallet: (payload: PayWithWalletRequest) =>
    apiClient.post<ApiResponse<unknown>>(`${BASE}/pay-with-wallet`, payload),

  createPayOSLink: (payload: CreatePayOSLinkRequest) =>
    apiClient.post<ApiResponse<{ checkoutUrl: string }>>(
      `${BASE}/create-link`,
      payload
    ),
};

