import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cardShadowSmall } from "@/constants/theme";
import { useIngredientBatches } from "@/hooks/use-ingredient-batches";
import type { IngredientBatch } from "@/lib/ingredient-batches";

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const today = new Date();
  const d = new Date(dateStr);
  const diffMs = d.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export default function IngredientBatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ingredientId, name } = useLocalSearchParams<{
    ingredientId?: string;
    name?: string;
  }>();
  const { items, isLoading, error, refetch } = useIngredientBatches(
    ingredientId,
  );

  const cards = useMemo(() => items ?? [], [items]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: 16 + insets.top },
      ]}
    >
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Kho nguyên liệu</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>
        Lô nguyên liệu
        {name ? ` - ${name}` : ""}
      </Text>

      <View style={styles.actionsRow}>
        <Pressable style={styles.secondaryButton} onPress={refetch}>
          <Text style={styles.secondaryButtonText}>Làm mới</Text>
        </Pressable>
        {ingredientId ? (
          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              router.push({
                pathname: "/kitchen/ingredient-batch-create",
                params: { ingredientId, name },
              })
            }
          >
            <Text style={styles.primaryButtonText}>Tạo lô mới</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? <ActivityIndicator color="#D91E18" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.list}>
        {cards.map((batch: IngredientBatch) => {
          const days = daysUntil(batch.expiryDate);
          const isNear =
            days !== null && days <= 30 && days >= 0;
          const isExpired = days !== null && days < 0;

          return (
            <Pressable
              key={batch._id}
              style={[
                styles.card,
                isNear && styles.cardNear,
                isExpired && styles.cardExpired,
              ]}
              onPress={() =>
                router.push({
                  pathname: "/kitchen/batch/[id]",
                  params: { id: batch._id },
                })
              }
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{batch.batchCode}</Text>
                <Text style={styles.cardMetaText}>
                  HSD: {batch.expiryDate}
                </Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Số lượng ban đầu</Text>
                <Text style={styles.cardValue}>{batch.initialQuantity}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Số lượng còn lại</Text>
                <Text style={styles.cardValue}>{batch.currentQuantity}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Giá nhập</Text>
                <Text style={styles.cardValue}>
                  {batch.price.toLocaleString("vi-VN")} đ
                </Text>
              </View>
              {days !== null ? (
                <View style={styles.badgeRow}>
                  <Text
                    style={[
                      styles.badge,
                      isExpired
                        ? styles.badgeExpired
                        : isNear
                          ? styles.badgeNear
                          : styles.badgeSafe,
                    ]}
                  >
                    {isExpired
                      ? `ĐÃ HẾT HẠN (${days} ngày)`
                      : `Còn ${days} ngày`}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#FFF4F4",
  },
  header: {
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
    fontSize: 18,
    fontWeight: "700",
    color: "#9B0F0F",
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#D91E18",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
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
  list: {
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0F2F1",
    ...cardShadowSmall,
  },
  cardNear: {
    borderColor: "#EF6C00",
    backgroundColor: "#FFF3E0",
  },
  cardExpired: {
    borderColor: "#C62828",
    backgroundColor: "#FFEBEE",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2A2A2A",
  },
  cardMetaText: {
    fontSize: 12,
    color: "#8C8C8C",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: "#8C8C8C",
  },
  cardValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2A2A2A",
  },
  badgeRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  badgeSafe: {
    backgroundColor: "#2E7D32",
  },
  badgeNear: {
    backgroundColor: "#EF6C00",
  },
  badgeExpired: {
    backgroundColor: "#C62828",
  },
  error: {
    color: "#C62828",
    fontSize: 12,
    marginBottom: 8,
  },
});

