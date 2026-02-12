import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNotification } from "@/context/notification-context";
import { useProductionPlan } from "@/hooks/use-production-plan";
import type { ProductionPlanDetail } from "@/lib/production-plans";

function productName(d: ProductionPlanDetail): string {
  const p = d.productId;
  if (typeof p === "object" && p?.name) return p.name;
  return "Sản phẩm";
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function KitchenProductionDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { plan, isLoading, error, refetch, updateStatus, completeItem } =
    useProductionPlan(id as string);
  const { showToast } = useNotification();
  const [busy, setBusy] = useState(false);

  const handleStart = () => {
    if (!plan) return;
    Alert.alert(
      "Xác nhận bắt đầu sản xuất",
      "Xác nhận bắt đầu sản xuất?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            setBusy(true);
            try {
              await updateStatus("In_Progress");
              showToast("Đã bắt đầu sản xuất.");
            } catch (e) {
              showToast(
                e instanceof Error ? e.message : "Không cập nhật được.",
                "error"
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleCompleteItem = (productId: string, plannedQuantity: number) => {
    if (plannedQuantity <= 0) {
      showToast("Số lượng hoàn thành không hợp lệ.", "error");
      return;
    }
    Alert.alert(
      "Xác nhận hoàn thành mẻ",
      "Xác nhận đã hoàn thành mẻ này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            setBusy(true);
            try {
              await completeItem(productId, plannedQuantity);
              showToast("Đã hoàn thành mẻ.");
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Không hoàn thành được.";
              if (msg.includes("vượt") || msg.includes("quá kế hoạch")) {
                showToast("Không thể hoàn thành vượt quá kế hoạch.", "error");
              } else {
                showToast(msg, "error");
              }
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const allDetailsCompleted =
    plan?.details?.every((d) => d.status === "Completed") ?? false;

  const handleMarkPlanCompleted = () => {
    if (!plan) return;
    if (plan.status === "Completed") {
      showToast("Đơn đã hoàn thành.", "error");
      return;
    }
    if (!allDetailsCompleted) {
      showToast(
        "Cần hoàn thành từng dòng sản phẩm (bấm Hoàn thành mẻ) trước khi đóng đơn.",
        "error"
      );
      return;
    }
    Alert.alert(
      "Xác nhận hoàn thành kế hoạch",
      "Xác nhận hoàn thành kế hoạch sản xuất?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            setBusy(true);
            try {
              await updateStatus("Completed");
              showToast("Đơn sản xuất đã hoàn thành.");
              router.back();
            } catch (e) {
              showToast(
                e instanceof Error ? e.message : "Không cập nhật được.",
                "error"
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading && !plan) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#D91E18" size="large" />
      </View>
    );
  }
  if (error || !plan) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.error}>{error ?? "Không tìm thấy đơn."}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  const isPlanned = plan.status === "Planned";
  const isInProgress = plan.status === "In_Progress";

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top }]}
    >
      <View style={styles.headerRow}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{plan.planCode}</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Ngày kế hoạch</Text>
          <Text style={styles.value}>{formatDate(plan.planDate)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Trạng thái</Text>
          <Text style={[styles.status, styles[`status_${plan.status}` as keyof typeof styles]]}>
            {plan.status}
          </Text>
        </View>
        {plan.note ? (
          <View style={styles.row}>
            <Text style={styles.label}>Ghi chú</Text>
            <Text style={styles.value}>{plan.note}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Sản phẩm cần sản xuất</Text>
      {(plan.details ?? []).map((detail, index) => {
        const productId =
          typeof detail.productId === "string"
            ? detail.productId
            : detail.productId?._id;
        const planned = detail.plannedQuantity ?? 0;
        const actual = detail.actualQuantity ?? 0;
        const isItemCompleted = detail.status === "Completed";

        return (
          <View key={productId ?? index} style={styles.itemCard}>
            <Text style={styles.itemName}>{productName(detail)}</Text>
            <View style={styles.itemRow}>
              <Text style={styles.itemLabel}>Kế hoạch</Text>
              <Text style={styles.itemValue}>{planned}</Text>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.itemLabel}>Thực tế</Text>
              <Text style={styles.itemValue}>{actual}</Text>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.itemLabel}>Trạng thái dòng</Text>
              <Text style={styles.itemValue}>{detail.status ?? "Pending"}</Text>
            </View>
            {isInProgress && !isItemCompleted && (
              <Pressable
                style={[styles.primaryBtn, (busy || planned <= 0) && styles.btnDisabled]}
                onPress={() => handleCompleteItem(productId ?? "", planned)}
                disabled={busy || planned <= 0}
              >
                <Text style={styles.primaryBtnText}>Hoàn thành mẻ</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      <View style={styles.actions}>
        {isPlanned && (
          <Pressable
            style={[styles.primaryBtn, styles.primaryBtnFull, busy && styles.btnDisabled]}
            onPress={handleStart}
            disabled={busy}
          >
            <Text style={styles.primaryBtnText}>Bắt đầu sản xuất</Text>
          </Pressable>
        )}
        {isInProgress && allDetailsCompleted && (
          <Pressable
            style={[styles.primaryBtn, styles.primaryBtnFull, busy && styles.btnDisabled]}
            onPress={handleMarkPlanCompleted}
            disabled={busy}
          >
            <Text style={styles.primaryBtnText}>Đóng đơn hoàn thành</Text>
          </Pressable>
        )}
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
  headerRow: { flexDirection: "row", marginBottom: 8 },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backText: { fontSize: 14, color: "#9B0F0F", fontWeight: "600" },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#9B0F0F",
    marginBottom: 16,
  },
  error: { color: "#D91E18", fontSize: 14, marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE1E1",
  },
  row: { marginBottom: 10 },
  label: { fontSize: 12, color: "#8C8C8C", marginBottom: 4 },
  value: { fontSize: 14, fontWeight: "600", color: "#2A2A2A" },
  status: { fontSize: 14, fontWeight: "700" },
  status_Planned: { color: "#E65100" },
  status_In_Progress: { color: "#1565C0" },
  status_Completed: { color: "#2E7D32" },
  status_Cancelled: { color: "#666" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2A2A2A",
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FFE1E1",
  },
  itemName: { fontSize: 15, fontWeight: "700", color: "#2A2A2A", marginBottom: 8 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  itemLabel: { fontSize: 12, color: "#8C8C8C" },
  itemValue: { fontSize: 12, fontWeight: "600", color: "#2A2A2A" },
  actions: { marginTop: 16, gap: 10 },
  primaryBtn: {
    backgroundColor: "#D91E18",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnFull: { width: "100%" },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnDisabled: { opacity: 0.7 },
});
