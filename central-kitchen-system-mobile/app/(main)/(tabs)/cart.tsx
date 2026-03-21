import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cardShadowSmall } from "@/constants/theme";
import { useCart } from "@/context/cart-context";
import { useNotification } from "@/context/notification-context";

type QuantityDraftMap = Record<string, string>;
type SelectionMap = Record<string, boolean>;

export default function CartTabScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { items, updateQuantity, removeItem } = useCart();
    const { showToast } = useNotification();

    const [selectedMap, setSelectedMap] = useState<SelectionMap>({});
    const [quantityDrafts, setQuantityDrafts] = useState<QuantityDraftMap>({});

    useEffect(() => {
        setSelectedMap((prev) => {
            const next: SelectionMap = {};
            for (const item of items) {
                next[item.productId] = prev[item.productId] ?? true;
            }
            return next;
        });

        setQuantityDrafts((prev) => {
            const next: QuantityDraftMap = {};
            for (const item of items) {
                next[item.productId] = prev[item.productId] ?? String(item.quantity);
            }
            return next;
        });
    }, [items]);

    const selectedItems = useMemo(
        () => items.filter((item) => selectedMap[item.productId] && item.quantity > 0),
        [items, selectedMap],
    );

    const selectedSubtotal = useMemo(
        () => selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        [selectedItems],
    );

    const toggleSelected = (productId: string) => {
        setSelectedMap((prev) => ({ ...prev, [productId]: !prev[productId] }));
    };

    const handleQuantityTextChange = (productId: string, value: string) => {
        const digitsOnly = value.replace(/[^0-9]/g, "");
        setQuantityDrafts((prev) => ({ ...prev, [productId]: digitsOnly }));

        if (!digitsOnly) return;

        const parsed = Number.parseInt(digitsOnly, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
            updateQuantity(productId, parsed);
        }
    };

    const handleQuantityBlur = (productId: string, currentQty: number) => {
        const raw = quantityDrafts[productId] ?? "";
        const parsed = Number.parseInt(raw, 10);
        const nextQty = Number.isFinite(parsed) && parsed > 0 ? parsed : currentQty;

        setQuantityDrafts((prev) => ({ ...prev, [productId]: String(nextQty) }));
        if (nextQty !== currentQty) {
            updateQuantity(productId, nextQty);
        }
    };

    const handleGoCheckout = () => {
        if (selectedItems.length === 0) {
            showToast("Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.", "error");
            return;
        }

        const ids = selectedItems.map((item) => item.productId).join(",");
        router.push(`/(tabs)/checkout?selectedIds=${encodeURIComponent(ids)}` as any);
    };

    return (
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top }]}>
            {items.length === 0 ? (
                <View style={[styles.empty, { paddingTop: insets.top }]}>
                    <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
                    <Text style={styles.emptySub}>Thêm sản phẩm từ tab Bán hàng</Text>
                    <Pressable
                        style={styles.emptyBtn}
                        onPress={() => router.replace("/(tabs)/products" as any)}
                    >
                        <Text style={styles.emptyBtnText}>Đến Bán hàng</Text>
                    </Pressable>
                </View>
            ) : null}

            <View style={styles.headerRow}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backText}>Quay lại</Text>
                </Pressable>
            </View>
            <Text style={styles.title}>Giỏ hàng</Text>
            <Text style={styles.helper}>Tick chọn sản phẩm cần tạo đơn. Có thể nhập tay số lượng lớn.</Text>

            {items.map((item) => {
                const isSelected = !!selectedMap[item.productId];

                return (
                    <View key={item.productId} style={styles.row}>
                        <Pressable
                            style={[styles.checkbox, isSelected && styles.checkboxSelected]}
                            onPress={() => toggleSelected(item.productId)}
                        >
                            {isSelected ? <Text style={styles.checkboxTick}>✓</Text> : null}
                        </Pressable>

                        <View style={styles.thumb}>
                            {item.image ? (
                                <Image source={{ uri: item.image }} style={styles.thumbImg} resizeMode="cover" />
                            ) : (
                                <View style={styles.thumbPlaceholder}><Text>BOX</Text></View>
                            )}
                        </View>

                        <View style={styles.info}>
                            <Text style={styles.name} numberOfLines={2}>{item.productName}</Text>
                            <Text style={styles.price}>{item.price.toLocaleString("vi-VN")} đ</Text>

                            <View style={styles.qtyRow}>
                                <Text style={styles.qtyLabel}>Số lượng</Text>
                                <TextInput
                                    style={styles.qtyInput}
                                    value={quantityDrafts[item.productId] ?? String(item.quantity)}
                                    onChangeText={(v) => handleQuantityTextChange(item.productId, v)}
                                    onBlur={() => handleQuantityBlur(item.productId, item.quantity)}
                                    keyboardType="number-pad"
                                    selectTextOnFocus
                                />
                                <Pressable style={styles.removeBtn} onPress={() => removeItem(item.productId)}>
                                    <Text style={styles.removeBtnText}>Xóa</Text>
                                </Pressable>
                            </View>

                            <Text style={styles.lineTotal}>
                                Thành tiền: {(item.price * item.quantity).toLocaleString("vi-VN")} đ
                            </Text>
                        </View>
                    </View>
                );
            })}

            <View style={[styles.summary, cardShadowSmall]}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tạm tính (đã chọn)</Text>
                    <Text style={styles.summaryValue}>{selectedSubtotal.toLocaleString("vi-VN")} đ</Text>
                </View>
                <Text style={styles.summaryHint}>Sản phẩm đã chọn: {selectedItems.length}</Text>
            </View>

            <Pressable
                style={[styles.checkoutBtn, selectedItems.length === 0 && styles.checkoutBtnDisabled]}
                onPress={handleGoCheckout}
                disabled={selectedItems.length === 0}
            >
                <Text style={styles.checkoutBtnText}>Thanh toán</Text>
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
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
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
        marginBottom: 8,
    },
    helper: {
        fontSize: 13,
        color: "#666",
        marginBottom: 14,
    },
    empty: {
        flex: 1,
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFF4F4",
    },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: "#2A2A2A", marginBottom: 8 },
    emptySub: { fontSize: 14, color: "#666", marginBottom: 16 },
    emptyBtn: {
        backgroundColor: "#D91E18",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
    },
    emptyBtnText: { color: "#fff", fontWeight: "600" },
    row: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#FFE1E1",
        ...cardShadowSmall,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#9B0F0F",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
        marginTop: 2,
    },
    checkboxSelected: {
        backgroundColor: "#9B0F0F",
    },
    checkboxTick: {
        color: "#fff",
        fontWeight: "700",
    },
    thumb: {
        width: 64,
        height: 64,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#F5F5F5",
        marginRight: 12,
    },
    thumbImg: { width: "100%", height: "100%" },
    thumbPlaceholder: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    info: { flex: 1 },
    name: { fontSize: 14, fontWeight: "600", color: "#2A2A2A", marginBottom: 4 },
    price: { fontSize: 13, color: "#9B0F0F", marginBottom: 10 },
    qtyRow: { flexDirection: "row", alignItems: "center" },
    qtyLabel: { fontSize: 13, color: "#555", marginRight: 8 },
    qtyInput: {
        minWidth: 72,
        borderWidth: 1,
        borderColor: "#D7D7D7",
        borderRadius: 8,
        backgroundColor: "#fff",
        paddingHorizontal: 10,
        paddingVertical: 6,
        fontSize: 14,
        fontWeight: "600",
        color: "#2A2A2A",
    },
    removeBtn: { marginLeft: 10 },
    removeBtnText: { fontSize: 13, color: "#D91E18", fontWeight: "600" },
    lineTotal: {
        marginTop: 8,
        fontSize: 13,
        color: "#444",
        fontWeight: "600",
    },
    summary: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#FFE1E1",
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    summaryLabel: { fontSize: 14, color: "#666" },
    summaryValue: { fontSize: 16, fontWeight: "700", color: "#9B0F0F" },
    summaryHint: {
        marginTop: 6,
        fontSize: 12,
        color: "#7A7A7A",
    },
    checkoutBtn: {
        backgroundColor: "#D91E18",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    checkoutBtnDisabled: { opacity: 0.6 },
    checkoutBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
