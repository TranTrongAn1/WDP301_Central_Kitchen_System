// hooks/use-suppliers.ts
import { useCallback, useEffect, useState } from "react";
import { suppliersApi } from "@/lib/api";
import type { Supplier } from "@/lib/suppliers";
import { useAuth } from "@/hooks/use-auth";

export const useSuppliers = (status?: string) => {
  const { token } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Gọi API lấy danh sách (bạn có thể truyền status="Active" nếu chỉ muốn lấy người đang hoạt động)
      const response = await suppliersApi.getAll({ status, limit: 100 }, token);
      if (response.success) {
        setSuppliers(response.data ?? []);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách Nhà cung cấp."
      );
    } finally {
      setIsLoading(false);
    }
  }, [status, token]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  return { suppliers, isLoading, error, refetch: fetchSuppliers };
};