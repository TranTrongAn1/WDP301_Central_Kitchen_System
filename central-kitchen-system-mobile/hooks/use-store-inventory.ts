import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  aggregateStoreInventory,
  type StoreInventoryProductSummary,
} from "@/lib/inventory";
import { storeInventoryApi } from "@/lib/api";

export const useStoreInventory = () => {
  const { token, user } = useAuth();
  const [items, setItems] = useState<StoreInventoryProductSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!user?.storeId) {
      setItems([]);
      setError("Tài khoản chưa gắn với cửa hàng.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await storeInventoryApi.getByStore(user.storeId, token);

      if (response?.success && Array.isArray(response.data)) {
        const aggregated = aggregateStoreInventory(response.data);
        setItems(aggregated);
      } else {
        setItems([]);
      }
    } catch (err) {
      setItems([]);
      setError(
        err instanceof Error ? err.message : "Không thể tải tồn kho."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, user?.storeId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return { items, isLoading, error, refetch: fetchInventory };
};
