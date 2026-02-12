import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cardShadowSmall } from "@/constants/theme";
import { useCart } from "@/context/cart-context";
import { useNotification } from "@/context/notification-context";
import { logisticsOrdersApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import type { Order } from "@/lib/orders";

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Merge items by productId, sum quantity; filter quantity > 0. */
function buildOrderItems(
  items: { productId: string; quantity: number }[]
): { productId: string; quantityRequested: number }[] {
  const byId = new Map<string, number>();
  for (const x of items) {
    if (!x.productId || x.quantity <= 0) continue;
    byId.set(x.productId, (byId.get(x.productId) ?? 0) + x.quantity);
  }
  return Array.from(byId.entries()).map(([productId, quantityRequested]) => ({
    productId,
    quantityRequested,
  }));
}

export default function CartTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const { showToast } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const orderItems = buildOrderItems(items);
  const isValid = orderItems.length > 0 && Boolean(token && user?.storeId);
  const canSubmit = isValid && !submitting;

  const handleSubmitOrder = async () => {
    setSubmitError(null);
    if (!token || !user?.storeId) {
      showToast("Bạn cần đăng nhập và thuộc cửa hàng để tạo đơn.", "error");
      return;
    }
    if (orderItems.length === 0) {
      if (items.length === 0) {
        showToast("Giỏ hàng đang trống.", "error");
      } else {
        showToast("Số lượng mỗi sản phẩm phải lớn hơn 0.", "error");
      }
      setSubmitError("Bạn chưa chọn sản phẩm hoặc số lượng không hợp lệ.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        storeId: user.storeId,
        requestedDeliveryDate: formatDate(new Date()),
        items: orderItems,
      };
      const res = await logisticsOrdersApi.create(payload, token);
      clearCart();
      setSubmitError(null);
      showToast("Tạo đơn thành công.");
      const order = res.data as Order;
      router.push(`/orders/${order._id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Không thể tạo đơn. Thử lại.";
      showToast(msg, "error");
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !submitting) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
        <Text style={styles.emptySub}>Thêm sản phẩm từ tab Bán hàng</Text>
        <Pressable style={styles.emptyBtn} onPress={() => router.replace("/(tabs)/products")}>
          <Text style={styles.emptyBtnText}>Đến Bán hàng</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </Pressable>
      </View>
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
      {submitError ? (
        <Text style={styles.fieldError}>{submitError}</Text>
      ) : null}
      <Pressable
        style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
        onPress={handleSubmitOrder}
        disabled={!canSubmit || submitting}
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
  headerRow: {
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
  fieldError: {
    fontSize: 13,
    color: "#C62828",
    marginBottom: 8,
  },
});
