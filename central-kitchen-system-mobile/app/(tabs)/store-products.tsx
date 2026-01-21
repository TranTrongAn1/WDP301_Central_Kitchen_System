import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useProducts } from "@/hooks/use-products";

const formatValue = (value: number | string | null | undefined) =>
  value === null || value === undefined ? "--" : String(value);

export default function StoreProductsScreen() {
  const router = useRouter();
  const { items, isLoading, error, refetch } = useProducts();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Sản phẩm</Text>
        <Pressable style={styles.secondaryButton} onPress={refetch}>
          <Text style={styles.secondaryButtonText}>Làm mới</Text>
        </Pressable>
      </View>

      {isLoading ? <ActivityIndicator color="#D91E18" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.list}>
        {items.map((item) => (
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
          </Pressable>
        ))}
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
