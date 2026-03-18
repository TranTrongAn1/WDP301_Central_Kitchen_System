import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/use-auth";
import { logisticsOrdersApi, productionPlansApi, storeApi } from "@/lib/api";
import type { Order } from "@/lib/orders";
import type { ProductionPlan, ProductionPlanOrderRef } from "@/lib/production-plans";

type ProductLine = {
    name: string;
    quantity: number;
};

type OrderCard = {
    orderId: string;
    orderCode: string;
    storeName: string;
    storeCode: string;
    address: string;
    recipientPhone: string;
    products: ProductLine[];
};

type StoreSummary = {
    storeName?: string;
    storeCode?: string;
    address?: string;
};

function toOrderId(ref: ProductionPlanOrderRef): string {
    if (typeof ref === "string") return ref;
    return ref?._id ?? "";
}

function collectOrderRefs(plan: ProductionPlan | null): ProductionPlanOrderRef[] {
    if (!plan) return [];

    const refs: ProductionPlanOrderRef[] = [];
    if (Array.isArray(plan.orders)) refs.push(...plan.orders);
    if (Array.isArray(plan.orderIds)) refs.push(...plan.orderIds);

    if (Array.isArray(plan.orderId)) {
        refs.push(...plan.orderId);
    } else if (plan.orderId) {
        refs.push(plan.orderId);
    }

    return refs;
}

function readStore(order: Order | null): { storeId: string; summary: StoreSummary } {
    const storeRef = order?.storeId;
    if (!storeRef) return { storeId: "", summary: {} };

    if (typeof storeRef === "string") {
        return { storeId: storeRef, summary: {} };
    }

    return {
        storeId: storeRef._id ?? "",
        summary: {
            storeName: storeRef.storeName ?? storeRef.name,
            storeCode: storeRef.storeCode,
            address: storeRef.address,
        },
    };
}

function readOrderCode(order: Order): string {
    return order.orderNumber ?? `ORDER-${String(order._id).slice(-6).toUpperCase()}`;
}

function readProducts(order: Order): ProductLine[] {
    const items = Array.isArray(order.items) ? order.items : [];
    return items.map((item) => {
        const productRef = item.productId;
        const name =
            typeof productRef === "object"
                ? productRef?.name ?? productRef?._id ?? "Sản phẩm"
                : productRef ?? "Sản phẩm";

        const quantityRaw = item.quantity ?? item.quantityRequested ?? 0;
        const quantity = Number.isFinite(Number(quantityRaw)) ? Number(quantityRaw) : 0;

        return { name, quantity };
    });
}

