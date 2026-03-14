import { useRouter } from "expo-router";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIngredientUsages } from "@/hooks/use-ingredient-usages";
import type { IngredientUsage, IngredientUsageRef } from "@/lib/ingredient-usages";

function readRefName(
    ref: IngredientUsageRef | undefined,
    keys: string[],
    fallback = "—",
): string {
    if (!ref) return fallback;
    if (typeof ref === "string") return ref;

    for (const key of keys) {
        const value = (ref as Record<string, unknown>)[key];
        if (typeof value === "string" && value.trim().length > 0) {
            return value;
        }
    }

    return ref._id ?? fallback;
}

function formatNumber(value?: number): string {
    if (value === undefined || value === null || Number.isNaN(value)) return "0";
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(value);
}

function ingredientName(item: IngredientUsage): string {
    return readRefName(item.ingredientId, ["ingredientName", "name"], "Nguyên liệu");
}

function batchCode(item: IngredientUsage): string {
    return readRefName(item.ingredientBatchId, ["batchCode"], "—");
}

function planCode(item: IngredientUsage): string {
    return readRefName(item.productionPlanId, ["planCode"], "—");
}

function productName(item: IngredientUsage): string {
    return readRefName(item.productId, ["name"], "Sản phẩm");
}

export default function IngredientUsagesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { items, isLoading, error, refetch } = useIngredientUsages();
    const list = Array.isArray(items) ? items : [];

    return (
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top }]}>
            <View style={styles.headerRow}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backText}>‹ Quay lại</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={refetch}>
                    <Text style={styles.secondaryButtonText}>Làm mới</Text>
                </Pressable>
            </View>

            <Text style={styles.title}>Lịch sử sử dụng nguyên liệu</Text>

            {isLoading ? <ActivityIndicator color="#D91E18" style={styles.loader} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {list.length === 0 && !isLoading ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>Chưa có dữ liệu sử dụng nguyên liệu.</Text>
                </View>
            ) : (
                list.map((item, index) => (
                    <View key={item._id ?? String(index)} style={styles.card}>
                        <Text style={styles.ingredientName}>{ingredientName(item)}</Text>
                        <View style={styles.metaRow}>
                            <Text style={styles.label}>Batch</Text>
                            <Text style={styles.value}>{batchCode(item)}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.label}>Plan code</Text>
                            <Text style={styles.value}>{planCode(item)}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.label}>Product name</Text>
                            <Text style={styles.value}>{productName(item)}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.label}>Quantity used</Text>
                            <Text style={styles.value}>{formatNumber(item.quantityUsed)}</Text>
                        </View>
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
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    backBtn: { paddingVertical: 4, paddingRight: 8 },
    backText: { fontSize: 14, color: "#9B0F0F", fontWeight: "600" },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#9B0F0F",
        marginBottom: 12,
    },
    secondaryButton: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#FFD6D6",
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    secondaryButtonText: {
        color: "#9B0F0F",
        fontWeight: "600",
        fontSize: 12,
    },
    loader: {
        marginVertical: 12,
    },
    error: {
        color: "#D91E18",
        fontSize: 13,
        marginBottom: 8,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#FFE1E1",
    },
    ingredientName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#2A2A2A",
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
        gap: 8,
    },
    label: {
        fontSize: 12,
        color: "#8C8C8C",
    },
    value: {
        fontSize: 12,
        fontWeight: "600",
        color: "#2A2A2A",
        flexShrink: 1,
        textAlign: "right",
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
});
