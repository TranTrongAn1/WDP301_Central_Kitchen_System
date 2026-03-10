import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { storeInventoryApi } from "@/lib/api";
import type { StoreInventoryLine } from "@/lib/inventory";

export type ProductBatch = {
    _id: string;
    batchCode: string;
    mfgDate: string | null;
    expDate: string | null;
    quantity: number;
    isExpired: boolean;
};

export type ProductDetail = {
    _id: string;
    name: string;
    sku: string;
    price?: number;
    shelfLifeDays?: number;
};

export type StoreInventoryDetailResponse = {
    product: ProductDetail | null;
    batches: ProductBatch[];
};

/**
 * Hook to fetch batches for a specific product from store inventory.
 * Extracts and aggregates batch data from the store inventory response.
 */
export const useStoreInventoryDetail = (productId: string | null) => {
    const { token, user } = useAuth();
    const [data, setData] = useState<StoreInventoryDetailResponse>({
        product: null,
        batches: [],
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDetails = useCallback(async () => {
        if (!user?.storeId || !productId) {
            setData({ product: null, batches: [] });
            setError(
                !user?.storeId
                    ? "Tài khoản chưa gắn với cửa hàng."
                    : "Không có mã sản phẩm."
            );
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await storeInventoryApi.getByStore(user.storeId, token);

            if (!response?.success || !Array.isArray(response.data)) {
                setData({ product: null, batches: [] });
                setError("Không thể tải chi tiết sản phẩm.");
                return;
            }

            // Filter records for this product
            const productRecords: StoreInventoryLine[] = response.data.filter((line) => {
                const pId =
                    typeof line.productId === "string"
                        ? line.productId
                        : line.productId?._id;
                return pId === productId;
            });

            if (productRecords.length === 0) {
                setData({ product: null, batches: [] });
                setError("Không tìm thấy sản phẩm.");
                return;
            }

            // Extract product info from first record
            const firstRecord = productRecords[0];
            let productInfo: ProductDetail | null = null;
            if (typeof firstRecord.productId === "object" && firstRecord.productId) {
                productInfo = {
                    _id: firstRecord.productId._id || "",
                    name: firstRecord.productId.name || "—",
                    sku: firstRecord.productId.sku || "—",
                    price: (firstRecord.productId as any).price,
                    shelfLifeDays: (firstRecord.productId as any).shelfLifeDays,
                };
            } else {
                productInfo = {
                    _id: productId,
                    name: "—",
                    sku: "—",
                };
            }

            // Aggregate batches (handle duplicates by summing quantities)
            const batchMap = new Map<string, ProductBatch>();

            for (const record of productRecords) {
                if (
                    typeof record.batchId === "object" &&
                    record.batchId &&
                    record.batchId._id
                ) {
                    const batchId = record.batchId._id;
                    const existing = batchMap.get(batchId);

                    if (existing) {
                        existing.quantity += record.quantity ?? 0;
                    } else {
                        batchMap.set(batchId, {
                            _id: batchId,
                            batchCode: (record.batchId as any).batchCode || `Batch-${batchId}`,
                            mfgDate: (record.batchId as any).mfgDate || null,
                            expDate: record.batchId.expDate || null,
                            quantity: record.quantity ?? 0,
                            isExpired: (record.batchId as any).isExpired ?? false,
                        });
                    }
                }
            }

            // Sort batches by expiry date (earliest first, null last)
            const batchesArray = Array.from(batchMap.values()).sort((a, b) => {
                if (!a.expDate && !b.expDate) return 0;
                if (!a.expDate) return 1;
                if (!b.expDate) return -1;
                return new Date(a.expDate).getTime() - new Date(b.expDate).getTime();
            });

            setData({
                product: productInfo,
                batches: batchesArray,
            });
        } catch (err) {
            setData({ product: null, batches: [] });
            setError(
                err instanceof Error ? err.message : "Không thể tải chi tiết sản phẩm."
            );
        } finally {
            setIsLoading(false);
        }
    }, [token, user?.storeId, productId]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    return { ...data, isLoading, error, refetch: fetchDetails };
};
