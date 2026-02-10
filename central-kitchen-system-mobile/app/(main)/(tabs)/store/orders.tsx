import { cardShadow } from "@/constants/theme";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function StoreOrdersScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Đơn đặt hàng</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.linkButton}
            onPress={() => router.push("/(tabs)/store/inventory")}
          >
            <Text style={styles.linkButtonText}>Tồn kho</Text>
          </Pressable>
          <Pressable
            style={styles.linkButton}
            onPress={() => router.push("/(tabs)/store/products")}
          >
            <Text style={styles.linkButtonText}>Sản phẩm</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tạo đơn hàng mới</Text>
        <Text style={styles.cardSubtitle}>
          Tạo yêu cầu nguyên liệu/bán thành phẩm gửi bếp trung tâm.
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/(tabs)/store/products")}
        >
          <Text style={styles.primaryButtonText}>Tạo đơn</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Theo dõi đơn hàng</Text>
        <Text style={styles.cardSubtitle}>
          Xem trạng thái xử lý và vận chuyển từ bếp trung tâm.
        </Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push("/orders")}
        >
          <Text style={styles.secondaryButtonText}>Xem danh sách</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  linkButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD6D6",
  },
  linkButtonText: {
    color: "#9B0F0F",
    fontWeight: "600",
    fontSize: 13,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#FFF4F4",
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9B0F0F",
  },
  card: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FFE1E1",
    ...cardShadow,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2A2A2A",
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6E6E6E",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#D91E18",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#FFD6D6",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#9B0F0F",
    fontWeight: "600",
  },
});
