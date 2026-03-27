import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIngredientBatches } from "@/hooks/use-ingredient-batches";
import { useIngredientUsages } from "@/hooks/use-ingredient-usages";
import { useIngredients } from "@/hooks/use-ingredients";
import { useProductionPlans } from "@/hooks/use-production-plans";
import { useProducts } from "@/hooks/use-products";
import type { IngredientUsage, IngredientUsageRef } from "@/lib/ingredient-usages";

type SelectOption = {
    label: string;
    value: string;
};

type UsageFilters = {
    productionPlanId?: string;
    productId?: string;
    ingredientId?: string;
    ingredientBatchId?: string;
    startDate?: string;
    endDate?: string;
};

type PickerKey =
    | "productionPlanId"
    | "productId"
    | "ingredientId"
    | "ingredientBatchId"
    | "startDate"
    | "endDate";

const EMPTY_FILTERS: UsageFilters = {};

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

function readRefId(ref: IngredientUsageRef | undefined): string | undefined {
    if (!ref) return undefined;
    if (typeof ref === "string") return ref;
    return ref._id;
}

function formatNumber(value?: number): string {
    if (value === undefined || value === null || Number.isNaN(value)) return "0";
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(value);
}

function dateOnly(value?: string): string | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString().slice(0, 10);
}

