import { useCallback, useEffect, useState } from 'react';

import { ingredientsApi } from '@/lib/api';
import type { Ingredient } from '@/lib/ingredients';
import { useAuth } from '@/hooks/use-auth';

export const useIngredient = (id: string) => {
  const { token } = useAuth();
  const [item, setItem] = useState<Ingredient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchById = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ingredientsApi.getById(id, token);
      if (response.success) {
        setItem(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải chi tiết nguyên liệu.');
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    if (id) {
      fetchById();
    }
  }, [fetchById, id]);

  const update = useCallback(
    async (payload: Partial<Ingredient>) => {
      const response = await ingredientsApi.update(id, payload, token);
      if (response.success) {
        setItem(response.data);
      }
      return response;
    },
    [id, token]
  );

  const remove = useCallback(async () => {
    return ingredientsApi.remove(id, token);
  }, [id, token]);

  return { item, isLoading, error, refetch: fetchById, update, remove };
};
