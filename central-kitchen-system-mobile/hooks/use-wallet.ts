import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { walletApi } from "@/lib/api";
import type { Wallet, WalletTransaction } from "@/lib/wallet";

export const useWallet = () => {
    const { token, user } = useAuth();
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWallet = useCallback(async () => {
        if (!user?.storeId) {
            setWallet(null);
            setTransactions([]);
            setError("Tài khoản chưa gắn với cửa hàng.");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const response = await walletApi.getByStoreId(user.storeId, token);
            if (response?.success && response.data) {
                setWallet(response.data.wallet);
                setTransactions(response.data.transactions || []);
                setError(null);
            } else {
                setWallet(null);
                setTransactions([]);
                setError("Không thể tải dữ liệu ví");
            }
        } catch (err) {
            setWallet(null);
            setTransactions([]);
            const errorMsg = err instanceof Error ? err.message : "Không thể tải thông tin ví.";
            setError(errorMsg);
            console.error("Wallet fetch error:", errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [token, user?.storeId]);

    useEffect(() => {
        if (user?.storeId && token) {
            fetchWallet();
        }
    }, [fetchWallet, user?.storeId, token]);

    return { wallet, transactions, isLoading, error, refetch: fetchWallet };
};
