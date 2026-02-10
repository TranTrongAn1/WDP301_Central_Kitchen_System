import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { cardShadowSmall } from "@/constants/theme";
import { useCart } from "@/context/cart-context";
import { logisticsOrdersApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import type { Order } from "@/lib/orders";

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function CartTabScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitOrder = async () => {
    if (!token || !user?.storeId) {
      Alert.alert("Lỗi", "Bạn cần đăng nhập và thuộc cửa hàng để tạo đơn.");
      return;
    }
    if (items.length === 0) {
      Alert.alert("Giỏ trống", "Vui lòng thêm sản phẩm trước khi tạo đơn.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        storeId: user.storeId,
        requestedDeliveryDate: formatDate(new Date()),
        items: items.map((x) => ({
          productId: x.productId,
          quantityRequested: x.quantity,
        })),
      };
      const res = await logisticsOrdersApi.create(payload, token);
      clearCart();
      const order = res.data as Order;
      Alert.alert("Thành công", `Đơn hàng đã tạo: ${order.orderNumber ?? order._id}.`, [
        { text: "Xem đơn hàng", onPress: () => router.push(`/orders/${order._id}`) },
        { text: "OK" },
      ]);
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Không thể tạo đơn. Thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !submitting) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
        <Text style={styles.emptySub}>Thêm sản phẩm từ tab Sản phẩm</Text>
        <Pressable style={styles.emptyBtn} onPress={() => router.replace("/(tabs)/products")}>
          <Text style={styles.emptyBtnText}>Đến Sản phẩm</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Giỏ hàng</Text>
      {items.map((item) => (
        <View key={item.productId} style={styles.row}>
          <View style={styles.thumb}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.thumbImg} resizeMode="cover" />
            ) : (
              <View style={styles.thumbPlaceholder}><Text>📦</Text></View>
            )}
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={2}>{item.productName}</Text>
            <Text style={styles.price}>{item.price.toLocaleString("vi-VN")} đ</Text>
            <View style={styles.qtyRow}>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => updateQuantity(item.productId, item.quantity - 1)}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => updateQuantity(item.productId, item.quantity + 1)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
              <Pressable
                style={styles.removeBtn}
                onPress={() => removeItem(item.productId)}
              >
                <Text style={styles.removeBtnText}>Xóa</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}
      <View style={[styles.summary, cardShadowSmall]}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tạm tính</Text>
          <Text style={styles.summaryValue}>{subtotal.toLocaleString("vi-VN")} đ</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tổng cộng</Text>
          <Text style={styles.summaryTotal}>{subtotal.toLocaleString("vi-VN")} đ</Text>
        </View>
      </View>
      <Pressable
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmitOrder}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Tạo đơn hàng</Text>
        )}
      </Pressable>
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
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#9B0F0F",
    marginBottom: 16,
  },
  empty: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4F4",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#2A2A2A", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#666", marginBottom: 16 },
  emptyBtn: {
    backgroundColor: "#D91E18",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: { color: "#fff", fontWeight: "600" },
  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FFE1E1",
    ...cardShadowSmall,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
    marginRight: 12,
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: "600", color: "#2A2A2A", marginBottom: 4 },
  price: { fontSize: 13, color: "#9B0F0F", marginBottom: 8 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFE1E1",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { fontSize: 18, fontWeight: "700", color: "#9B0F0F" },
  qtyText: { fontSize: 14, fontWeight: "600", minWidth: 24, textAlign: "center" },
  removeBtn: { marginLeft: 8 },
  removeBtnText: { fontSize: 13, color: "#D91E18", fontWeight: "600" },
  summary: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE1E1",
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: "#666" },
  summaryValue: { fontSize: 14, fontWeight: "600", color: "#2A2A2A" },
  summaryTotal: { fontSize: 16, fontWeight: "700", color: "#9B0F0F" },
  submitBtn: {
    backgroundColor: "#D91E18",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
