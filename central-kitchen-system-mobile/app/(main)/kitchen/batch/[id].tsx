import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cardShadowSmall } from "@/constants/theme";
import { useIngredientBatch } from "@/hooks/use-ingredient-batch";

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
  
  // Gọi hook lấy dữ liệu chi tiết lô hàng
  const { item, isLoading, error } = useIngredientBatch(id);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20 }, // Thụt xuống tránh tai thỏ
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
        <View style={[styles.card, cardShadowSmall]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin định danh</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Mã lô hàng</Text>
              <Text style={styles.value}>{formatValue(item.batchCode)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>ID Hệ thống</Text>
              <Text style={styles.value}>{formatValue(item._id)}</Text>
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
      ) : (
        !isLoading && !error && <Text style={styles.emptyText}>Không tìm thấy dữ liệu lô hàng.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#FFF4F4",
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
});