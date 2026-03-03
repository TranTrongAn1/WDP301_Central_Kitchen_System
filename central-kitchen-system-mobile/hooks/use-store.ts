import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { storeApi } from "@/lib/api";

export type StoreInfo = {
    _id: string;
    storeName?: string;
    storeCode?: string;
    address?: string;
    phone?: string;
    // wallet balance should be provided by backend if available
    walletBalance?: number;
    [key: string]: any;
};

export const useStore = () => {
    const { token, user } = useAuth();
    const [store, setStore] = useState<StoreInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStore = useCallback(async () => {
        if (!user?.storeId) {
            setStore(null);
            setError("Tài khoản chưa gắn với cửa hàng.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await storeApi.getById(user.storeId, token);
            if (response?.success && response.data) {
                setStore(response.data);
            } else {
                setStore(null);
            }
        } catch (err) {
            setStore(null);
            setError(err instanceof Error ? err.message : "Không thể tải thông tin cửa hàng.");
        } finally {
            setIsLoading(false);
        }
    }, [token, user?.storeId]);

    useEffect(() => {
        fetchStore();
    }, [fetchStore]);

    return { store, isLoading, error, refetch: fetchStore };
};
