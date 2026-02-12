/**
 * Types for Store Inventory API: GET /api/inventory/store/{storeId}
 * Response: list of inventory lines (per batch per product at store).
 */

export type StoreInventoryLine = {
  _id: string;
  storeId: string;
  productId: { _id: string; name?: string; sku?: string } | string;
  batchId: { _id: string; expDate?: string } | string;
  quantity: number;
  createdAt?: string;
  updatedAt?: string;
};

export type StoreInventoryResponse = {
  success: boolean;
  storeName?: string;
  data: StoreInventoryLine[];
};

/** Aggregated view per product for Kho tab (read-only). */
export type StoreInventoryProductSummary = {
  productId: string;
  productName: string;
  sku: string;
  totalQuantity: number;
  batchCount: number;
  /** Earliest expiry among batches (ISO date string). */
  earliestExpiry: string | null;
  /** True if earliestExpiry is within next 7 days. */
  expiringSoon: boolean;
  /** True if totalQuantity < 10 (client-side hint; API may have lowStock filter). */
  lowStock: boolean;
};

const LOW_STOCK_THRESHOLD = 10;
const EXPIRING_DAYS = 7;

function isExpiringSoon(expDate: string | null | undefined): boolean {
  if (!expDate) return false;
  const exp = new Date(expDate);
  const now = new Date();
  const daysLeft = (exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  return daysLeft >= 0 && daysLeft <= EXPIRING_DAYS;
}

export function aggregateStoreInventory(
  lines: StoreInventoryLine[]
): StoreInventoryProductSummary[] {
  const byProduct = new Map<
    string,
    {
      productName: string;
      sku: string;
      totalQty: number;
      batchCount: number;
      earliestExpiry: string | null;
    }
  >();

  for (const line of lines) {
    const productId =
      typeof line.productId === "string" ? line.productId : line.productId?._id ?? "";
    const productName =
      typeof line.productId === "object" && line.productId?.name != null
        ? line.productId.name
        : "";
    const sku =
      typeof line.productId === "object" && line.productId?.sku != null
        ? line.productId.sku
        : "";
    const expDate =
      typeof line.batchId === "object" && line.batchId?.expDate != null
        ? line.batchId.expDate
        : null;

    const cur = byProduct.get(productId);
    if (!cur) {
      byProduct.set(productId, {
        productName,
        sku,
        totalQty: line.quantity ?? 0,
        batchCount: 1,
        earliestExpiry: expDate,
      });
    } else {
      cur.totalQty += line.quantity ?? 0;
      cur.batchCount += 1;
      if (expDate && (!cur.earliestExpiry || expDate < cur.earliestExpiry)) {
        cur.earliestExpiry = expDate;
      }
    }
  }

  return Array.from(byProduct.entries()).map(([productId, cur]) => ({
    productId,
    productName: cur.productName,
    sku: cur.sku,
    totalQuantity: cur.totalQty,
    batchCount: cur.batchCount,
    earliestExpiry: cur.earliestExpiry,
    expiringSoon: isExpiringSoon(cur.earliestExpiry),
    lowStock: cur.totalQty < LOW_STOCK_THRESHOLD,
  }));
}