export default function KitchenProductionOrdersScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { token } = useAuth();
    const { planId } = useLocalSearchParams<{ planId: string }>();

    const [plan, setPlan] = useState<ProductionPlan | null>(null);
    const [cards, setCards] = useState<OrderCard[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!planId || !token) {
            setPlan(null);
            setCards([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const planRes = await productionPlansApi.getById(planId, token);
            const planData = planRes.data ?? null;
            setPlan(planData);

            const orderRefs = collectOrderRefs(planData);
            const orderDetails = await Promise.all(
                orderRefs.map(async (orderRef) => {
                    if (typeof orderRef !== "string" && orderRef?._id && Array.isArray(orderRef.items)) {
                        return orderRef as Order;
                    }

                    const orderId = toOrderId(orderRef);
                    if (!orderId) return null;

                    try {
                        const orderRes = await logisticsOrdersApi.getById(orderId, token);
                        return orderRes.data ?? null;
                    } catch {
                        return null;
                    }
                })
            );

            const resolvedOrders = orderDetails.filter(
                (order): order is Order => !!order && !!order._id
            );
            const uniqueOrders = Array.from(
                new Map(resolvedOrders.map((order) => [order._id, order])).values()
            );

            const uniqueStoreIds = Array.from(
                new Set(
                    uniqueOrders
                        .map((order) => readStore(order).storeId)
                        .filter((storeId) => !!storeId)
                )
            );

            const storeEntries = await Promise.all(
                uniqueStoreIds.map(async (storeId) => {
                    try {
                        const storeRes = await storeApi.getById(storeId, token);
                        const storeData = storeRes?.data ?? {};
                        return [
                            storeId,
                            {
                                storeName: storeData.storeName ?? storeData.name,
                                storeCode: storeData.storeCode,
                                address: storeData.address,
                            } as StoreSummary,
                        ] as const;
                    } catch {
                        return [storeId, {} as StoreSummary] as const;
                    }
                })
            );

            const storeMap = new Map<string, StoreSummary>(storeEntries);

            const nextCards = uniqueOrders.map((order) => {
                const { storeId, summary } = readStore(order);
                const fromApi = storeMap.get(storeId) ?? {};
                const mergedStore = {
                    storeName: summary.storeName ?? fromApi.storeName,
                    storeCode: summary.storeCode ?? fromApi.storeCode,
                    address: summary.address ?? order.address ?? fromApi.address,
                };

                return {
                    orderId: order._id,
                    orderCode: readOrderCode(order),
                    storeName: mergedStore.storeName ?? "Cửa hàng",
                    storeCode: mergedStore.storeCode ?? "—",
                    address: mergedStore.address ?? "—",
                    recipientPhone: order.recipientPhone ?? "—",
                    products: readProducts(order),
                };
            });

            setCards(nextCards);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Không tải được chi tiết order của kế hoạch.");
            setPlan(null);
            setCards([]);
        } finally {
            setIsLoading(false);
        }
    }, [planId, token]);

    useEffect(() => {
        load();
    }, [load]);

    const title = useMemo(() => {
        if (!plan?.planCode) return "Order trong kế hoạch";
        return `${plan.planCode} - Order`;
    }, [plan?.planCode]);

    if (isLoading) {
        return (
            <View style={[styles.centered, { paddingTop: insets.top }]}>
                <ActivityIndicator color="#D91E18" size="large" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.centered, { paddingTop: insets.top }]}>
                <Text style={styles.error}>{error}</Text>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backText}>‹ Quay lại</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top }]}>
            <View style={styles.headerRow}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backText}>‹ Quay lại</Text>
                </Pressable>
            </View>

            <Text style={styles.title}>{title}</Text>

            {cards.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>Kế hoạch này chưa có order.</Text>
                </View>
            ) : (
                cards.map((card) => (
                    <View key={card.orderId} style={styles.orderCard}>
                        <Text style={styles.orderCode}>Order: {card.orderCode}</Text>
                        <Text style={styles.meta}>Store: {card.storeName}</Text>
                        <Text style={styles.meta}>Mã cửa hàng: {card.storeCode}</Text>
                        <Text style={styles.meta}>Địa chỉ: {card.address}</Text>
                        <Text style={styles.meta}>SĐT nhận hàng: {card.recipientPhone}</Text>

                        <View style={styles.divider} />
                        <Text style={styles.sectionLabel}>Sản phẩm trong order</Text>

                        {card.products.length === 0 ? (
                            <Text style={styles.productText}>Không có sản phẩm.</Text>
                        ) : (
                            card.products.map((product, idx) => (
                                <View key={`${card.orderId}-${idx}`} style={styles.productRow}>
                                    <Text style={styles.productText}>{product.name}</Text>
                                    <Text style={styles.productQty}>SL: {product.quantity}</Text>
                                </View>
                            ))
                        )}
                    </View>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
        padding: 16,
        backgroundColor: "#FFF4F4",
        paddingBottom: 32,
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFF4F4",
    },
    headerRow: {
        flexDirection: "row",
        marginBottom: 8,
    },
    backBtn: {
        paddingVertical: 4,
        paddingRight: 8,
    },
    backText: {
        fontSize: 14,
        color: "#9B0F0F",
        fontWeight: "600",
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#9B0F0F",
        marginBottom: 16,
    },
    error: {
        color: "#D91E18",
        fontSize: 14,
        marginBottom: 12,
        textAlign: "center",
    },
    emptyCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: "#FFE1E1",
    },
    emptyText: {
        fontSize: 14,
        color: "#666",
    },
    orderCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#FFE1E1",
    },
    orderCode: {
        fontSize: 15,
        fontWeight: "700",
        color: "#2A2A2A",
        marginBottom: 6,
    },
    meta: {
        fontSize: 12,
        color: "#666",
        marginBottom: 2,
    },
    divider: {
        height: 1,
        backgroundColor: "#F1DCDC",
        marginVertical: 8,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: "#2A2A2A",
        marginBottom: 6,
    },
    productRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
        gap: 8,
    },
    productText: {
        fontSize: 13,
        color: "#2A2A2A",
    },
    productQty: {
        fontSize: 13,
        fontWeight: "600",
        color: "#2A2A2A",
    },
});
