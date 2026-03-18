import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useProductionPlans } from "@/hooks/use-production-plans";
import type { ProductionPlan } from "@/lib/production-plans";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "Planned", label: "Kế hoạch" },
  { value: "In_Progress", label: "Đang làm" },
  { value: "Completed", label: "Hoàn thành" },
  { value: "Cancelled", label: "Đã hủy" },
];

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function productSummary(plan: ProductionPlan): string {
  const details = plan.details ?? [];
  if (details.length === 0) return "—";
  const names = details.slice(0, 2).map((d) => {
    const p = d.productId;
    return typeof p === "object" && p?.name ? p.name : "SP";
  });
  return names.join(", ") + (details.length > 2 ? "..." : "");
}

function plannedQuantity(plan: ProductionPlan): number {
  return (plan.details ?? []).reduce(
    (sum, detail) => sum + (detail.plannedQuantity ?? 0),
    0
  );
}

export default function KitchenOrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const { plans, isLoading, error, refetch } = useProductionPlans({
    status: statusFilter || undefined,
  });

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Đơn sản xuất</Text>
        <Pressable style={styles.refreshBtn} onPress={refetch}>
          <Text style={styles.refreshBtnText}>Làm mới</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statusScroll}
      >
        {STATUS_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[
              styles.statusChip,
              statusFilter === opt.value && styles.statusChipActive,
            ]}
            onPress={() => setStatusFilter(opt.value)}
          >
            <Text
              style={[
                styles.statusChipText,
                statusFilter === opt.value && styles.statusChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color="#D91E18" style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : plans.length === 0 ? (
        <Text style={styles.empty}>Chưa có đơn sản xuất.</Text>
      ) : (
        plans.map((plan) => (
          <View
            key={plan._id}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardCode}>{plan.planCode}</Text>
              <Text
                style={[
                  styles.cardStatus,
                  styles[`status_${plan.status}` as keyof typeof styles],
                ]}
              >
                {plan.status}
              </Text>
            </View>
            <Text style={styles.cardDate}>Ngày: {formatDate(plan.planDate)}</Text>
            <Text style={styles.cardProducts} numberOfLines={2}>
              {productSummary(plan)}
            </Text>
            <Text style={styles.cardMeta}>
              Số dòng: {plan.details?.length ?? 0}
            </Text>
            <Text style={styles.cardMeta}>
              Tổng số lượng cần làm: {plannedQuantity(plan)}
            </Text>

            <View style={styles.cardActions}>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                onPress={() => router.push(`/kitchen/production/${plan._id}`)}
              >
                <Text style={styles.actionBtnPrimaryText}>Vào sản xuất</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnSecondary]}
                onPress={() =>
                  router.push({
                    pathname: "/kitchen/production/orders",
                    params: { planId: plan._id },
                  })
                }
              >
                <Text style={styles.actionBtnSecondaryText}>Xem chi tiết</Text>
              </Pressable>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9B0F0F",
  },
  refreshBtn: {
    borderWidth: 1,
    borderColor: "#FFD6D6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  refreshBtnText: {
    color: "#9B0F0F",
    fontWeight: "600",
    fontSize: 13,
  },
  statusScroll: {
    marginBottom: 16,
    maxHeight: 44,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FFE1E1",
    marginRight: 8,
  },
  statusChipActive: {
    backgroundColor: "#D91E18",
    borderColor: "#D91E18",
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  statusChipTextActive: {
    color: "#fff",
  },
  loader: { marginVertical: 24 },
  error: {
    color: "#D91E18",
    fontSize: 14,
    marginBottom: 12,
  },
  empty: {
    fontSize: 14,
    color: "#666",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FFE1E1",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardCode: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2A2A2A",
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  status_Planned: { color: "#E65100" },
  status_In_Progress: { color: "#1565C0" },
  status_Completed: { color: "#2E7D32" },
  status_Cancelled: { color: "#666" },
  cardDate: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  cardProducts: {
    fontSize: 13,
    color: "#2A2A2A",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: "#8C8C8C",
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  actionBtnPrimary: {
    backgroundColor: "#D91E18",
  },
  actionBtnPrimaryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  actionBtnSecondary: {
    borderWidth: 1,
    borderColor: "#D91E18",
    backgroundColor: "#fff",
  },
  actionBtnSecondaryText: {
    color: "#9B0F0F",
    fontSize: 12,
    fontWeight: "700",
  },
});
