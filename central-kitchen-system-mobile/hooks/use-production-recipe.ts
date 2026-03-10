import { useAuth } from "@/hooks/use-auth";
import { ingredientBatchesApi, ingredientsApi, productionPlansApi, productsApi } from "@/lib/api";
import type {
  CompleteItemPayload,
  UsedIngredientItem,
} from "@/lib/production-plans";
import type { RecipeIngredient } from "@/lib/products";
import { useCallback, useEffect, useState } from "react";

export type BatchWithUsage = {
  _id: string;
  batchCode: string;
  remainingQuantity: number;
  unit: string;
  expiryDate: string;
  usedQuantity: number;
};

export type RecipeItemWithBatches = {
  ingredientId: string;
  ingredientName: string;
  ingredientType?: string; // ingredient category/type name
  unit: string;
  perUnitQuantity: number;
  totalRequired: number;
  batches: BatchWithUsage[];
};

export function useProductionRecipe(
  planId: string,
  productId: string,
  plannedQuantity: number
) {
  const { token } = useAuth();
  const [recipe, setRecipe] = useState<RecipeItemWithBatches[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch product recipe
  useEffect(() => {
    const loadRecipe = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await productsApi.getById(productId, token);
        const product = response.data;

        if (!product.recipe || product.recipe.length === 0) {
          setRecipe([]);
          return;
        }

        // For each recipe ingredient, load batches
        const recipeWithBatches = await Promise.all(
          product.recipe.map(async (recipeItem: RecipeIngredient) => {
            const ingredientId = recipeItem.ingredientId._id;
            const batchesResponse = await ingredientBatchesApi.getForIngredient(
              ingredientId,
              { activeOnly: true },
              token
            );

            const batches = (batchesResponse.data || []).map((batch) => ({
              _id: batch._id,
              batchCode: batch.batchCode,
              remainingQuantity: batch.currentQuantity,
              unit: recipeItem.ingredientId.unit,
              expiryDate: batch.expiryDate,
              usedQuantity: 0,
            }));

            const totalRequired =
              recipeItem.quantity * plannedQuantity;

            // Fetch ingredient details from API for name and type/category info
            // First try to get ingredient name from API
            let ingredientName: string = "Nguyên liệu"; // default fallback
            let ingredientType: string | undefined;

            try {
              const ingredientResponse = await ingredientsApi.getById(
                ingredientId,
                token
              );
              const ing = ingredientResponse.data;
              // Use ingredient name from API response (prefer 'name' field, fallback to 'ingredientName')
              if (ing.name && ing.name.trim()) {
                ingredientName = ing.name;
              } else if (ing.ingredientName && ing.ingredientName.trim()) {
                ingredientName = ing.ingredientName;
              } else if (recipeItem.ingredientId.ingredientName && recipeItem.ingredientId.ingredientName.trim()) {
                ingredientName = recipeItem.ingredientId.ingredientName;
              }
              // Check for category name or other type fields
              ingredientType = (ing as any).category || (ing as any).ingredientType || undefined;
            } catch (err) {
              // If API fetch fails, use fallback from recipe data
              if (recipeItem.ingredientId.ingredientName && recipeItem.ingredientId.ingredientName.trim()) {
                ingredientName = recipeItem.ingredientId.ingredientName;
              }
              if (__DEV__) {
                console.warn(
                  "[production-recipe] Could not fetch ingredient details for",
                  ingredientId,
                  err
                );
              }
            }

            return {
              ingredientId,
              ingredientName: ingredientName || "Nguyên liệu",
              ingredientType,
              unit: recipeItem.ingredientId.unit,
              perUnitQuantity: recipeItem.quantity,
              totalRequired,
              batches,
            };
          })
        );

        setRecipe(recipeWithBatches);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Không tải được công thức.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      loadRecipe();
    }
  }, [productId, plannedQuantity, token]);

  // Update used quantity for a batch
  const updateBatchUsage = useCallback(
    (ingredientIndex: number, batchIndex: number, quantity: number) => {
      setRecipe((prev) => {
        const updated = [...prev];
        if (
          updated[ingredientIndex] &&
          updated[ingredientIndex].batches[batchIndex]
        ) {
          updated[ingredientIndex].batches[batchIndex].usedQuantity =
            Math.max(0, quantity);
        }
        return updated;
      });
    },
    []
  );

  // Validate usage
  const validateUsage = useCallback((): { valid: boolean; message?: string } => {
    for (const item of recipe) {
      const totalUsed = item.batches.reduce(
        (sum, b) => sum + b.usedQuantity,
        0
      );
      if (totalUsed < item.totalRequired) {
        return {
          valid: false,
          message: `Chưa đủ ${item.ingredientName}. Cần ${item.totalRequired} ${item.unit}, đã nhập ${totalUsed} ${item.unit}.`,
        };
      }

      // Check if exceeding remaining quantity
      for (const batch of item.batches) {
        if (batch.usedQuantity > batch.remainingQuantity) {
          return {
            valid: false,
            message: `Vượt quá số lượng còn lại của ${item.ingredientName} từ mẻ ${batch.batchCode}.`,
          };
        }
      }
    }
    return { valid: true };
  }, [recipe]);

  // Save production result
  const saveProduction = useCallback(
    async (actualQuantity: number) => {
      const validation = validateUsage();
      if (!validation.valid) {
        throw new Error(validation.message || "Dữ liệu không hợp lệ.");
      }

      try {
        setIsSaving(true);

        // Build usedIngredients array - flatten all batches from all ingredients
        const usedIngredients: UsedIngredientItem[] = recipe
          .flatMap((item) =>
            item.batches
              .filter((b) => b.usedQuantity > 0)
              .map((b) => ({
                ingredientBatchId: b._id,
                quantityUsed: b.usedQuantity,
                note: undefined, // No note from recipe screen
              }))
          );

        const payload: CompleteItemPayload = {
          productId,
          actualQuantity,
          usedIngredients,
        };

        await productionPlansApi.completeItem(planId, payload, token);
      } finally {
        setIsSaving(false);
      }
    },
    [recipe, productId, planId, token, validateUsage]
  );

  return {
    recipe,
    isLoading,
    error,
    isSaving,
    updateBatchUsage,
    saveProduction,
    validateUsage,
  };
}
