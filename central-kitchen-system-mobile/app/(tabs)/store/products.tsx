import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useProducts } from "@/hooks/use-products";

const formatValue = (value: number | string | null | undefined) =>
  value === null || value === undefined ? "--" : String(value);

export default function StoreProductsScreen() {
  const router = useRouter();
  const { items, isLoading, error, refetch } = useProducts();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const filteredItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return items;
    }
    return items.filter((item) => {
      const name = item.name?.toLowerCase() ?? "";
      const sku = item.sku?.toLowerCase() ?? "";
      return name.includes(trimmed) || sku.includes(trimmed);
    });
  }, [items, query]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Sản phẩm</Text>
        <Pressable style={styles.secondaryButton} onPress={refetch}>
          <Text style={styles.secondaryButtonText}>Làm mới</Text>
        </Pressable>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Tìm theo tên hoặc SKU..."
        style={styles.searchInput}
      />

      {isLoading ? <ActivityIndicator color="#D91E18" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.list}>
        {filteredItems.map((item) => {
          const isAdded = Boolean(selected[item._id]);

          return (
            <Pressable
              key={item._id}
              onPress={() => router.push(`/product/${item._id}`)}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSku}>{formatValue(item.sku)}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardLabel}>Giá</Text>
                <Text style={styles.cardValue}>
                  {item.price
                    ? `${item.price.toLocaleString("vi-VN")} VND`
                    : "--"}
                </Text>
              </View>
              <View style={styles.cardFooter}>
                <Pressable
                  style={[styles.addButton, isAdded && styles.addedButton]}
                  onPress={() =>
                    setSelected((prev) => ({ ...prev, [item._id]: !prev[item._id] }))
                  }
                >
                  <Text style={[styles.addButtonText, isAdded && styles.addedButtonText]}>
                    {isAdded ? "Đã thêm" : "Thêm"}
                  </Text>
                </Pressable>
              </View>
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
    padding: 20,
    backgroundColor: "#FFF4F4",
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
    borderWidth: 1,
    borderColor: "#FFD6D6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: "#FFF",
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
    shadowColor: "#B40000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2A2A2A",
  },
  cardSku: {
    fontSize: 11,
    color: "#8C8C8C",
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  addButton: {
    borderWidth: 1,
    borderColor: "#FFD6D6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addedButton: {
    backgroundColor: "#D91E18",
    borderColor: "#D91E18",
  },
  addButtonText: {
    color: "#9B0F0F",
    fontWeight: "600",
    fontSize: 12,
  },
  addedButtonText: {
    color: "#FFFFFF",
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
  error: {
    color: "#D91E18",
    fontSize: 12,
    marginBottom: 8,
  },
});
