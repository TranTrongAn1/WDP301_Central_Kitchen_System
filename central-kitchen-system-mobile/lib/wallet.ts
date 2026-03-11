/** Wallet and Transaction API types and responses */

export enum WalletTransactionType {
    Deposit = "Deposit",
    Withdrawal = "Withdrawal",
    Refund = "Refund",
    Payment = "Payment",
}

export type WalletTransaction = {
    _id: string;
    walletId: string;
    orderId?: string;
    amount: number;
    type: WalletTransactionType | string;
    description?: string;
    timestamp: string;
};

export type Wallet = {
    _id: string;
    storeId: string;
    balance: number;
    status: "Active" | "Locked";
    createdAt: string;
    updatedAt: string;
};

export type WalletResponse = {
    success: boolean;
    data: {
        wallet: Wallet;
        transactions: WalletTransaction[];
    };
};

export type WalletTransactionResponse = {
    success: boolean;
    message: string;
    data: {
        wallet: Wallet;
        transaction: WalletTransaction;
    };
};
