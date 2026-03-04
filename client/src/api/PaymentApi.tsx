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

const BASE = '/payments';

export const paymentApi = {
  getWallet: async (storeId: string): Promise<WalletInfo | null> => {
    const res = (await apiClient.get(`${BASE}/wallet/${storeId}`)) as
      | ApiResponse<WalletInfo>
      | WalletInfo;

    if (res && typeof res === 'object' && 'data' in res && (res as any).data) {
      return (res as ApiResponse<WalletInfo>).data;
    }

    if (res && typeof res === 'object' && 'balance' in res) {
      return res as WalletInfo;
    }

    return null;
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

