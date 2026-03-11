import type { Invoice } from "@/lib/invoices";
import type { Order } from "@/lib/orders";

export type PricingSettings = {
    taxRate?: number;
    shippingCostBase?: number;
};

export type OrderPricingBreakdown = {
    subtotal: number;
    vatAmount: number;
    shippingAmount: number;
    totalAmount: number;
    taxRatePercent: number;
};

function safeNumber(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function getOrderSubtotal(order?: Order | null): number {
    if (!order?.items?.length) return 0;
    return order.items.reduce((sum, item) => {
        if (typeof item.subtotal === "number") return sum + item.subtotal;
        const quantity = item.quantityRequested ?? item.quantity ?? 0;
        const unitPrice = item.unitPrice ?? (typeof item.productId === "object" ? item.productId?.price ?? 0 : 0);
        return sum + quantity * unitPrice;
    }, 0);
}

export function getOrderPricingBreakdown(
    order?: Order | null,
    invoice?: Invoice | null,
    settings?: PricingSettings | null,
): OrderPricingBreakdown {
    const subtotal = safeNumber(invoice?.subtotal) || getOrderSubtotal(order);
    const settingsTaxRate = safeNumber(settings?.taxRate);
    const taxRatePercent = safeNumber(invoice?.taxRate)
        ? safeNumber(invoice?.taxRate) > 1
            ? safeNumber(invoice?.taxRate)
            : safeNumber(invoice?.taxRate) * 100
        : settingsTaxRate * 100;

    const vatAmount = safeNumber(invoice?.taxAmount) || Math.round(subtotal * settingsTaxRate);
    const fallbackShipping = safeNumber(settings?.shippingCostBase);
    const inferredShipping = safeNumber(invoice?.totalAmount) - subtotal - vatAmount;
    const shippingAmount = safeNumber(invoice?.totalAmount)
        ? Math.max(0, inferredShipping)
        : fallbackShipping;
    const totalAmount = safeNumber(invoice?.totalAmount) || subtotal + vatAmount + shippingAmount;

    return {
        subtotal,
        vatAmount,
        shippingAmount,
        totalAmount,
        taxRatePercent,
    };
}