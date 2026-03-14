import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNotification } from "@/context/notification-context";
import { useAuth } from "@/hooks/use-auth";
import { deliveryTripsApi, logisticsOrdersApi, storeApi } from "@/lib/api";
import type { DeliveryTrip } from "@/lib/trips";

type ProductItem = {
    productName: string;
    quantity: number;
};

type TripCardItem = {
    orderId: string;
    orderCode: string;
    storeName: string;
    storeCode: string;
    address: string;
    products: ProductItem[];
};

type StoreSummary = {
    storeName?: string;
    storeCode?: string;
    address?: string;
};

function tripCode(trip: DeliveryTrip): string {
    return trip.tripCode ?? trip.tripNumber ?? `TRIP-${trip._id.slice(-6).toUpperCase()}`;
}

function vehicleName(trip: DeliveryTrip): string {
    const vehicle = trip.vehicleType ?? trip.vehicleTypeId;
    if (!vehicle) return "—";
    if (typeof vehicle === "string") return vehicle;
    return vehicle.name ?? vehicle._id;
}

function readStoreFromOrder(order: any): { storeId: string; summary: StoreSummary } {
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

function readProductItems(order: any): ProductItem[] {
    const items = Array.isArray(order?.items) ? order.items : [];
    return items.map((item: any) => {
        const productRef = item?.productId;
        const productName =
            typeof productRef === "object"
                ? productRef?.name ?? productRef?._id ?? "Sản phẩm"
                : productRef ?? "Sản phẩm";

        const quantityRaw =
            item?.quantity ?? item?.quantityRequested ?? item?.qty ?? item?.amount ?? 0;
        const quantity = Number.isFinite(Number(quantityRaw)) ? Number(quantityRaw) : 0;

        return {
            productName,
            quantity,
        };
    });
}

function readOrderCode(order: any): string {
    return order?.orderCode ?? order?.orderNumber ?? `ORDER-${String(order?._id ?? "").slice(-6).toUpperCase()}`;
}

export default function TripDetailScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { token } = useAuth();
    const { showToast } = useNotification();

    const [trip, setTrip] = useState<DeliveryTrip | null>(null);
    const [cards, setCards] = useState<TripCardItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!id || !token) return;
        setLoading(true);
        setError(null);

        try {
            const tripRes = await deliveryTripsApi.getById(id, token);
            const tripData = tripRes.data;
            setTrip(tripData ?? null);

            const orderRefs = Array.isArray(tripData?.orders) ? tripData.orders : [];

            const orderDetails = await Promise.all(
                orderRefs.map(async (orderRef) => {
                    if (typeof orderRef === "string") {
                        try {
                            const res = await logisticsOrdersApi.getById(orderRef, token);
                            return res.data;
                        } catch {
                            return null;
                        }
                    }

                    const orderObject = orderRef as any;
                    if (Array.isArray(orderObject?.items) && orderObject?.storeId) {
                        return orderObject;
                    }

                    if (orderObject?._id) {
                        try {
                            const res = await logisticsOrdersApi.getById(orderObject._id, token);
                            return res.data;
                        } catch {
                            return orderObject;
                        }
                    }

                    return null;
                })
            );

            const uniqueStoreIds = Array.from(
                new Set(
                    orderDetails
                        .map((order) => readStoreFromOrder(order).storeId)
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

            const nextCards: TripCardItem[] = [];
            orderDetails.forEach((order) => {
                if (!order?._id) return;

                const { storeId, summary } = readStoreFromOrder(order);
                const fromApi = storeMap.get(storeId) ?? {};
                const mergedStore: StoreSummary = {
                    storeName: summary.storeName ?? fromApi.storeName,
                    storeCode: summary.storeCode ?? fromApi.storeCode,
                    address: summary.address ?? fromApi.address,
                };

                const items = readProductItems(order);
                nextCards.push({
                    orderId: order._id,
                    orderCode: readOrderCode(order),
                    storeName: mergedStore.storeName ?? "Cửa hàng",
                    storeCode: mergedStore.storeCode ?? "—",
                    address: mergedStore.address ?? "—",
                    products: Array.isArray(items) ? items : [],
                });
            });

            setCards(nextCards);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Không tải được chi tiết trip.");
            setTrip(null);
            setCards([]);
        } finally {
            setLoading(false);
        }
    }, [id, token]);

    useEffect(() => {
        load();
    }, [load]);

    const canStartShipping = useMemo(() => trip?.status === "Planning", [trip?.status]);

    const handleStartShipping = () => {
        if (!id || !token || !canStartShipping) return;

        Alert.alert("Xác nhận vận chuyển", "Bắt đầu vận chuyển trip này?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Vận chuyển",
                onPress: async () => {
                    setSubmitting(true);
                    try {
                        await deliveryTripsApi.startShipping(id, token);
                        showToast("Đã chuyển trạng thái trip sang In_Transit.");
                        await load();
                    } catch (e) {
                        showToast(e instanceof Error ? e.message : "Không cập nhật được trip.", "error");
                    } finally {
                        setSubmitting(false);
                    }
                },
            },
        ]);
    };

    if (loading) {
        return (
            <View style={[styles.centered, { paddingTop: insets.top }]}>
                <ActivityIndicator color="#D91E18" size="large" />
            </View>
        );
    }

    if (error || !trip) {
        return (
            <View style={[styles.centered, { paddingTop: insets.top }]}>
                <Text style={styles.error}>{error ?? "Không tìm thấy trip."}</Text>
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

            <Text style={styles.title}>{tripCode(trip)}</Text>

            <View style={styles.tripInfoCard}>
                <View style={styles.row}>
                    <Text style={styles.label}>Trạng thái</Text>
                    <Text style={[styles.value, styles[`status_${trip.status}` as keyof typeof styles]]}>
                        {trip.status}
                    </Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Xe</Text>
                    <Text style={styles.value}>{vehicleName(trip)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Ghi chú</Text>
                    <Text style={styles.value}>{trip.notes?.trim() || "—"}</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Danh sách cửa hàng và sản phẩm</Text>

            {cards.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>Không có order trong trip này.</Text>
                </View>
            ) : (
                cards.map((card, index) => (
                    <View key={`${card.orderId}-${index}`} style={styles.itemCard}>
                        <Text style={styles.storeName}>{card.storeName}</Text>
                        <Text style={styles.meta}>Order code: {card.orderCode}</Text>
                        <Text style={styles.meta}>Mã cửa hàng: {card.storeCode}</Text>
                        <Text style={styles.meta}>Địa chỉ: {card.address}</Text>
                        <View style={styles.divider} />
                        {(Array.isArray(card.products) ? card.products : []).length === 0 ? (
                            <Text style={styles.productText}>Không có sản phẩm.</Text>
                        ) : (
                            (Array.isArray(card.products) ? card.products : []).map((product, productIndex) => (
                                <View key={`${card.orderId}-product-${productIndex}`} style={styles.productRow}>
                                    <Text style={styles.productText}>{product.productName}</Text>
                                    <Text style={styles.productQty}>SL: {product.quantity}</Text>
                                </View>
                            ))
                        )}
                    </View>
                ))
            )}

            <Pressable
                style={[styles.primaryBtn, (!canStartShipping || submitting) && styles.btnDisabled]}
                onPress={handleStartShipping}
                disabled={!canStartShipping || submitting}
            >
                <Text style={styles.primaryBtnText}>Vận chuyển</Text>
            </Pressable>
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
    headerRow: { flexDirection: "row", marginBottom: 8 },
    backBtn: { paddingVertical: 4, paddingRight: 8 },
    backText: { fontSize: 14, color: "#9B0F0F", fontWeight: "600" },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#9B0F0F",
        marginBottom: 16,
    },
    error: { color: "#D91E18", fontSize: 14, marginBottom: 12 },
    tripInfoCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#FFE1E1",
    },
    row: { marginBottom: 8 },
    label: { fontSize: 12, color: "#8C8C8C", marginBottom: 4 },
    value: { fontSize: 14, fontWeight: "600", color: "#2A2A2A" },
    status_Planning: { color: "#E65100" },
    status_In_Transit: { color: "#1565C0" },
    status_Completed: { color: "#2E7D32" },
    status_Cancelled: { color: "#666" },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#2A2A2A",
        marginBottom: 12,
    },
    itemCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#FFE1E1",
    },
    storeName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#2A2A2A",
        marginBottom: 4,
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
    productText: {
        fontSize: 13,
        color: "#2A2A2A",
        marginBottom: 2,
    },
    productRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
        gap: 8,
    },
    productQty: {
        fontSize: 13,
        fontWeight: "600",
        color: "#2A2A2A",
    },
    emptyCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: "#FFE1E1",
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 14,
        color: "#666",
    },
    primaryBtn: {
        backgroundColor: "#D91E18",
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 10,
    },
    primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    btnDisabled: { opacity: 0.6 },
});
