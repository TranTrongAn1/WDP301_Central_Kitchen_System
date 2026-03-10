import { useLocalSearchParams, useRouter } from "expo-router";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { cardShadowSmall } from "@/constants/theme";
import { useStoreInventoryDetail } from "@/hooks/use-store-inventory-detail";

const formatValue = (value: number | string | null | undefined) =>
    value === null || value === undefined ? "—" : String(value);

function formatDate(iso: string | null | undefined) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function getDaysUntilExpiry(expDate: string | null | undefined): number | null {
    if (!expDate) return null;
    const exp = new Date(expDate);
    const now = new Date();
    const daysLeft = (exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    return Math.ceil(daysLeft);
}

function isExpiringSoon(expDate: string | null | undefined): boolean {
    const daysLeft = getDaysUntilExpiry(expDate);
    return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
}

function isExpired(expDate: string | null | undefined): boolean {
    const daysLeft = getDaysUntilExpiry(expDate);
    return daysLeft !== null && daysLeft < 0;
}

export default function StoreInventoryDetailScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { productId } = useLocalSearchParams<{ productId: string }>();

    const { product, batches, isLoading, error, refetch } =
        useStoreInventoryDetail(productId || null);

    return (
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: 20 + insets.top }]}>
            {/* Header with back button */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <IconSymbol name="chevron.left" size={24} color="#9B0F0F" />
                </Pressable>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Chi tiết lô hàng</Text>
                </View>
                <Pressable style={styles.refreshButton} onPress={refetch}>
                    <IconSymbol name="arrow.clockwise" size={20} color="#9B0F0F" />
                </Pressable>
            </View>

            {/* Product Info Card */}
            {product && (
                <View style={styles.productCard}>
                    <Text style={styles.productName}>{product.name || "—"}</Text>
                    <Text style={styles.productSku}>{formatValue(product.sku)}</Text>

                    <View style={styles.productRow}>
                        <Text style={styles.productLabel}>Giá</Text>
                        <Text style={styles.productValue}>
                            {product.price
                                ? `${product.price.toLocaleString("vi-VN")} VNĐ`
                                : "—"}
                        </Text>
                    </View>

                    {product.shelfLifeDays !== undefined && product.shelfLifeDays !== null && (
                        <View style={styles.productRow}>
                            <Text style={styles.productLabel}>Thời hạn sử dụng</Text>
                            <Text style={styles.productValue}>{product.shelfLifeDays} ngày</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Batches Section */}
            {isLoading ? (
                <ActivityIndicator color="#D91E18" style={styles.loader} />
            ) : error ? (
                <Text style={styles.error}>{error}</Text>
            ) : batches.length === 0 ? (
                <Text style={styles.empty}>Không có lô hàng nào cho sản phẩm này.</Text>
            ) : (
                <View>
                    <Text style={styles.sectionTitle}>Danh sách lô hàng</Text>
                    <View style={styles.batchList}>
                        {batches.map((batch, index) => (
                            <View key={batch._id} style={styles.batchCard}>
                                <View style={styles.batchHeader}>
                                    <Text style={styles.batchIndex}>Lô #{index + 1}</Text>
                                    {isExpired(batch.expDate) && (
                                        <View style={styles.badgeExpired}>
                                            <Text style={styles.badgeExpiredText}>Hết hạn</Text>
                                        </View>
                                    )}
                                    {isExpiringSoon(batch.expDate) && !isExpired(batch.expDate) && (
                                        <View style={styles.badgeExpiring}>
                                            <Text style={styles.badgeExpiringText}>Sắp hết hạn</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.batchRow}>
                                    <Text style={styles.batchLabel}>Mã lô</Text>
                                    <Text style={styles.batchValue}>{batch.batchCode}</Text>
                                </View>

                                {batch.mfgDate && (
                                    <View style={styles.batchRow}>
                                        <Text style={styles.batchLabel}>Ngày sản xuất</Text>
                                        <Text style={styles.batchValue}>{formatDate(batch.mfgDate)}</Text>
                                    </View>
                                )}

                                {batch.expDate && (
                                    <View style={styles.batchRow}>
                                        <Text style={styles.batchLabel}>Hạn sử dụng</Text>
                                        <Text
                                            style={[
                                                styles.batchValue,
                                                isExpired(batch.expDate) && styles.valueExpired,
                                                isExpiringSoon(batch.expDate) &&
                                                !isExpired(batch.expDate) &&
                                                styles.valueExpiring,
                                            ]}
                                        >
                                            {formatDate(batch.expDate)}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.batchRow}>
                                    <Text style={styles.batchLabel}>Số lượng</Text>
                                    <Text style={styles.batchValue}>{batch.quantity}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: "#FFF4F4",
        paddingBottom: 32,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
        gap: 12,
    },
    backButton: {
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    refreshButton: {
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#9B0F0F",
    },
    productCard: {
        padding: 16,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#FFE1E1",
        ...cardShadowSmall,
        elevation: 1,
        marginBottom: 24,
    },
    productName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#2A2A2A",
        marginBottom: 4,
    },
    productSku: {
        fontSize: 12,
        color: "#8C8C8C",
        marginBottom: 12,
    },
    productRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    productLabel: {
        fontSize: 12,
        color: "#8C8C8C",
    },
    productValue: {
        fontSize: 12,
        fontWeight: "600",
        color: "#2A2A2A",
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#9B0F0F",
        marginBottom: 12,
    },
    batchList: {
        gap: 12,
    },
    batchCard: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#FFE1E1",
        ...cardShadowSmall,
        elevation: 1,
    },
    batchHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    batchIndex: {
        fontSize: 13,
        fontWeight: "700",
        color: "#2A2A2A",
    },
    badgeExpired: {
        backgroundColor: "#FFCDD2",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeExpiredText: {
        fontSize: 10,
        fontWeight: "600",
        color: "#B71C1C",
    },
    badgeExpiring: {
        backgroundColor: "#FFE0B2",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeExpiringText: {
        fontSize: 10,
        fontWeight: "600",
        color: "#E65100",
    },
    batchRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    batchLabel: {
        fontSize: 12,
        color: "#8C8C8C",
    },
    batchValue: {
        fontSize: 12,
        fontWeight: "600",
        color: "#2A2A2A",
    },
    valueExpired: {
        color: "#B71C1C",
    },
    valueExpiring: {
        color: "#E65100",
    },
    loader: { marginVertical: 24 },
    error: {
        color: "#D91E18",
        fontSize: 14,
        marginBottom: 8,
    },
    empty: {
        fontSize: 14,
        color: "#666",
    },
});
