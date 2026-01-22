import { useCallback, useEffect, useState } from 'react';

import { productsApi } from '@/lib/api';
import type { Product } from '@/lib/products';
import { useAuth } from '@/hooks/use-auth';

export const useProducts = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await productsApi.getAll(token);
      if (response.success) {
        setItems(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách sản phẩm.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { items, isLoading, error, refetch: fetchAll };
};
