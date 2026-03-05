import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
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
import { useNotification } from "@/context/notification-context";
import { useAuth } from "@/hooks/use-auth";
import { useStore } from "@/hooks/use-store";
import { invoicesApi, logisticsOrdersApi, paymentApi } from "@/lib/api";
import type { Invoice } from "@/lib/invoices";

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
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const orderRef = useRef<string | null>(null);
  const [isCreatingPaymentLink, setIsCreatingPaymentLink] = useState(false);

  // choose between wallet or payOS bank transfer
  const [paymentMethod, setPaymentMethod] = useState<"Wallet" | "Bank_Transfer">("Wallet");
  // recipient information required by API
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

  const { store /*, isLoading: _isStoreLoading */ } = useStore(); // loading flag currently unused

  const orderItems = buildOrderItems(items);
  const isValid =
    orderItems.length > 0 &&
    Boolean(
      token &&
      user?.storeId &&
      recipientName.trim() &&
      recipientPhone.trim() &&
      recipientAddress.trim()
    );
  const canSubmit = isValid && !submitting;

  // when store info arrives, prefill missing recipient fields
  useEffect(() => {
    if (store) {
      if (!recipientName.trim() && store.storeName) {
        setRecipientName(store.storeName);
      }
      if (!recipientPhone.trim() && store.phone) {
        setRecipientPhone(store.phone);
      }
      if (!recipientAddress.trim() && store.address) {
        setRecipientAddress(store.address);
      }
    }
  }, [store, recipientName, recipientPhone, recipientAddress]);

  const handleSubmitOrder = async () => {
    setSubmitError(null);
    if (!token || !user?.storeId) {
      showToast("Bạn cần đăng nhập và thuộc cửa hàng để tạo đơn.", "error");
      return;
    }
    if (!recipientName.trim()) {
      showToast("Tên người nhận là bắt buộc.", "error");
      setSubmitError("Tên người nhận chưa nhập.");
      return;
    }
    if (!recipientPhone.trim()) {
      showToast("Số điện thoại người nhận là bắt buộc.", "error");
      setSubmitError("Số điện thoại chưa nhập.");
      return;
    }
    if (!recipientAddress.trim()) {
      showToast("Địa chỉ người nhận là bắt buộc.", "error");
      setSubmitError("Địa chỉ chưa nhập.");
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
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        address: recipientAddress.trim(),
        items: orderItems,
        paymentMethod: paymentMethod,
      };
      const res = await logisticsOrdersApi.create(payload, token);
      const creationData: CreateOrderData = res.data;
      const orderObj: Order = creationData.order;
      const currentOrderId = orderObj._id;
      setOrderId(currentOrderId);
      orderRef.current = currentOrderId;
      clearCart();
      setSubmitError(null);

      let invoice: Invoice | null = null;
      try {
        const invRes = await invoicesApi.getByOrder(currentOrderId, token);
        if (invRes.success && invRes.data.length > 0) {
          invoice = invRes.data[0];
        }
      } catch {
        // ignore, invoice may simply not exist yet
      }

      // Check if invoice is already paid (via Wallet)
      if (paymentMethod === "Wallet" && invoice?.paymentStatus === "Paid") {
        showToast("Tạo đơn thành công. Thanh toán bằng ví đã được xử lý.");
        router.push(`/orders/${currentOrderId}`);
      } else if (invoice?._id) {
        // create pay link for unpaid invoice
        setOrderId(currentOrderId);
        setIsCreatingPaymentLink(true);
        try {
          const paymentRes = await paymentApi.createLink(invoice._id, token);
          setIsCreatingPaymentLink(false);
          const checkoutUrl = paymentRes.data?.checkoutUrl ?? null;
          const returnedQr = paymentRes.data?.qrCode ?? null;
          if (checkoutUrl || returnedQr) {
            setPaymentUrl(checkoutUrl);
            setQrCode(returnedQr);
            setPaymentModalVisible(true);
            showToast("Vui lòng hoàn tất thanh toán.");
          } else {
            showToast("Không thể tạo link thanh toán.", "error");
            router.push(`/orders/${currentOrderId}`);
          }
        } catch (_paymentError) {
          setIsCreatingPaymentLink(false);
          const msg = _paymentError instanceof Error ? _paymentError.message : "Lỗi tạo link thanh toán";
          showToast(msg, "error");
          router.push(`/orders/${currentOrderId}`);
        }
      } else {
        showToast("Tạo đơn thành công.");
        router.push(`/orders/${currentOrderId}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Không thể tạo đơn. Thử lại.";
      showToast(msg, "error");
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPayment = async () => {
    if (paymentUrl) {
      try {
        await Linking.openURL(paymentUrl);
      } catch {
        showToast("Không thể mở link thanh toán.", "error");
      }
    }
  };

  const handlePaymentComplete = () => {
    setPaymentModalVisible(false);
    setPaymentUrl(null);
    setQrCode(null);

    const targetId = orderRef.current || orderId;
    if (targetId) {
      router.push(`/orders/${targetId}`);
      showToast("Kiểm tra trạng thái thanh toán tại trang chi tiết đơn.");
    } else {
      showToast("Không thể xác định số hiệu đơn. Vui lòng quay lại.", "error");
      router.back();
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top }]}>
      {items.length === 0 ? (
        <View style={[styles.empty, { paddingTop: insets.top }]}>
          <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
          <Text style={styles.emptySub}>Thêm sản phẩm từ tab Bán hàng</Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => router.replace("/(tabs)/products" as any)}
          >
            <Text style={styles.emptyBtnText}>Đến Bán hàng</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.headerRow}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>Giỏ hàng</Text>

      {/* recipient details inputs */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Tên người nhận</Text>
        <TextInput
          style={styles.fieldInput}
          value={recipientName}
          onChangeText={setRecipientName}
          placeholder="Ví dụ: Nguyễn Văn A"
        />
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Số điện thoại</Text>
        <TextInput
          style={styles.fieldInput}
          value={recipientPhone}
          onChangeText={setRecipientPhone}
          placeholder="0912345678"
          keyboardType="phone-pad"
        />
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Địa chỉ</Text>
        <TextInput
          style={styles.fieldInput}
          value={recipientAddress}
          onChangeText={setRecipientAddress}
          placeholder="Ví dụ: 123 Lê Lợi, Quận 1"
        />
      </View>

      {/* payment method selector */}
      <View style={styles.methodRow}>
        <Pressable
          style={[
            styles.methodBtn,
            paymentMethod === "Wallet" && styles.methodBtnSelected,
          ]}
          onPress={() => setPaymentMethod("Wallet")}
        >
          <Text
            style={
              paymentMethod === "Wallet"
                ? styles.methodTextSelected
                : styles.methodText
            }
          >
            Ví (nội bộ)
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.methodBtn,
            paymentMethod === "Bank_Transfer" && styles.methodBtnSelected,
          ]}
          onPress={() => setPaymentMethod("Bank_Transfer")}
        >
          <Text
            style={
              paymentMethod === "Bank_Transfer"
                ? styles.methodTextSelected
                : styles.methodText
            }
          >
            Chuyển khoản (PayOS)
          </Text>
        </Pressable>
      </View>

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

      {/* Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
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
              {isCreatingPaymentLink ? (
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
                      <Pressable
                        style={styles.paymentBtn}
                        onPress={handleOpenPayment}
                      >
                        <Text style={styles.paymentBtnText}>Mở link thanh toán</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.paymentInfo}>
                        Vui lòng nhấn nút bên dưới để thanh toán qua PayOS
                      </Text>
                      <Pressable
                        style={styles.paymentBtn}
                        onPress={handleOpenPayment}
                      >
                        <Text style={styles.paymentBtnText}>Mở link thanh toán</Text>
                      </Pressable>
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
                onPress={handlePaymentComplete}
              >
                <Text style={styles.modalBtnText}>Đã thanh toán / Bỏ qua</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  methodRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  methodBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#9B0F0F",
  },
  methodBtnSelected: {
    backgroundColor: "#9B0F0F",
  },
  methodText: {
    color: "#9B0F0F",
    fontWeight: "600",
  },
  methodTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  fieldRow: {
    marginBottom: 12,
  },
  fieldLabel: {
    marginBottom: 4,
    color: "#333",
    fontWeight: "600",
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    fontSize: 18,
    color: "#9B0F0F",
  },
  modalBody: {
    padding: 12,
  },
  loadingContainer: {
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#666",
  },
  paymentInfo: {
    textAlign: "center",
    marginBottom: 12,
  },
  paymentBtn: {
    backgroundColor: "#D91E18",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  paymentBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  paymentSubInfo: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  modalFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  modalBtn: {
    backgroundColor: "#9B0F0F",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
