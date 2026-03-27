import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useIngredientBatch } from "@/hooks/use-ingredient-batch";
import { useAuth } from "@/hooks/use-auth"; 
import { ingredientBatchesApi } from "@/lib/api"; 

// Hàm định dạng giá trị hiển thị
const formatValue = (value: unknown) =>
  value === null || value === undefined ? "—" : String(value);

// Hàm định dạng ngày tháng thân thiện
const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN");
  } catch {
    return dateStr;
  }
};

export default function IngredientBatchDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth(); // Lấy token để gọi API
  
  // Gọi hook lấy dữ liệu chi tiết lô hàng
  const { item, isLoading, error, refetch } = useIngredientBatch(id);

  // === STATE CHO MODAL BÁO CÁO HAO HỤT ===
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [lossQuantity, setLossQuantity] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hàm xử lý khi bấm gửi báo cáo
  const handleReportLoss = async () => {
    const qty = Number(lossQuantity);
    if (!lossQuantity || isNaN(qty) || qty <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập số lượng hao hụt hợp lệ (> 0).");
      return;
    }
    if (item && qty > item.currentQuantity) {
      Alert.alert("Lỗi", "Số lượng hao hụt không thể lớn hơn tồn kho hiện tại của lô.");
      return;
    }
    if (!lossReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do hao hụt (VD: Chuột cắn, bể vỡ...).");
      return;
    }

    setIsSubmitting(true);
    try {
      const newCurrentQuantity = item!.currentQuantity - qty;
      
      const response = await ingredientBatchesApi.update(
        id, 
        {
          currentQuantity: newCurrentQuantity,
          note: lossReason.trim(),
        }, 
        token
      );

      // Kiểm tra nếu API trả về lỗi (tùy cấu trúc logic response của bạn)
      if (response && response.success === false) {
        throw new Error("Lỗi từ máy chủ: Không thể cập nhật");
      }

      // Hiển thị alert thành công
      Alert.alert("Thành công", `Đã trừ ${qty} đơn vị khỏi lô hàng.`, [
        { 
          text: "OK", 
          onPress: () => {
            setIsModalVisible(false);
            setLossQuantity("");
            setLossReason("");
            if (refetch) refetch(); // Lấy lại data mới ngay lập tức
          } 
        }
      ]);

    } catch (err) {
      console.error("Lỗi khi báo cáo hao hụt:", err);
      Alert.alert(
        "Lỗi", 
        err instanceof Error ? err.message : "Không thể báo cáo hao hụt lúc này. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20 },
        ]}
      >
        {/* NÚT QUAY LẠI NHỎ & TIÊU ĐỀ */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Chi tiết lô nguyên liệu</Text>
          <Pressable style={styles.smallBackButton} onPress={() => router.back()}>
            <Text style={styles.smallBackButtonText}>‹ Quay lại lô nguyên liệu</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#D91E18" style={styles.loader} />
        ) : null}
        
        {error ? (
          <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {item ? (
          <>
            <View style={[styles.card, cardShadowSmall]}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thông tin định danh</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Mã lô hàng</Text>
                  <Text style={styles.value}>{formatValue(item.batchCode)}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trạng thái kho</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Số lượng còn lại</Text>
                  <Text style={[styles.value, styles.highlightValue]}>
                    {formatValue(item.currentQuantity)}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Số lượng ban đầu</Text>
                  <Text style={styles.value}>{formatValue(item.initialQuantity)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Hạn sử dụng</Text>
                  <Text style={[styles.value, item.isExpired && styles.expiredText]}>
                    {formatDate(item.expiryDate)} {item.isExpired ? "(Hết hạn)" : ""}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thông tin nhập hàng</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Giá nhập</Text>
                  <Text style={styles.value}>
                    {typeof item.price === "number"
                      ? `${item.price.toLocaleString("vi-VN")} đ`
                      : formatValue(item.price)}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Ngày nhận hàng</Text>
                  <Text style={styles.value}>{formatDate(item.receivedDate)}</Text>
                </View>
              </View>
            </View>

            {/* NÚT BÁO CÁO HAO HỤT MÀU CAM NỔI BẬT */}
            {!item.isExpired && item.currentQuantity > 0 && (
              <Pressable 
                style={styles.reportButton} 
                onPress={() => setIsModalVisible(true)}
              >
                <Text style={styles.reportButtonText}>⚠ Báo cáo Hao hụt / Hư hỏng</Text>
              </Pressable>
            )}
          </>
        ) : (
          !isLoading && !error && <Text style={styles.emptyText}>Không tìm thấy dữ liệu lô hàng.</Text>
        )}
      </ScrollView>

      {/* MODAL NHẬP THÔNG TIN HAO HỤT */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Báo cáo hao hụt</Text>
              <Pressable onPress={() => setIsModalVisible(false)} style={styles.closeModalBtn}>
                <Text style={styles.closeModalText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.modalSubText}>
              Lô hiện tại đang có: <Text style={{fontWeight: 'bold', color: '#D91E18'}}>{item?.currentQuantity} kg</Text>
            </Text>

            <Text style={styles.inputLabel}>Số lượng bị mất/hư hỏng <Text style={{color: 'red'}}> đơn vị mặc định là kg *</Text></Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              placeholder="VD: 2.5"
              value={lossQuantity}
              onChangeText={setLossQuantity}
            />

            <Text style={styles.inputLabel}>Lý do <Text style={{color: 'red'}}>*</Text></Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              multiline
              numberOfLines={3}
              placeholder="VD: Rớt bể, chuột cắn, hết hạn..."
              value={lossReason}
              onChangeText={setLossReason}
            />

            <View style={styles.modalActions}>
              <Pressable 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.modalBtn, styles.submitBtn, isSubmitting && { opacity: 0.5 }]} 
                onPress={handleReportLoss}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Xác nhận trừ kho</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#FFF4F4",
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#9B0F0F",
  },
  smallBackButton: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  smallBackButtonText: {
    fontSize: 13,
    color: "#8C8C8C",
    fontWeight: "500",
  },
  loader: {
    marginTop: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FFE1E1",
    marginBottom: 20,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D91E18",
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    color: "#8C8C8C",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2A2A2A",
  },
  highlightValue: {
    color: "#D91E18",
    fontSize: 16,
  },
  expiredText: {
    color: "#B40000",
  },
  divider: {
    height: 1,
    backgroundColor: "#FFE1E1",
    marginVertical: 15,
  },
  errorContainer: {
    backgroundColor: "#FFEAEA",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D91E18",
  },
  errorText: {
    color: "#D91E18",
    fontSize: 13,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#8C8C8C",
    marginTop: 40,
  },
  
  // === STYLE CHO NÚT BÁO CÁO & MODAL ===
  reportButton: {
    backgroundColor: '#FFF0ED',
    borderWidth: 1,
    borderColor: '#FF8A65',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  reportButtonText: {
    color: '#D84315',
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 20,
    padding: 20,
    ...cardShadowSmall,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A2A2A',
  },
  closeModalBtn: {
    padding: 5,
  },
  closeModalText: {
    fontSize: 18,
    color: '#8C8C8C',
    fontWeight: 'bold',
  },
  modalSubText: {
    fontSize: 13,
    color: '#8C8C8C',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#2A2A2A',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F5F5F5',
  },
  cancelBtnText: {
    color: '#8C8C8C',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#D91E18',
    flex: 1,
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
});