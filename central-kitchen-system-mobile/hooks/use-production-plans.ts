import { useCallback, useEffect, useState } from "react";

import { productionPlansApi } from "@/lib/api";
import type { ProductionPlan } from "@/lib/production-plans";
import { useAuth } from "@/hooks/use-auth";

type Params = { status?: string; planDate?: string };

export function useProductionPlans(params?: Params) {
  const { token } = useAuth();
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await productionPlansApi.getAll(params ?? {}, token);
      setPlans(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được đơn sản xuất.");
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, params?.status, params?.planDate]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { plans, isLoading, error, refetch: fetchPlans };
}
