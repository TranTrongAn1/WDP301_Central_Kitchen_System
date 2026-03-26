import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { cardShadowSmall } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useStoreInventoryDetail } from "@/hooks/use-store-inventory-detail";
import { storeInventoryApi } from "@/lib/api";

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

function sanitizeQuantityInput(value: string): string {
    return value.replace(/[^0-9]/g, "");
}

function parsePositiveInt(value: string | undefined): number {
    if (!value) return 0;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }
    return parsed;
}

export default function StoreInventoryDetailScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { token, user } = useAuth();
    const { productId } = useLocalSearchParams<{ productId: string }>();
    const [saleMode, setSaleMode] = useState<"manual" | "auto">("manual");
    const [manualInputs, setManualInputs] = useState<Record<string, string>>({});
    const [autoQuantityInput, setAutoQuantityInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { product, batches, isLoading, error, refetch } =
        useStoreInventoryDetail(productId || null);

    const totalStock = useMemo(
        () => batches.reduce((sum, batch) => sum + (batch.quantity ?? 0), 0),
        [batches]
    );

    const manualTotal = useMemo(
        () =>
            batches.reduce(
                (sum, batch) => sum + parsePositiveInt(manualInputs[batch._id]),
                0
            ),
        [batches, manualInputs]
    );

    const autoQuantity = parsePositiveInt(autoQuantityInput);

    const handleManualInputChange = (batchId: string, value: string) => {
        setManualInputs((prev) => ({
            ...prev,
            [batchId]: sanitizeQuantityInput(value),
        }));
    };

    const handleAutoQuantityChange = (value: string) => {
        setAutoQuantityInput(sanitizeQuantityInput(value));
    };

    const handleSellInventory = async () => {
        if (!user?.storeId) {
            Alert.alert("Lỗi", "Không tìm thấy thông tin cửa hàng để trừ kho.");
            return;
        }

        const targetProductId = product?._id || productId;
        if (!targetProductId) {
            Alert.alert("Lỗi", "Không tìm thấy mã sản phẩm để trừ kho.");
            return;
        }

        let items: { productId: string; quantity: number; batchId?: string }[] = [];

        if (saleMode === "manual") {
            for (const batch of batches) {
                const quantity = parsePositiveInt(manualInputs[batch._id]);
                if (quantity <= 0) continue;

                if (quantity > batch.quantity) {
                    Alert.alert(
                        "Lỗi nhập liệu",
                        `Số lượng bán của ${batch.batchCode} vượt quá tồn kho (${batch.quantity}).`
                    );
                    return;
                }

                items.push({
                    productId: targetProductId,
                    quantity,
                    batchId: batch._id,
                });
            }

            if (items.length === 0) {
                Alert.alert("Thiếu dữ liệu", "Vui lòng nhập số lượng bán cho ít nhất một lô.");
                return;
            }
        } else {
            if (autoQuantity <= 0) {
                Alert.alert("Thiếu dữ liệu", "Vui lòng nhập số lượng bánh đã bán.");
                return;
            }

            if (autoQuantity > totalStock) {
                Alert.alert(
                    "Số lượng không hợp lệ",
                    `Số lượng bán (${autoQuantity}) lớn hơn tồn kho hiện tại (${totalStock}).`
                );
                return;
            }

            items = [{ productId: targetProductId, quantity: autoQuantity }];
        }

        try {
            setIsSubmitting(true);
            const response = await storeInventoryApi.sell(
                {
                    storeId: user.storeId,
                    items,
                },
                token
            );

            setManualInputs({});
            setAutoQuantityInput("");
            await refetch();
            Alert.alert(
                "Thành công",
                response.success
                    ? "Đã trừ kho thành công."
                    : "Đã gửi yêu cầu trừ kho.",
                [
                    {
                        text: "OK",
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (err) {
            Alert.alert("Lỗi", err instanceof Error ? err.message : "Không thể trừ kho.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: 20 + insets.top }]}>
            {/* Header with back button */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <IconSymbol name="chevron.left" size={24} color="#9B0F0F" />
                    <Text style={styles.backButtonText}>Quay lại</Text>
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

            <View style={styles.cartCard}>
                <Text style={styles.cartTitle}>Cart quản lý kho</Text>

                <View style={styles.modeRow}>
                    <Pressable
                        style={[styles.modeButton, saleMode === "manual" && styles.modeButtonActive]}
                        onPress={() => setSaleMode("manual")}
                    >
                        <Text
                            style={[
                                styles.modeButtonText,
                                saleMode === "manual" && styles.modeButtonTextActive,
                            ]}
                        >
                            Thủ công
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[styles.modeButton, saleMode === "auto" && styles.modeButtonActive]}
                        onPress={() => setSaleMode("auto")}
                    >
                        <Text
                            style={[
                                styles.modeButtonText,
                                saleMode === "auto" && styles.modeButtonTextActive,
                            ]}
                        >
                            Tự động
                        </Text>
                    </Pressable>
                </View>

                <Text style={styles.stockHint}>Tổng tồn kho hiện tại: {totalStock}</Text>

                {saleMode === "auto" ? (
                    <View style={styles.autoInputWrap}>
                        <Text style={styles.autoInputLabel}>Số lượng bánh đã bán</Text>
                        <TextInput
                            value={autoQuantityInput}
                            onChangeText={handleAutoQuantityChange}
                            keyboardType="number-pad"
                            placeholder="Nhập số lượng"
                            style={styles.quantityInput}
                        />
                        {autoQuantity > totalStock && (
                            <Text style={styles.validationError}>
                                Số lượng nhập vào không được lớn hơn tồn kho.
                            </Text>
                        )}
                    </View>
                ) : (
                    <Text style={styles.manualHint}>
                        Chọn Thủ công để nhập số lượng bán trực tiếp tại từng lô bên dưới.
                    </Text>
                )}

                <Text style={styles.selectedHint}>
                    {saleMode === "manual"
                        ? `Tổng số lượng đã nhập: ${manualTotal}`
                        : `Số lượng sẽ trừ theo FEFO: ${autoQuantity}`}
                </Text>

                <Pressable
                    style={[styles.sellButton, isSubmitting && styles.sellButtonDisabled]}
                    disabled={isSubmitting || isLoading}
                    onPress={handleSellInventory}
                >
                    <Text style={styles.sellButtonText}>
                        {isSubmitting ? "Đang xử lý..." : "Xác nhận trừ kho"}
                    </Text>
                </Pressable>
            </View>

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

                                {saleMode === "manual" && (
                                    <View style={styles.manualInputBlock}>
                                        <Text style={styles.manualInputLabel}>Số bánh đã bán</Text>
                                        <TextInput
                                            value={manualInputs[batch._id] ?? ""}
                                            onChangeText={(value) =>
                                                handleManualInputChange(batch._id, value)
                                            }
                                            keyboardType="number-pad"
                                            placeholder="0"
                                            style={styles.quantityInput}
                                        />
                                        {parsePositiveInt(manualInputs[batch._id]) >
                                            batch.quantity && (
                                                <Text style={styles.validationError}>
                                                    Số lượng nhập vào vượt quá tồn kho của lô này.
                                                </Text>
                                            )}
                                    </View>
                                )}
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
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    backButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#9B0F0F",
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
    cartCard: {
        padding: 16,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#FFE1E1",
        marginBottom: 24,
        ...cardShadowSmall,
        elevation: 1,
    },
    cartTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#9B0F0F",
        marginBottom: 12,
    },
    modeRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 10,
    },
    modeButton: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#F0B6B6",
        paddingVertical: 10,
        alignItems: "center",
        backgroundColor: "#FFF7F7",
    },
    modeButtonActive: {
        backgroundColor: "#9B0F0F",
        borderColor: "#9B0F0F",
    },
    modeButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#9B0F0F",
    },
    modeButtonTextActive: {
        color: "#FFFFFF",
    },
    stockHint: {
        fontSize: 12,
        color: "#444",
        marginBottom: 8,
    },
    autoInputWrap: {
        marginBottom: 8,
    },
    autoInputLabel: {
        fontSize: 12,
        color: "#666",
        marginBottom: 6,
    },
    manualHint: {
        fontSize: 12,
        color: "#666",
        marginBottom: 8,
    },
    selectedHint: {
        fontSize: 12,
        color: "#2A2A2A",
        marginBottom: 10,
        fontWeight: "600",
    },
    quantityInput: {
        height: 40,
        borderWidth: 1,
        borderColor: "#FFD1D1",
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: "#FFFFFF",
        fontSize: 13,
        color: "#2A2A2A",
    },
    validationError: {
        marginTop: 6,
        color: "#B71C1C",
        fontSize: 11,
    },
    sellButton: {
        marginTop: 4,
        height: 42,
        borderRadius: 10,
        backgroundColor: "#9B0F0F",
        alignItems: "center",
        justifyContent: "center",
    },
    sellButtonDisabled: {
        opacity: 0.6,
    },
    sellButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "700",
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
    manualInputBlock: {
        marginTop: 8,
    },
    manualInputLabel: {
        fontSize: 12,
        color: "#666",
        marginBottom: 6,
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
