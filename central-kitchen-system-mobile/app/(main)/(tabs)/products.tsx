import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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

// Hàm định dạng tiền tệ Việt Nam
const formatPrice = (price?: number | null) =>
  price != null ? `${price.toLocaleString("vi-VN")} đ` : "—";

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

  // ✅ XỬ LÝ LỌC VÀ SẮP XẾP SẢN PHẨM CỰC KỲ TỐI ƯU ✅
  const processedItems = useMemo(() => {
    if (!items) return [];

    // 1. Lọc bỏ các sản phẩm đã ngừng kinh doanh (isActive = false)
    const activeItems = items.filter((item) => item.isActive !== false);

    // 2. Phân loại sản phẩm còn hàng và hết hàng
    const availableItems = activeItems.filter(item => !item.isOutOfStock);
    const outOfStockItems = activeItems.filter(item => item.isOutOfStock);

    // (Tùy chọn) Sắp xếp mỗi nhóm theo tên để dễ tìm kiếm
    availableItems.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    outOfStockItems.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    // 3. Ghép 2 nhóm lại, sản phẩm còn hàng đứng trước
    return [...availableItems, ...outOfStockItems];
  }, [items]);

  // Áp dụng tìm kiếm trên danh sách đã được sắp xếp
  const filteredItems = searchQuery.trim()
    ? processedItems.filter((p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase().trim())
    )
    : processedItems;

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
            onPress={() => router.push("/(main)/(tabs)/cart")}
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
        {filteredItems.map((item) => {
          // KIỂM TRA TRẠNG THÁI HẾT HÀNG
          const isOutOfStock = item.isOutOfStock === true;

          return (
            <Pressable
              key={item._id}
              style={[styles.card, isOutOfStock && styles.cardOutOfStock]}
              // Khóa sự kiện chuyển trang nếu hết hàng
              onPress={() => !isOutOfStock && router.push(`/product/${item._id}`)}
              disabled={isOutOfStock}
            >
              {/* DẢI BĂNG BÁO HẾT HÀNG */}
              {isOutOfStock && (
                <View style={styles.outOfStockOverlay}>
                  <Text style={styles.outOfStockText}>TẠM HẾT HÀNG</Text>
                </View>
              )}

              <View style={styles.imageWrap}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
                ) : (
                  // ✅ HÌNH ẢNH THAY THẾ KHI SẢN PHẨM KHÔNG CÓ ẢNH (PLACEHOLDER) ✅
                  <View style={styles.imagePlaceholder}>
                    <Text style={{ fontSize: 32 }}>📦</Text>
                    <Text style={styles.imagePlaceholderLabel}>Không có ảnh</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.cardPrice}>
                {formatPrice(item.price)}
              </Text>

              {/* NÚT THÊM VÀO GIỎ */}
              <Pressable
                style={[styles.addBtn, isOutOfStock && styles.addBtnDisabled]}
                disabled={isOutOfStock} // Khóa nút bấm
                onPress={(e) => {
                  e.stopPropagation();
                  handleAddToCart(item);
                }}
              >
                <Text style={[styles.addBtnText, isOutOfStock && styles.addBtnTextDisabled]}>
                  {isOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}
                </Text>
              </Pressable>
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
    overflow: "hidden", // Đảm bảo overlay không bị tràn ra viền cong
  },
  // Hiệu ứng làm mờ khi hết hàng
  cardOutOfStock: {
    opacity: 0.55,
    backgroundColor: "#F9F9F9",
  },
  // Dải băng thông báo vắt ngang
  outOfStockOverlay: {
    position: "absolute",
    top: "35%", // Nằm đè lên hình ảnh
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 10,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
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
    backgroundColor: "rgba(255, 225, 225, 0.3)", // Một màu nền nhẹ nhàng
  },
  imagePlaceholderLabel: {
    fontSize: 11,
    color: "#FFE1E1",
    marginTop: 6,
    fontWeight: "600",
  },
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
  // Khóa nút "Thêm vào giỏ"
  addBtnDisabled: {
    backgroundColor: "#E0E0E0",
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  addBtnTextDisabled: {
    color: "#888888",
  },
});