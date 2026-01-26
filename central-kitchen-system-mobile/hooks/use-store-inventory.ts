import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { storeInventoryApi } from '@/lib/api';

type StoreInventoryItem = {
  id: string;
  productName: string;
  unit?: string;
  quantity: number;
  warningThreshold?: number;
};

type StoreInventoryResponse = {
  success: boolean;
  data: StoreInventoryItem[];
};

const fallbackData: StoreInventoryItem[] = [
  {
    id: 'mock-1',
    productName: 'Bánh trung thu thập cẩm',
    unit: 'hộp',
    quantity: 120,
    warningThreshold: 50,
  },
  {
    id: 'mock-2',
    productName: 'Bánh dẻo đậu xanh',
    unit: 'hộp',
    quantity: 18,
    warningThreshold: 30,
  },
];

export const useStoreInventory = () => {
  const { token, user } = useAuth();
  const [items, setItems] = useState<StoreInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  const fetchInventory = useCallback(async () => {
    if (!user?.storeId) {
      setItems([]);
      setError('Tài khoản chưa gắn với cửa hàng.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsMock(false);

    try {
      const response = (await storeInventoryApi.getByStore(
        user.storeId,
        token
      )) as unknown as StoreInventoryResponse;

      if (response?.success && Array.isArray(response.data)) {
        setItems(response.data);
      } else {
        setItems([]);
      }
    } catch (err) {
      setItems(fallbackData);
      setIsMock(true);
      setError(
        err instanceof Error ? err.message : 'Không thể tải tồn kho. Hiển thị dữ liệu mẫu.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, user?.storeId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return { items, isLoading, error, isMock, refetch: fetchInventory };
};
