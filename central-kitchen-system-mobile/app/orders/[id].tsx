import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const handleAction = (action: string) => {
    Alert.alert('Mock action', `${action} - ${id}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Chi tiết đơn {id}</Text>
      <Text style={styles.note}>Dữ liệu mẫu (API chưa có)</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Trạng thái</Text>
          <Text style={styles.value}>Pending</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Cập nhật</Text>
          <Text style={styles.value}>2026-01-20</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ghi chú</Text>
          <Text style={styles.value}>Giao sớm buổi sáng</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={() => handleAction('Receive')}>
          <Text style={styles.primaryButtonText}>Xác nhận nhận hàng</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => handleAction('Feedback')}>
          <Text style={styles.secondaryButtonText}>Gửi phản hồi</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFE1E1',
    marginBottom: 20,
  },
  row: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#8C8C8C',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A2A2A',
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#D91E18',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#FFD6D6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#9B0F0F',
    fontWeight: '600',
  },
});
