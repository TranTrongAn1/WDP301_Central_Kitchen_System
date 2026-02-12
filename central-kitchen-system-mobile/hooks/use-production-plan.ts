import { useCallback, useEffect, useState } from "react";

import { productionPlansApi } from "@/lib/api";
import type { ProductionPlan } from "@/lib/production-plans";
import { useAuth } from "@/hooks/use-auth";

export function useProductionPlan(id: string | undefined) {
  const { token } = useAuth();
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    if (!id || !token) {
      setPlan(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await productionPlansApi.getById(id, token);
      setPlan(res.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được đơn sản xuất.");
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const updateStatus = useCallback(
    async (status: string) => {
      if (!id || !token) return;
      await productionPlansApi.updateStatus(id, status, token);
      await fetchPlan();
    },
    [id, token, fetchPlan]
  );

  const completeItem = useCallback(
    async (productId: string, actualQuantity: number) => {
      if (!id || !token) return;
      await productionPlansApi.completeItem(
        id,
        { productId, actualQuantity },
        token
      );
      await fetchPlan();
    },
    [id, token, fetchPlan]
  );

  return {
    plan,
    isLoading,
    error,
    refetch: fetchPlan,
    updateStatus,
    completeItem,
  };
}
