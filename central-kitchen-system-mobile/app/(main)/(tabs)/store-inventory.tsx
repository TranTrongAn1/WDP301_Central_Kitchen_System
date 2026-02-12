import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cardShadowSmall } from "@/constants/theme";
import { useStoreInventory } from "@/hooks/use-store-inventory";

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

export default function StoreInventoryScreen() {
  const insets = useSafeAreaInsets();
  const { items, isLoading, error, refetch } = useStoreInventory();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = searchQuery.trim()
    ? items.filter(
        (p) =>
          p.productName
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase().trim()) ||
          p.sku?.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : items;

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: 20 + insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Kho</Text>
        <Pressable style={styles.secondaryButton} onPress={refetch}>
          <Text style={styles.secondaryButtonText}>Làm mới</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Tìm theo tên hoặc SKU..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {isLoading ? (
        <ActivityIndicator color="#D91E18" style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : filteredItems.length === 0 ? (
        <Text style={styles.empty}>Không có dữ liệu tồn kho.</Text>
      ) : (
        <View style={styles.list}>
          {filteredItems.map((item) => (
            <View
              key={item.productId}
              style={[
                styles.card,
                (item.lowStock || item.expiringSoon) && styles.cardWarning,
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.productName || "—"}</Text>
                <Text style={styles.cardSku}>{formatValue(item.sku)}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Tổng số lượng tồn</Text>
                <Text style={styles.cardValue}>
                  {formatValue(item.totalQuantity)}
                </Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Số batch</Text>
                <Text style={styles.cardValue}>
                  {formatValue(item.batchCount)}
                </Text>
              </View>
              {item.earliestExpiry ? (
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Hạn sớm nhất</Text>
                  <Text
                    style={[
                      styles.cardValue,
                      item.expiringSoon && styles.valueExpiring,
                    ]}
                  >
                    {formatDate(item.earliestExpiry)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.badges}>
                {item.lowStock ? (
                  <View style={styles.badgeLow}>
                    <Text style={styles.badgeLowText}>Sắp hết hàng</Text>
                  </View>
                ) : null}
                {item.expiringSoon ? (
                  <View style={styles.badgeExpiring}>
                    <Text style={styles.badgeExpiringText}>Sắp hết hạn</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9B0F0F",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#FFD6D6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: "#9B0F0F",
    fontWeight: "600",
    fontSize: 12,
  },
  searchInput: {
    height: 44,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE1E1",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#2A2A2A",
    marginBottom: 16,
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
  list: {
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FFE1E1",
    ...cardShadowSmall,
    elevation: 1,
  },
  cardWarning: {
    borderColor: "#E65100",
    backgroundColor: "#FFF8E1",
  },
  cardHeader: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2A2A2A",
  },
  cardSku: {
    fontSize: 12,
    color: "#8C8C8C",
    marginTop: 2,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
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
  valueExpiring: {
    color: "#E65100",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  badgeLow: {
    backgroundColor: "#FFCDD2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeLowText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#B71C1C",
  },
  badgeExpiring: {
    backgroundColor: "#FFE0B2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeExpiringText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#E65100",
  },
});
