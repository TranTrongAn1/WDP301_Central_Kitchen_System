import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const mockBatches = [
  { id: 'BATCH-9001', product: 'Bánh nướng thập cẩm', quantity: 300, status: 'InProgress' },
  { id: 'BATCH-9002', product: 'Bánh dẻo đậu xanh', quantity: 150, status: 'Pending' },
];

export default function KitchenBatchesScreen() {
  const handleComplete = (batchId: string) => {
    Alert.alert('Mock action', `Complete batch ${batchId}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Batch sản xuất</Text>
      <Text style={styles.note}>Dữ liệu mẫu (API chưa có)</Text>

      <View style={styles.list}>
        {mockBatches.map((batch) => (
          <View key={batch.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{batch.id}</Text>
              <Text style={styles.cardStatus}>{batch.status}</Text>
            </View>
            <Text style={styles.cardSubtitle}>{batch.product}</Text>
            <Text style={styles.cardMeta}>Số lượng: {batch.quantity}</Text>
            <Pressable style={styles.primaryButton} onPress={() => handleComplete(batch.id)}>
              <Text style={styles.primaryButtonText}>Hoàn tất</Text>
            </Pressable>
          </View>
        ))}
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A2A2A',
  },
  cardStatus: {
    fontSize: 12,
    color: '#6E6E6E',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6E6E6E',
    marginBottom: 6,
  },
  cardMeta: {
    fontSize: 12,
    color: '#2A2A2A',
    marginBottom: 10,
  },
  primaryButton: {
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
});
