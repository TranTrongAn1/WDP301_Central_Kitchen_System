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

const formatValue = (value: unknown) =>
  value === null || value === undefined ? "—" : String(value);

export default function IngredientBatchDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { item, isLoading, error } = useIngredientBatch(id);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: 16 + insets.top },
      ]}
    >
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Lô nguyên liệu</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>Chi tiết lô nguyên liệu</Text>

      {isLoading ? <ActivityIndicator color="#D91E18" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {item ? (
        <View style={[styles.card, cardShadowSmall]}>
          <View style={styles.row}>
            <Text style={styles.label}>Mã lô</Text>
            <Text style={styles.value}>{formatValue(item.batchCode)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>ID nguyên liệu</Text>
            <Text style={styles.value}>{formatValue(item.ingredientId)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Nhà cung cấp</Text>
            <Text style={styles.value}>{formatValue(item.supplierId)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Ngày nhận</Text>
            <Text style={styles.value}>{formatValue(item.receivedDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Hạn sử dụng</Text>
            <Text style={styles.value}>{formatValue(item.expiryDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Số lượng ban đầu</Text>
            <Text style={styles.value}>{formatValue(item.initialQuantity)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Số lượng còn lại</Text>
            <Text style={styles.value}>{formatValue(item.currentQuantity)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Giá nhập</Text>
            <Text style={styles.value}>
              {typeof item.price === "number"
                ? `${item.price.toLocaleString("vi-VN")} đ`
                : formatValue(item.price)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Trạng thái</Text>
            <Text style={styles.value}>
              {item.isExpired
                ? "Đã hết hạn"
                : item.isActive === false
                  ? "Không hoạt động"
                  : "Đang hoạt động"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tạo lúc</Text>
            <Text style={styles.value}>{formatValue(item.createdAt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cập nhật lúc</Text>
            <Text style={styles.value}>{formatValue(item.updatedAt)}</Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#FFF4F4",
  },
  header: {
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
    fontSize: 18,
    fontWeight: "700",
    color: "#9B0F0F",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE1E1",
  },
  row: {
    marginBottom: 10,
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
  error: {
    color: "#C62828",
    fontSize: 12,
    marginBottom: 8,
  },
});

