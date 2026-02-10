import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { cardShadowSmall } from "@/constants/theme";
import { useCart } from "@/context/cart-context";
import { useProducts } from "@/hooks/use-products";

export default function ProductsTabScreen() {
  const router = useRouter();
  const { items, isLoading, error, refetch } = useProducts();
  const { addItem } = useCart();

  const handleAddToCart = (product: { _id: string; name: string; price?: number; image?: string }) => {
    addItem({
      productId: product._id,
      productName: product.name,
      price: product.price ?? 0,
      image: product.image,
    }, 1);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Sản phẩm</Text>
        <Pressable style={styles.refreshBtn} onPress={refetch}>
          <Text style={styles.refreshBtnText}>Làm mới</Text>
        </Pressable>
      </View>

      {isLoading ? <ActivityIndicator color="#D91E18" style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.grid}>
        {items.map((item) => (
          <Pressable
            key={item._id}
            style={styles.card}
            onPress={() => router.push(`/product/${item._id}`)}
          >
            <View style={styles.imageWrap}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>📦</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.cardPrice}>
              {item.price != null ? `${item.price.toLocaleString("vi-VN")} đ` : "—"}
            </Text>
            <Pressable
              style={styles.addBtn}
              onPress={(e) => {
                e.stopPropagation();
                handleAddToCart(item);
              }}
            >
              <Text style={styles.addBtnText}>Thêm vào giỏ</Text>
            </Pressable>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    backgroundColor: "#FFF4F4",
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
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
  loader: { marginVertical: 20 },
  error: {
    color: "#D91E18",
    fontSize: 13,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFE1E1",
    ...cardShadowSmall,
  },
  imageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
    marginBottom: 8,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: { fontSize: 32 },
  cardName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2A2A2A",
    marginBottom: 4,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9B0F0F",
    marginBottom: 8,
  },
  addBtn: {
    backgroundColor: "#D91E18",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
