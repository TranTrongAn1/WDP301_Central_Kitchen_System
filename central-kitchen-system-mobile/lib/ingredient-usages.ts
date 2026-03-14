export type IngredientUsageRef =
    | string
    | {
        _id: string;
        ingredientName?: string;
        name?: string;
        unit?: string;
        batchCode?: string;
        planCode?: string;
        sku?: string;
    };

export type IngredientUsage = {
    _id: string;
    productionPlanId?: IngredientUsageRef;
    productId?: IngredientUsageRef;
    ingredientId?: IngredientUsageRef;
    ingredientBatchId?: IngredientUsageRef;
    quantityUsed?: number;
    note?: string | null;
    recordedAt?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type IngredientUsagesResponse = {
    success: boolean;
    count?: number;
    data: IngredientUsage[];
};
