import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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
import { useProducts } from "@/hooks/use-products";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function ProductsTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, isLoading, error, refetch } = useProducts();
  const { addItem, items: cartItems } = useCart();
  const [searchQuery, setSearchQuery] = useState("");

  const handleAddToCart = (product: { _id: string; name: string; price?: number; image?: string }) => {
    addItem({
      productId: product._id,
      productName: product.name,
      price: product.price ?? 0,
      image: product.image,
    }, 1);
  };

  const filteredItems = searchQuery.trim()
    ? items.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : items;

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: 24 + insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Bán hàng</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.refreshBtn} onPress={refetch}>
            <Text style={styles.refreshBtnText}>Làm mới</Text>
          </Pressable>
          <Pressable
            style={styles.cartIconBtn}
            onPress={() => router.push("/(tabs)/cart")}
          >
            <IconSymbol size={24} name="cart.fill" color="#9B0F0F" />
            {cartItems.length > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartItems.length > 99 ? "99+" : cartItems.length}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="Tìm sản phẩm..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {isLoading ? <ActivityIndicator color="#D91E18" style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.grid}>
        {filteredItems.map((item) => (
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
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cartIconBtn: {
    padding: 8,
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D91E18",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
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
