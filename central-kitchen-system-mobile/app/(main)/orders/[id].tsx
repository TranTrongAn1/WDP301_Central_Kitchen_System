import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { cardShadowSmall } from "@/constants/theme";
import { logisticsOrdersApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import type { Order, OrderItem } from "@/lib/orders";

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function productName(item: OrderItem): string {
  const p = item.productId;
  if (typeof p === "object" && p?.name) return p.name;
  return "Sản phẩm";
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await logisticsOrdersApi.getById(id, token);
      setOrder(res.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được đơn hàng.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#D91E18" size="large" />
      </View>
    );
  }
  if (error || !order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? "Không tìm thấy đơn hàng."}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Đơn #{order.orderNumber ?? order._id.slice(-6)}</Text>
      <View style={[styles.card, cardShadowSmall]}>
        <View style={styles.row}>
          <Text style={styles.label}>Trạng thái</Text>
          <Text style={[styles.status, styles[`status_${order.status}` as keyof typeof styles]]}>
            {order.status}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ngày tạo</Text>
          <Text style={styles.value}>
            {formatDateTime(order.orderDate ?? order.createdAt)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ngày giao yêu cầu</Text>
          <Text style={styles.value}>{order.requestedDeliveryDate ?? "—"}</Text>
        </View>
        {order.notes ? (
          <View style={styles.row}>
            <Text style={styles.label}>Ghi chú</Text>
            <Text style={styles.value}>{order.notes}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Sản phẩm</Text>
      {(order.items ?? []).map((item, index) => (
        <View key={index} style={[styles.itemRow, cardShadowSmall]}>
          <Text style={styles.itemName}>{productName(item)}</Text>
          <View style={styles.itemMeta}>
            <Text style={styles.itemQty}>SL: {item.quantityRequested ?? item.quantity ?? 0}</Text>
            {item.subtotal != null && (
              <Text style={styles.itemSub}>{item.subtotal.toLocaleString("vi-VN")} đ</Text>
            )}
          </View>
        </View>
      ))}

      <View style={[styles.totalRow, cardShadowSmall]}>
        <Text style={styles.totalLabel}>Tổng cộng</Text>
        <Text style={styles.totalValue}>
          {order.totalAmount != null
            ? `${order.totalAmount.toLocaleString("vi-VN")} đ`
            : "—"}
        </Text>
      </View>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF4F4",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#9B0F0F",
    marginBottom: 16,
  },
  error: {
    color: "#D91E18",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE1E1",
  },
  row: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: "#8C8C8C",
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2A2A2A",
  },
  status: {
    fontSize: 14,
    fontWeight: "700",
  },
  status_Pending: { color: "#E65100" },
  status_Approved: { color: "#1565C0" },
  status_Shipped: { color: "#2E7D32" },
  status_Received: { color: "#2E7D32" },
  status_Cancelled: { color: "#666" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2A2A2A",
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#FFE1E1",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2A2A2A",
    flex: 1,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemQty: { fontSize: 13, color: "#666" },
  itemSub: { fontSize: 13, fontWeight: "700", color: "#9B0F0F" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FFE1E1",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2A2A2A",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9B0F0F",
  },
});
