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

export default function KitchenHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [planDate, setPlanDate] = useState("");
  const { plans, isLoading, error, refetch } = useProductionPlans({
    status: "Completed",
    planDate: planDate || undefined,
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Lịch sử sản xuất</Text>
        <Pressable style={styles.refreshBtn} onPress={refetch}>
          <Text style={styles.refreshBtnText}>Làm mới</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        <Pressable
          style={[styles.filterChip, !planDate && styles.filterChipActive]}
          onPress={() => setPlanDate("")}
        >
          <Text
            style={[
              styles.filterChipText,
              !planDate && styles.filterChipTextActive,
            ]}
          >
            Tất cả
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, planDate === today && styles.filterChipActive]}
          onPress={() => setPlanDate(today)}
        >
          <Text
            style={[
              styles.filterChipText,
              planDate === today && styles.filterChipTextActive,
            ]}
          >
            Hôm nay
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#D91E18" style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : plans.length === 0 ? (
        <Text style={styles.empty}>Chưa có đơn hoàn thành.</Text>
      ) : (
        plans.map((plan) => (
          <Pressable
            key={plan._id}
            style={styles.card}
            onPress={() => router.push(`/kitchen/production/${plan._id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardCode}>{plan.planCode}</Text>
              <Text style={styles.cardDate}>
                {formatDate(plan.planDate)}
              </Text>
            </View>
            <Text style={styles.cardProducts} numberOfLines={2}>
              {productSummary(plan)}
            </Text>
            <Text style={styles.cardMeta}>
              Số dòng: {plan.details?.length ?? 0} • Hoàn thành
            </Text>
          </Pressable>
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
  filters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FFE1E1",
  },
  filterChipActive: {
    backgroundColor: "#D91E18",
    borderColor: "#D91E18",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9B0F0F",
  },
  filterChipTextActive: {
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
  cardDate: {
    fontSize: 13,
    color: "#666",
  },
  cardProducts: {
    fontSize: 13,
    color: "#2A2A2A",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: "#8C8C8C",
  },
});
