import { useCallback, useEffect, useState } from "react";

import { ingredientBatchesApi } from "@/lib/api";
import type { IngredientBatch } from "@/lib/ingredient-batches";
import { useAuth } from "@/hooks/use-auth";

export const useIngredientBatches = (ingredientId: string | undefined) => {
  const { token } = useAuth();
  const [items, setItems] = useState<IngredientBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!ingredientId) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await ingredientBatchesApi.getForIngredient(
        ingredientId,
        { activeOnly: true },
        token,
      );
      if (response.success) {
        setItems(response.data ?? []);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách lô nguyên liệu.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [ingredientId, token]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { items, isLoading, error, refetch: fetchAll };
};

