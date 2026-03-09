import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNotification } from "@/context/notification-context";
import { useProductionRecipe } from "@/hooks/use-production-recipe";

// Utility function to calculate days until expiry
function daysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default function ProductionRecipeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { planId, productId, plannedQuantity, productName } =
    useLocalSearchParams<{
      planId: string;
      productId: string;
      plannedQuantity: string;
      productName: string;
    }>();

  const { showToast } = useNotification();
  const [busy, setBusy] = useState(false);

  const quantity = parseFloat(plannedQuantity ?? "0") || 0;

  const {
    recipe,
    isLoading,
    error,
    isSaving,
    updateBatchUsage,
    saveProduction,
    validateUsage,
  } = useProductionRecipe(planId || "", productId || "", quantity);

  const handleSaveProduction = () => {
    if (__DEV__) {
      console.log("[recipe] Save button pressed");
      console.log("[recipe] recipe data:", recipe);
    }

    const validation = validateUsage();

    if (__DEV__) {
      console.log("[recipe] Validation result:", validation);
    }

    if (!validation.valid) {
      showToast(validation.message || "Dữ liệu không hợp lệ.", "error");
      return;
    }

    Alert.alert(
      "Xác nhận lưu kết quả sản xuất",
      `Xác nhận đã sản xuất ${quantity} ${productName}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            setBusy(true);
            try {
              if (__DEV__) {
                console.log("[recipe] Calling saveProduction with quantity:", quantity);
              }
              await saveProduction(quantity);
              showToast("Đã lưu kết quả sản xuất.");
              router.back();
            } catch (e) {
              const msg =
                e instanceof Error ? e.message : "Không lưu được.";
              if (__DEV__) {
                console.error("[recipe] Error saving production:", e);
              }
              showToast(msg, "error");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#D91E18" size="large" />
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.error}>{error ?? "Không tải được công thức."}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top }]}
    >
      <View style={styles.headerRow}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{productName}</Text>
      <Text style={styles.subtitle}>Kế hoạch sản xuất: {quantity}</Text>

      <Text style={styles.sectionTitle}>Nguyên liệu cần sử dụng</Text>

      {recipe.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Sản phẩm không có công thức.</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            {recipe.map((item) => {
              const totalUsed = item.batches.reduce(
                (sum, b) => sum + b.usedQuantity,
                0
              );
              const isComplete = totalUsed >= item.totalRequired;
              return (
                <View key={item.ingredientId} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{item.ingredientName}</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      !isComplete && styles.summaryIncomplete,
                    ]}
                  >
                    {totalUsed.toFixed(2)} / {item.totalRequired.toFixed(2)} {item.unit}
                  </Text>
                </View>
              );
            })}
          </View>

          {recipe.map((item, ingredientIndex) => (
            <View key={item.ingredientId} style={styles.ingredientCard}>
              <View style={styles.ingredientHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ingredientName}>
                    {item.ingredientName || "Nguyên liệu không xác định"}
                  </Text>
                  {item.ingredientType && (
                    <Text style={styles.ingredientType}>{item.ingredientType}</Text>
                  )}
                </View>
              </View>

              <View style={styles.quantityRow}>
                <View style={styles.quantityCol}>
                  <Text style={styles.quantityLabel}>Trên đơn vị</Text>
                  <Text style={styles.quantityValue}>
                    {item.perUnitQuantity} {item.unit}
                  </Text>
                </View>
                <View style={styles.quantityCol}>
                  <Text style={styles.quantityLabel}>Tổng cần</Text>
                  <Text style={styles.quantityValue}>
                    {item.totalRequired} {item.unit}
                  </Text>
                </View>
              </View>

              <Text style={styles.batchesTitle}>Chọn mẻ hàng</Text>

              {item.batches.length === 0 ? (
                <Text style={styles.noBatchText}>
                  Không có mẻ hàng khả dụng.
                </Text>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={item.batches}
                  keyExtractor={(batch) => batch._id}
                  renderItem={({ item: batch, index: batchIndex }) => {
                    const daysLeft = daysUntilExpiry(batch.expiryDate);
                    const isExpiringSoon = daysLeft <= 30 && daysLeft > 0;
                    const isExpired = daysLeft <= 0;
                    return (
                      <View style={styles.batchRow}>
                        <View style={styles.batchInfo}>
                          <View style={styles.batchCodeRow}>
                            <Text style={styles.batchCode}>{batch.batchCode}</Text>
                            {isExpiringSoon && <Text style={styles.expiryWarning}>⭐</Text>}
                            {isExpired && <Text style={styles.expiredBadge}>Hết hạn</Text>}
                          </View>
                          <Text style={styles.batchDetail}>
                            Còn lại: {batch.remainingQuantity} {batch.unit}
                          </Text>
                          <View style={styles.expiryRowWithWarning}>
                            <Text style={[styles.batchDetail, isExpiringSoon && styles.expiryWarningText]}>
                              Hạn: {batch.expiryDate}
                            </Text>
                            {isExpiringSoon && (
                              <Text style={styles.daysWarningText}>
                                ({daysLeft} ngày)
                              </Text>
                            )}
                          </View>
                        </View>
                        <TextInput
                          style={styles.quantityInput}
                          placeholder="Nhập số lượng"
                          placeholderTextColor="#CCC"
                          keyboardType="decimal-pad"
                          value={batch.usedQuantity?.toString() || ""}
                          onChangeText={(text) => {
                            const cleaned = text.replace(",", ".").replace(/[^0-9.]/g, "");

                            // tránh nhiều dấu .
                            if ((cleaned.match(/\./g) || []).length > 1) return;

                            const num = parseFloat(cleaned);

                            updateBatchUsage(
                              ingredientIndex,
                              batchIndex,
                              isNaN(num) ? 0 : num
                            );
                          }}
                        />
                      </View>
                    );
                  }}
                />
              )}
            </View>
          ))}
        </>
      )}

      <Pressable
        style={[
          styles.saveBtn,
          (busy || isSaving || recipe.length === 0) &&
          styles.btnDisabled,
        ]}
        onPress={handleSaveProduction}
        disabled={busy || isSaving || recipe.length === 0}
      >
        <Text style={styles.saveBtnText}>Lưu kết quả sản xuất</Text>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF4F4",
  },
  headerRow: {
    flexDirection: "row",
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#8C8C8C",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2A2A2A",
    marginBottom: 12,
  },
  error: {
    color: "#D91E18",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE1E1",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#8C8C8C",
  },
  ingredientCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FFE1E1",
  },
  ingredientHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#9B0F0F",
    marginBottom: 4,
  },
  ingredientType: {
    fontSize: 12,
    color: "#8C8C8C",
    fontStyle: "italic",
  },
  quantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E0E0",
  },
  quantityCol: {
    flex: 1,
  },
  quantityLabel: {
    fontSize: 11,
    color: "#8C8C8C",
    marginBottom: 3,
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2A2A2A",
  },
  batchesTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
  },
  noBatchText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  batchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F0E0E0",
  },
  batchInfo: {
    flex: 1,
    marginRight: 10,
  },
  batchCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  batchCode: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2A2A2A",
    marginRight: 6,
    flex: 1,
  },
  expiryWarning: {
    fontSize: 14,
    marginRight: 6,
  },
  expiredBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    backgroundColor: "#D91E18",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  batchDetail: {
    fontSize: 11,
    color: "#666",
    marginBottom: 2,
  },
  expiryRowWithWarning: {
    flexDirection: "row",
    alignItems: "center",
  },
  expiryWarningText: {
    color: "#D91E18",
    fontWeight: "600",
  },
  daysWarningText: {
    fontSize: 10,
    color: "#D91E18",
    fontWeight: "600",
    marginLeft: 4,
  },
  quantityInput: {
    minWidth: 90,
    borderWidth: 1,
    borderColor: "#D91E18",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: "#2A2A2A",
    backgroundColor: "#fff",
  },
  saveBtn: {
    backgroundColor: "#D91E18",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE1E1",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E0E0",
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2A2A2A",
    flex: 1,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4CAF50",
  },
  summaryIncomplete: {
    color: "#D91E18",
  },
});
