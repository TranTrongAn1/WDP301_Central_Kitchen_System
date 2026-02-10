import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

const mockOrders = [
  { id: 'ORD-1001', store: 'Cửa hàng Q1', items: 12, status: 'Pending' },
  { id: 'ORD-1002', store: 'Cửa hàng Q3', items: 6, status: 'Pending' },
];

export default function KitchenOrdersScreen() {
  const router = useRouter();
  const handleAction = (action: string, orderId: string) => {
    Alert.alert('Mock action', `${action} - ${orderId}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Đơn cần xử lý</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.linkButton}
            onPress={() => router.push('/(tabs)/kitchen/inventory')}
          >
            <Text style={styles.linkButtonText}>Kho</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.note}>Dữ liệu mẫu (API chưa có)</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Batch sản xuất</Text>
        <Text style={styles.cardSubtitle}>
          Xem và cập nhật batch sản xuất từ màn hình con.
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/(tabs)/kitchen/batches')}>
          <Text style={styles.secondaryButtonText}>Đi tới Batch</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {mockOrders.map((order) => (
          <View key={order.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{order.id}</Text>
              <Text style={styles.cardStatus}>{order.status}</Text>
            </View>
            <Text style={styles.cardSubtitle}>{order.store}</Text>
            <Text style={styles.cardMeta}>Số dòng hàng: {order.items}</Text>
            <View style={styles.actions}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => handleAction('Approve', order.id)}>
                <Text style={styles.primaryButtonText}>Duyệt</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => handleAction('Reject', order.id)}>
                <Text style={styles.secondaryButtonText}>Từ chối</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  linkButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },
  linkButtonText: {
    color: '#9B0F0F',
    fontWeight: '600',
    fontSize: 12,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#FFF4F4',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9B0F0F',
    marginBottom: 6,
  },
  note: {
    fontSize: 12,
    color: '#D91E18',
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFE1E1',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A2A2A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6E6E6E',
    marginBottom: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardStatus: {
    fontSize: 12,
    color: '#6E6E6E',
  },
  cardMeta: {
    fontSize: 12,
    color: '#2A2A2A',
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#D91E18',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#FFD6D6',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#9B0F0F',
    fontWeight: '600',
    fontSize: 12,
  },
});
