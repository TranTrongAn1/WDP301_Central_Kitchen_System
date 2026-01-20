import { useCallback, useEffect, useState } from 'react';

import { ingredientsApi } from '@/lib/api';
import type { Ingredient } from '@/lib/ingredients';
import { useAuth } from '@/hooks/use-auth';

export const useIngredients = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ingredientsApi.getAll(token);
      if (response.success) {
        setItems(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải kho nguyên liệu.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { items, isLoading, error, refetch: fetchAll };
};
