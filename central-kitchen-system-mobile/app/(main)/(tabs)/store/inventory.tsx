import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { cardShadowSmall } from '@/constants/theme';
import { useStoreInventory } from '@/hooks/use-store-inventory';

const formatValue = (value: number | string | null | undefined) =>
  value === null || value === undefined ? '--' : String(value);

export default function StoreInventoryScreen() {
  const router = useRouter();
  const { items, isLoading, error, isMock, refetch } = useStoreInventory();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Tồn kho cửa hàng</Text>
        <View style={styles.headerRight}>
          <Pressable
            style={styles.linkButton}
            onPress={() => router.back()}
          >
            <Text style={styles.linkButtonText}>← Đơn hàng</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={refetch}>
            <Text style={styles.secondaryButtonText}>Làm mới</Text>
          </Pressable>
        </View>
      </View>

      {isMock ? <Text style={styles.mockLabel}>Dữ liệu mẫu</Text> : null}
      {isLoading ? <ActivityIndicator color="#D91E18" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.list}>
        {items.map((item) => {
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.productName}</Text>
                <Text style={styles.cardUnit}>{formatValue(item.sku)}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardLabel}>Số lượng</Text>
                <Text style={styles.cardValue}>{formatValue(item.quantity)}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardLabel}>Batch</Text>
                <Text style={styles.cardValue}>{formatValue(item.batchCode)}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardLabel}>Hạn dùng</Text>
                <Text style={styles.cardValue}>{formatValue(item.expDate)}</Text>
              </View>
            </View>
          );
        })}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9B0F0F',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#FFD6D6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: '#9B0F0F',
    fontWeight: '600',
    fontSize: 12,
  },
  mockLabel: {
    fontSize: 12,
    color: '#D91E18',
    marginBottom: 8,
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
    ...cardShadowSmall,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A2A2A',
  },
  cardUnit: {
    fontSize: 11,
    color: '#8C8C8C',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 12,
    color: '#8C8C8C',
  },
  cardValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2A2A2A',
  },
  error: {
    color: '#D91E18',
    fontSize: 12,
    marginBottom: 8,
  },
});
