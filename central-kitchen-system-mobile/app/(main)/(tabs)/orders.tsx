import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { useAuth } from "@/hooks/use-auth";
import { useSystemSettings } from "@/hooks/use-system-settings";
import { invoicesApi, logisticsOrdersApi } from "@/lib/api";
import type { Invoice } from "@/lib/invoices";
import { getOrderPricingBreakdown } from "@/lib/order-pricing";
import type { Order } from "@/lib/orders";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Tất cả" },
  { value: "Pending", label: "Chờ duyệt" },
  { value: "Approved", label: "Đã duyệt" },
  { value: "Shipped", label: "Đã giao" },
  { value: "Received", label: "Đã nhận" },
  { value: "Cancelled", label: "Đã hủy" },
];

function formatDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrdersTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoiceMap, setInvoiceMap] = useState<Record<string, Invoice>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterToday, setFilterToday] = useState(true);
  const { settings: systemSettings } = useSystemSettings();

  const load = useCallback(async () => {
    if (!token || !user?.storeId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await logisticsOrdersApi.getAll(
        { storeId: user.storeId, status: filterStatus || undefined },
        token,
      );
      const nextOrders = res.data ?? [];
      setOrders(nextOrders);

      try {
        const invoiceRes = await invoicesApi.getAll({ storeId: user.storeId }, token);
        const nextMap = (invoiceRes.data ?? []).reduce<Record<string, Invoice>>((acc, current) => {
          acc[current.orderId] = current;
          return acc;
        }, {});
        setInvoiceMap(nextMap);
      } catch {
        setInvoiceMap({});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được đơn hàng.");
      setOrders([]);
      setInvoiceMap({});
    } finally {
      setLoading(false);
    }
  }, [token, user?.storeId, filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const todayStr = formatDateKey(new Date());
  const filtered = filterToday
    ? orders.filter((o) => {
      const dateStr = o.orderDate?.slice(0, 10) ?? (o as Order & { createdAt?: string }).createdAt?.slice(0, 10) ?? "";
      return dateStr === todayStr;
    })
    : orders;

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top }]}>
      <Text style={styles.title}>Đơn hàng</Text>

      <View style={styles.filters}>
        <Pressable
          style={[styles.filterChip, filterToday && styles.filterChipActive]}
          onPress={() => setFilterToday(true)}
        >
          <Text style={[styles.filterChipText, filterToday && styles.filterChipTextActive]}>
            Hôm nay
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, !filterToday && styles.filterChipActive]}
          onPress={() => setFilterToday(false)}
        >
          <Text style={[styles.filterChipText, !filterToday && styles.filterChipTextActive]}>
            Tất cả
          </Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
        {STATUS_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.statusChip, filterStatus === opt.value && styles.statusChipActive]}
            onPress={() => setFilterStatus(opt.value)}
          >
            <Text
              style={[styles.statusChipText, filterStatus === opt.value && styles.statusChipTextActive]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color="#D91E18" style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>Chưa có đơn hàng.</Text>
      ) : (
        filtered.map((order) => (
          (() => {
            const pricing = getOrderPricingBreakdown(order, invoiceMap[order._id] ?? null, {
              taxRate: systemSettings?.TAX_RATE,
              shippingCostBase: systemSettings?.SHIPPING_COST_BASE,
            });

            return (
              <Pressable
                key={order._id}
                style={styles.card}
                onPress={() => router.push(`/orders/${order._id}`)}
              >
                <View style={styles.cardRow}>
                  <Text style={styles.orderId}>#{order.orderNumber ?? order._id.slice(-6)}</Text>
                  <Text style={[styles.status, styles[`status_${order.status}` as keyof typeof styles]]}>
                    {order.status}
                  </Text>
                </View>
                <Text style={styles.time}>
                  {formatDateTime(order.orderDate ?? (order as Order & { createdAt?: string }).createdAt)}
                </Text>
                <View style={styles.priceMeta}>
                  <Text style={styles.priceMetaText}>Tạm tính: {pricing.subtotal.toLocaleString("vi-VN")} đ</Text>
                  <Text style={styles.priceMetaText}>VAT: {pricing.vatAmount.toLocaleString("vi-VN")} đ</Text>
                </View>
                <View style={styles.priceMeta}>
                  <Text style={styles.priceMetaText}>Ship: {pricing.shippingAmount.toLocaleString("vi-VN")} đ</Text>
                  <Text style={styles.total}>Tổng: {pricing.totalAmount.toLocaleString("vi-VN")} đ</Text>
                </View>
              </Pressable>
            );
          })()
        ))
      )}
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
    marginBottom: 12,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FFE1E1",
  },
  filterChipActive: {
    backgroundColor: "#D91E18",
    borderColor: "#D91E18",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9B0F0F",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  statusScroll: {
    marginBottom: 16,
    maxHeight: 44,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FFE1E1",
    marginRight: 8,
  },
  statusChipActive: {
    backgroundColor: "#9B0F0F",
    borderColor: "#9B0F0F",
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  statusChipTextActive: {
    color: "#fff",
  },
  loader: { marginVertical: 24 },
  error: {
    color: "#D91E18",
    fontSize: 14,
    marginBottom: 12,
  },
  empty: {
    fontSize: 14,
    color: "#666",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FFE1E1",
    ...cardShadowSmall,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  orderId: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2A2A2A",
  },
  status: {
    fontSize: 12,
    fontWeight: "600",
  },
  status_Pending: { color: "#E65100" },
  status_Approved: { color: "#1565C0" },
  status_Shipped: { color: "#2E7D32" },
  status_Received: { color: "#2E7D32" },
  status_Cancelled: { color: "#666" },
  time: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  priceMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  priceMetaText: {
    fontSize: 12,
    color: "#666",
  },
  total: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9B0F0F",
  },
});
