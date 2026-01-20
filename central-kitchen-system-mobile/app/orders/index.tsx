import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const mockOrders = [
  { id: "ORD-1001", status: "Pending", updatedAt: "2026-01-20" },
  { id: "ORD-1002", status: "Approved", updatedAt: "2026-01-19" },
  { id: "ORD-1003", status: "Shipped", updatedAt: "2026-01-18" },
];

export default function OrdersListScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Đơn hàng</Text>
      <Text style={styles.note}>Dữ liệu mẫu (API chưa có)</Text>

      <View style={styles.list}>
        {mockOrders.map((order) => (
            <Pressable
              key={order.id}
              onPress={() => router.push(`/orders/${order.id}`)}
              style={styles.card}
            >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{order.id}</Text>
              <Text style={styles.cardStatus}>{order.status}</Text>
            </View>
            <Text style={styles.cardMeta}>Cập nhật: {order.updatedAt}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#FFF4F4",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9B0F0F",
    marginBottom: 6,
  },
  note: {
    fontSize: 12,
    color: "#D91E18",
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FFE1E1",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2A2A2A",
  },
  cardStatus: {
    fontSize: 12,
    color: "#6E6E6E",
  },
  cardMeta: {
    fontSize: 12,
    color: "#2A2A2A",
  },
});