function formatDateLabel(value?: string): string {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function uniqueOptions(options: SelectOption[]): SelectOption[] {
    const seen = new Set<string>();
    const result: SelectOption[] = [];
    for (const opt of options) {
        if (!opt.value || seen.has(opt.value)) continue;
        seen.add(opt.value);
        result.push(opt);
    }
    return result;
}

function createRecentDateOptions(days: number): SelectOption[] {
    const items: SelectOption[] = [];
    const now = new Date();
    for (let i = 0; i <= days; i += 1) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const value = d.toISOString().slice(0, 10);
        items.push({ label: formatDateLabel(value), value });
    }
    return items;
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
    const [draftFilters, setDraftFilters] = useState<UsageFilters>(EMPTY_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState<UsageFilters>(EMPTY_FILTERS);
    const [activePicker, setActivePicker] = useState<PickerKey | null>(null);
    const [pickerSearch, setPickerSearch] = useState("");
    const [filterError, setFilterError] = useState<string | null>(null);

    const { plans } = useProductionPlans();
    const { items: products } = useProducts();
    const { items: ingredients } = useIngredients();
    const { items: ingredientBatches, isLoading: isBatchesLoading } = useIngredientBatches(
        draftFilters.ingredientId,
    );
    const { items, isLoading, error, refetch } = useIngredientUsages(appliedFilters);
    const list = useMemo(() => (Array.isArray(items) ? items : []), [items]);

    const productionPlanOptions = useMemo(
        () =>
            uniqueOptions(
                plans.map((plan) => ({
                    value: plan._id,
                    label: `${plan.planCode || "Plan"} • ${formatDateLabel(plan.planDate)}`,
                })),
            ),
        [plans],
    );

    const productOptions = useMemo(
        () =>
            uniqueOptions(
                products.map((p) => ({
                    value: p._id,
                    label: p.name,
                })),
            ),
        [products],
    );

    const ingredientOptions = useMemo(
        () =>
            uniqueOptions(
                ingredients.map((ing) => ({
                    value: ing._id,
                    label: ing.ingredientName || ing.name,
                })),
            ),
        [ingredients],
    );

    const batchOptions = useMemo(() => {
        const fromBatchApi: SelectOption[] = ingredientBatches.map((b) => ({
            value: b._id,
            label: b.batchCode,
        }));

        const fromUsageData: SelectOption[] = list
            .map((item) => {
                const id = readRefId(item.ingredientBatchId);
                if (!id) return null;
                return {
                    value: id,
                    label: batchCode(item),
                };
            })
            .filter((opt): opt is SelectOption => Boolean(opt));

        return uniqueOptions([...fromBatchApi, ...fromUsageData]);
    }, [ingredientBatches, list]);

    const dateOptions = useMemo(() => {
        const fromUsageData: SelectOption[] = list
            .map((item) => {
                const value = dateOnly(item.recordedAt || item.createdAt);
                if (!value) return null;
                return { value, label: formatDateLabel(value) };
            })
            .filter((opt): opt is SelectOption => Boolean(opt));

        return uniqueOptions([...fromUsageData, ...createRecentDateOptions(180)]);
    }, [list]);

    const selectedLabels = useMemo(() => {
        const mapValue = (options: SelectOption[], value?: string, fallback = "Tất cả") => {
            if (!value) return fallback;
            return options.find((opt) => opt.value === value)?.label ?? value;
        };

        return {
            productionPlanId: mapValue(productionPlanOptions, draftFilters.productionPlanId),
            productId: mapValue(productOptions, draftFilters.productId),
            ingredientId: mapValue(ingredientOptions, draftFilters.ingredientId),
            ingredientBatchId: mapValue(batchOptions, draftFilters.ingredientBatchId),
            startDate: mapValue(dateOptions, draftFilters.startDate, "Không chọn"),
            endDate: mapValue(dateOptions, draftFilters.endDate, "Không chọn"),
        };
    }, [
        batchOptions,
        dateOptions,
        draftFilters.endDate,
        draftFilters.ingredientBatchId,
        draftFilters.ingredientId,
        draftFilters.productId,
        draftFilters.productionPlanId,
        draftFilters.startDate,
        ingredientOptions,
        productOptions,
        productionPlanOptions,
    ]);

    const pickerConfig = useMemo(() => {
        switch (activePicker) {
            case "productionPlanId":
                return { title: "Chọn kế hoạch sản xuất", options: productionPlanOptions };
            case "productId":
                return { title: "Chọn sản phẩm", options: productOptions };
            case "ingredientId":
                return { title: "Chọn nguyên liệu", options: ingredientOptions };
            case "ingredientBatchId":
                return { title: "Chọn batch nguyên liệu", options: batchOptions };
            case "startDate":
                return { title: "Chọn từ ngày", options: dateOptions };
            case "endDate":
                return { title: "Chọn đến ngày", options: dateOptions };
            default:
                return null;
        }
    }, [activePicker, batchOptions, dateOptions, ingredientOptions, productOptions, productionPlanOptions]);

    const filteredPickerOptions = useMemo(() => {
        if (!pickerConfig) return [];
        const keyword = pickerSearch.trim().toLowerCase();
        if (!keyword) return pickerConfig.options;
        return pickerConfig.options.filter((opt) => opt.label.toLowerCase().includes(keyword));
    }, [pickerConfig, pickerSearch]);

    const openPicker = (key: PickerKey) => {
        setActivePicker(key);
        setPickerSearch("");
    };

    const closePicker = () => {
        setActivePicker(null);
    };

    const handleSelectOption = (value: string) => {
        if (!activePicker) return;
        setDraftFilters((prev) => {
            if (activePicker === "ingredientId") {
                return {
                    ...prev,
                    ingredientId: value,
                    ingredientBatchId: undefined,
                };
            }
            return {
                ...prev,
                [activePicker]: value,
            };
        });
        closePicker();
    };

    const handleApplyFilter = () => {
        if (
            draftFilters.startDate &&
            draftFilters.endDate &&
            draftFilters.startDate > draftFilters.endDate
        ) {
            setFilterError("Từ ngày phải nhỏ hơn hoặc bằng đến ngày.");
            return;
        }
        setFilterError(null);
        setAppliedFilters(draftFilters);
    };

    const handleResetFilter = () => {
        setFilterError(null);
        setDraftFilters(EMPTY_FILTERS);
        setAppliedFilters(EMPTY_FILTERS);
    };

    const activeFilterCount = useMemo(
        () =>
            Object.values(appliedFilters).filter(
                (value) => typeof value === "string" && value.trim().length > 0,
            ).length,
        [appliedFilters],
    );

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

            <View style={styles.filterCard}>
                <Text style={styles.filterTitle}>Bộ lọc nâng cao</Text>
                <Text style={styles.filterSubtitle}>
                    Chọn chính xác kế hoạch, sản phẩm, nguyên liệu, batch và khoảng ngày.
                </Text>

                <View style={styles.filterGrid}>
                    <Pressable style={styles.filterField} onPress={() => openPicker("productionPlanId")}>
                        <Text style={styles.filterLabel}>Kế hoạch sản xuất</Text>
                        <Text style={styles.filterValue}>{selectedLabels.productionPlanId}</Text>
                    </Pressable>

                    <Pressable style={styles.filterField} onPress={() => openPicker("productId")}>
                        <Text style={styles.filterLabel}>Sản phẩm</Text>
                        <Text style={styles.filterValue}>{selectedLabels.productId}</Text>
                    </Pressable>

                    <Pressable style={styles.filterField} onPress={() => openPicker("ingredientId")}>
                        <Text style={styles.filterLabel}>Nguyên liệu</Text>
                        <Text style={styles.filterValue}>{selectedLabels.ingredientId}</Text>
                    </Pressable>

                    <Pressable
                        style={styles.filterField}
                        onPress={() => openPicker("ingredientBatchId")}
                        disabled={!draftFilters.ingredientId && batchOptions.length === 0}
                    >
                        <Text style={styles.filterLabel}>Batch nguyên liệu</Text>
                        <Text style={styles.filterValue}>{selectedLabels.ingredientBatchId}</Text>
                    </Pressable>

                    <Pressable style={styles.filterField} onPress={() => openPicker("startDate")}>
                        <Text style={styles.filterLabel}>Từ ngày</Text>
                        <Text style={styles.filterValue}>{selectedLabels.startDate}</Text>
                    </Pressable>

                    <Pressable style={styles.filterField} onPress={() => openPicker("endDate")}>
                        <Text style={styles.filterLabel}>Đến ngày</Text>
                        <Text style={styles.filterValue}>{selectedLabels.endDate}</Text>
                    </Pressable>
                </View>

                {filterError ? <Text style={styles.error}>{filterError}</Text> : null}

                <View style={styles.filterActionRow}>
                    <Pressable style={styles.resetButton} onPress={handleResetFilter}>
                        <Text style={styles.resetButtonText}>Xóa lọc</Text>
                    </Pressable>
                    <Pressable style={styles.applyButton} onPress={handleApplyFilter}>
                        <Text style={styles.applyButtonText}>Áp dụng</Text>
                    </Pressable>
                </View>

                <Text style={styles.filterMeta}>
                    {activeFilterCount > 0
                        ? `Đang áp dụng ${activeFilterCount} bộ lọc.`
                        : "Chưa áp dụng bộ lọc."}
                </Text>

                {isBatchesLoading ? <Text style={styles.loadingMeta}>Đang tải danh sách batch...</Text> : null}
            </View>

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
                            <Text style={[styles.value, { color: '#D91E18' }]}>{formatNumber(item.quantityUsed)}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.label}>Recorded at</Text>
                            <Text style={styles.value}>{formatDateLabel(item.recordedAt || item.createdAt)}</Text>
                        </View>

                        {/* 🚀 HIỂN THỊ GHI CHÚ NẾU CÓ */}
                        {item.note ? (
                            <View style={styles.noteBox}>
                                <Text style={styles.noteLabel}>Ghi chú:</Text>
                                <Text style={styles.noteText}>{item.note}</Text>
                            </View>
                        ) : null}
                    </View>
                ))
            )}

            <Modal
                visible={Boolean(activePicker)}
                animationType="slide"
                transparent
                onRequestClose={closePicker}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{pickerConfig?.title ?? "Chọn"}</Text>
                            <Pressable onPress={closePicker} style={styles.modalCloseBtn}>
                                <Text style={styles.modalCloseText}>Đóng</Text>
                            </Pressable>
                        </View>

                        <TextInput
                            value={pickerSearch}
                            onChangeText={setPickerSearch}
                            placeholder="Nhập từ để tìm nhanh..."
                            placeholderTextColor="#A07B7B"
                            style={styles.searchInput}
                        />

                        <ScrollView style={styles.optionsList}>
                            {filteredPickerOptions.length === 0 ? (
                                <Text style={styles.emptyOptionText}>Không có lựa chọn phù hợp.</Text>
                            ) : (
                                filteredPickerOptions.map((opt) => (
                                    <Pressable
                                        key={opt.value}
                                        style={styles.optionItem}
                                        onPress={() => handleSelectOption(opt.value)}
                                    >
                                        <Text style={styles.optionText}>{opt.label}</Text>
                                    </Pressable>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    filterCard: {
        backgroundColor: "#FFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#FFDADA",
        padding: 12,
        marginBottom: 14,
    },
    filterTitle: {
        color: "#8F0E0E",
        fontWeight: "700",
        fontSize: 15,
        marginBottom: 2,
    },
    filterSubtitle: {
        color: "#8C6666",
        fontSize: 12,
        marginBottom: 10,
    },
    filterGrid: {
        gap: 8,
    },
    filterField: {
        borderWidth: 1,
        borderColor: "#FFE2E2",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#FFF9F9",
    },
    filterLabel: {
        color: "#9E6F6F",
        fontSize: 11,
        marginBottom: 2,
    },
    filterValue: {
        color: "#2A2A2A",
        fontSize: 13,
        fontWeight: "600",
    },
    filterActionRow: {
        marginTop: 10,
        flexDirection: "row",
        gap: 8,
    },
    resetButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#E8B8B8",
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        backgroundColor: "#FFF",
    },
    resetButtonText: {
        color: "#8F0E0E",
        fontSize: 13,
        fontWeight: "600",
    },
    applyButton: {
        flex: 1,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        backgroundColor: "#D91E18",
    },
    applyButtonText: {
        color: "#FFF",
        fontSize: 13,
        fontWeight: "700",
    },
    filterMeta: {
        marginTop: 10,
        color: "#755C5C",
        fontSize: 12,
    },
    loadingMeta: {
        marginTop: 4,
        color: "#8C6666",
        fontSize: 12,
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

    // 🚀 STYLES DÀNH CHO CÁI GHI CHÚ
    noteBox: {
        marginTop: 10,
        backgroundColor: '#FFF9F9',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFEAEA',
    },
    noteLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#D91E18',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    noteText: {
        fontSize: 13,
        color: '#444',
        fontStyle: 'italic',
        lineHeight: 18,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        justifyContent: "flex-end",
    },
    modalSheet: {
        maxHeight: "75%",
        backgroundColor: "#FFF",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 14,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    modalTitle: {
        color: "#8F0E0E",
        fontWeight: "700",
        fontSize: 16,
    },
    modalCloseBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    modalCloseText: {
        color: "#9B0F0F",
        fontWeight: "600",
    },
    searchInput: {
        borderWidth: 1,
        borderColor: "#FFD8D8",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: "#2A2A2A",
        marginBottom: 10,
        backgroundColor: "#FFF9F9",
    },
    optionsList: {
        maxHeight: 380,
    },
    optionItem: {
        borderWidth: 1,
        borderColor: "#FFE6E6",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 11,
        marginBottom: 8,
        backgroundColor: "#FFF",
    },
    optionText: {
        color: "#2A2A2A",
        fontSize: 14,
    },
    emptyOptionText: {
        color: "#8C6666",
        fontSize: 13,
        paddingVertical: 12,
    },
});