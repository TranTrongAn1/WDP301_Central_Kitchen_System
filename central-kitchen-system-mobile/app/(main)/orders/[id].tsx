import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cardShadowSmall } from "@/constants/theme";
import { useNotification } from "@/context/notification-context";
import { useAuth } from "@/hooks/use-auth";
import { invoicesApi, logisticsOrdersApi, paymentApi } from "@/lib/api";
import type { Invoice } from "@/lib/invoices";
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
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { showToast } = useNotification();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await logisticsOrdersApi.getById(id, token);
      const nextOrder = res.data ?? null;
      setOrder(nextOrder);
      if (nextOrder?._id) {
        try {
          const invRes = await invoicesApi.getByOrder(nextOrder._id, token);
          const first = invRes.data?.[0] ?? null;
          setInvoice(first);
        } catch {
          setInvoice(null);
        }
      } else {
        setInvoice(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được đơn hàng.");
      setOrder(null);
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load]);

  const canReceive = order?.status === "Shipped" && id && token;
  const canPayOnline =
    invoice &&
    invoice.totalAmount > 0 &&
    invoice.paymentStatus !== "Paid";

  const handleReceive = () => {
    if (!canReceive || !id || !token) return;
    Alert.alert(
      "Xác nhận nhận hàng",
      "Xác nhận đã nhận đủ hàng?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            setReceiving(true);
            try {
              await logisticsOrdersApi.receive(id, token);
              showToast("Đã xác nhận nhận hàng.");
              load();
            } catch (e) {
              const status = (e as Error & { status?: number }).status;
              if (status === 403) {
                showToast("Bạn không có quyền nhận đơn này.", "error");
              } else if (status === 400) {
                showToast("Đơn không hợp lệ hoặc đã được nhận.", "error");
              } else if (status !== 401 && status !== 500) {
                const msg = e instanceof Error ? e.message : "Không thể xác nhận nhận hàng.";
                showToast(msg, "error");
              }
            } finally {
              setReceiving(false);
            }
          },
        },
      ]
    );
  };

  const handlePayOnline = async () => {
    if (!invoice || !token) return;
    setPaying(true);
    try {
      const res = await paymentApi.createLink(invoice._id, token);
      const checkoutUrl = res.data?.checkoutUrl ?? null;
      const returnedQr = res.data?.qrCode ?? null;
      if (!checkoutUrl && !returnedQr) {
        showToast("Không tạo được link thanh toán.", "error");
        return;
      }
      setPaymentUrl(checkoutUrl);
      setQrCode(returnedQr);
      setPaymentModalVisible(true);

      // start polling invoice status while modal open
      const interval = setInterval(async () => {
        try {
          const invRes = await invoicesApi.getByOrder(id, token);
          const first = invRes.data?.[0] ?? null;
          setInvoice(first);
          if (first?.paymentStatus === "Paid") {
            clearInterval(interval);
            showToast("Thanh toán đã được ghi nhận.");
            setPaymentModalVisible(false);
          }
        } catch {
          // ignore errors during polling
        }
      }, 5000);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Không tạo được link thanh toán.";
      showToast(msg, "error");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#D91E18" size="large" />
      </View>
    );
  }
  if (error || !order) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.error}>{error ?? "Không tìm thấy đơn hàng."}</Text>
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

      {/* payment modal (similar to cart) */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setPaymentModalVisible(false);
          setPaymentUrl(null);
          setQrCode(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thanh toán đơn hàng</Text>
              <Pressable
                onPress={() => {
                  setPaymentModalVisible(false);
                  setPaymentUrl(null);
                  setQrCode(null);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              {paying ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#D91E18" />
                  <Text style={styles.loadingText}>Đang tạo link thanh toán...</Text>
                </View>
              ) : (
                <>
                  {qrCode ? (
                    <View style={styles.qrContainer}>
                      <Image
                        source={{ uri: qrCode }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                      <Text style={styles.paymentInfo}>
                        Quét mã QR để thanh toán qua PayOS
                      </Text>
                      {paymentUrl ? (
                        <Pressable
                          style={styles.paymentBtn}
                          onPress={async () => {
                            if (paymentUrl) {
                              try {
                                await WebBrowser.openBrowserAsync(paymentUrl);
                              } catch {
                                showToast("Không thể mở link thanh toán.", "error");
                              }
                            }
                          }}
                        >
                          <Text style={styles.paymentBtnText}>Mở link thanh toán</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : (
                    <>
                      <Text style={styles.paymentInfo}>
                        Vui lòng nhấn nút bên dưới để thanh toán qua PayOS
                      </Text>
                      {paymentUrl ? (
                        <Pressable
                          style={styles.paymentBtn}
                          onPress={async () => {
                            if (paymentUrl) {
                              try {
                                await WebBrowser.openBrowserAsync(paymentUrl);
                              } catch {
                                showToast("Không thể mở link thanh toán.", "error");
                              }
                            }
                          }}
                        >
                          <Text style={styles.paymentBtnText}>Mở link thanh toán</Text>
                        </Pressable>
                      ) : null}
                      <Text style={styles.paymentSubInfo}>
                        Bạn sẽ được chuyển đến trang thanh toán của PayOS
                      </Text>
                    </>
                  )}
                </>
              )}
            </View>
            <View style={styles.modalFooter}>
              <Pressable
                style={styles.modalBtn}
                onPress={() => {
                  setPaymentModalVisible(false);
                  setPaymentUrl(null);
                  setQrCode(null);
                }}
              >
                <Text style={styles.modalBtnText}>Đóng</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {invoice ? (
        <View style={[styles.card, cardShadowSmall]}>
          <Text style={styles.invoiceTitle}>Hoá đơn</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Số hoá đơn</Text>
            <Text style={styles.value}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Ngày hoá đơn</Text>
            <Text style={styles.value}>{invoice.invoiceDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Hạn thanh toán</Text>
            <Text style={styles.value}>{invoice.dueDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Trạng thái thanh toán</Text>
            <Text style={styles.value}>{invoice.paymentStatus}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tổng thanh toán</Text>
            <Text style={styles.value}>
              {invoice.totalAmount.toLocaleString("vi-VN")} đ
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.card, cardShadowSmall]}>
          <Text style={styles.invoiceTitle}>Hoá đơn</Text>
          <Text style={styles.value}>
            Đơn hàng đang chờ duyệt hoặc chưa tạo hoá đơn.
          </Text>
        </View>
      )
      }

      <Text style={styles.sectionTitle}>Sản phẩm</Text>
      {
        (order.items ?? []).map((item, index) => (
          <View key={index} style={[styles.itemRow, cardShadowSmall]}>
            <Text style={styles.itemName}>{productName(item)}</Text>
            <View style={styles.itemMeta}>
              <Text style={styles.itemQty}>SL: {item.quantityRequested ?? item.quantity ?? 0}</Text>
              {item.subtotal != null && (
                <Text style={styles.itemSub}>{item.subtotal.toLocaleString("vi-VN")} đ</Text>
              )}
            </View>
          </View>
        ))
      }

      <View style={[styles.totalRow, cardShadowSmall]}>
        <Text style={styles.totalLabel}>Tổng cộng</Text>
        <Text style={styles.totalValue}>
          {order.totalAmount != null
            ? `${order.totalAmount.toLocaleString("vi-VN")} đ`
            : "—"}
        </Text>
      </View>

      {
        canPayOnline && (
          <Pressable
            style={[styles.payBtn, paying && styles.payBtnDisabled]}
            onPress={handlePayOnline}
            disabled={paying}
          >
            {paying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payBtnText}>Thanh toán online</Text>
            )}
          </Pressable>
        )
      }

      {
        canReceive && (
          <Pressable
            style={[styles.receiveBtn, receiving && styles.receiveBtnDisabled]}
            onPress={handleReceive}
            disabled={receiving}
          >
            {receiving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.receiveBtnText}>Xác nhận nhận hàng</Text>
            )}
          </Pressable>
        )
      }
    </ScrollView >
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
  invoiceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2A2A2A",
    marginBottom: 8,
  },
  receiveBtn: {
    marginTop: 16,
    backgroundColor: "#2E7D32",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  receiveBtnDisabled: { opacity: 0.7 },
  receiveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  payBtn: {
    marginTop: 12,
    backgroundColor: "#1565C0",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  payBtnDisabled: { opacity: 0.7 },
  payBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE1E1",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2A2A2A",
  },
  closeBtn: {
    fontSize: 24,
    color: "#666",
    fontWeight: "600",
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    marginTop: 12,
  },
  paymentInfo: {
    fontSize: 14,
    color: "#2A2A2A",
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "500",
  },
  paymentBtn: {
    backgroundColor: "#D91E18",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  paymentBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  paymentSubInfo: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#FFE1E1",
  },
  modalBtn: {
    backgroundColor: "#FFE1E1",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnText: {
    color: "#D91E18",
    fontWeight: "700",
    fontSize: 14,
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  qrImage: {
    width: 200,
    height: 200,
    marginBottom: 8,
  },
});
