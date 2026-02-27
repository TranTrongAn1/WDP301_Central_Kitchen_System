import { useCallback, useEffect, useState } from "react";

import { ingredientBatchesApi } from "@/lib/api";
import type { IngredientBatch } from "@/lib/ingredient-batches";
import { useAuth } from "@/hooks/use-auth";

export const useIngredientBatch = (id: string | undefined) => {
  const { token } = useAuth();
  const [item, setItem] = useState<IngredientBatch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchById = useCallback(async () => {
    if (!id) {
      setItem(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await ingredientBatchesApi.getById(id, token);
      if (response.success) {
        setItem(response.data);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải chi tiết lô nguyên liệu.",
      );
      setItem(null);
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchById();
  }, [fetchById]);

  return { item, isLoading, error, refetch: fetchById };
};

