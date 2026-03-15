import { useCallback, useEffect, useState } from "react";

import { ingredientRequestsApi } from "@/lib/api"; 
import type { IngredientRequest } from "@/lib/ingredient-requests";
import { useAuth } from "@/hooks/use-auth";

export const useIngredientRequests = (statusFilter: string = "ALL") => {
  const { token } = useAuth(); 
  const [items, setItems] = useState<IngredientRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ingredientRequestsApi.getAll(
        statusFilter,
        token
      );
      
      if (response.success) {
        setItems(response.data ?? []);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách phiếu yêu cầu nguyên liệu."
      );
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, token]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return { items, isLoading, error, refetch: fetchRequests };
};