import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { ingredientUsagesApi } from "@/lib/api";
import type { IngredientUsage } from "@/lib/ingredient-usages";

type Params = {
    productionPlanId?: string;
    productId?: string;
    ingredientId?: string;
    ingredientBatchId?: string;
    startDate?: string;
    endDate?: string;
};

export function useIngredientUsages(params?: Params) {
    const { token } = useAuth();
    const productionPlanId = params?.productionPlanId;
    const productId = params?.productId;
    const ingredientId = params?.ingredientId;
    const ingredientBatchId = params?.ingredientBatchId;
    const startDate = params?.startDate;
    const endDate = params?.endDate;

    const [items, setItems] = useState<IngredientUsage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await ingredientUsagesApi.getAll(
                {
                    productionPlanId,
                    productId,
                    ingredientId,
                    ingredientBatchId,
                    startDate,
                    endDate,
                },
                token,
            );
            const raw = (res as { data?: unknown })?.data;
            setItems(Array.isArray(raw) ? (raw as IngredientUsage[]) : []);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Không tải được lịch sử sử dụng nguyên liệu.");
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    }, [token, productionPlanId, productId, ingredientId, ingredientBatchId, startDate, endDate]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    return {
        items,
        isLoading,
        error,
        refetch: fetchItems,
    };
}
