import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { productsApi } from '@/lib/api';
import type { Product } from '@/lib/products';
import { useAuth } from '@/hooks/use-auth';

const formatValue = (value: number | string | null | undefined) =>
  value === null || value === undefined ? '--' : String(value);

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [item, setItem] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await productsApi.getById(id, token);
        if (response.success) {
          setItem(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'API sản phẩm chi tiết chưa có.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [id, token]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Chi tiết sản phẩm</Text>
      {isLoading ? <ActivityIndicator color="#D91E18" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {item ? (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Tên</Text>
            <Text style={styles.value}>{formatValue(item.name)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>SKU</Text>
            <Text style={styles.value}>{formatValue(item.sku)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Giá</Text>
            <Text style={styles.value}>
              {item.price ? `${item.price.toLocaleString('vi-VN')} VND` : '--'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Hạn sử dụng (ngày)</Text>
            <Text style={styles.value}>{formatValue(item.shelfLifeDays)}</Text>
          </View>
        </View>
      ) : null}
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
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFE1E1',
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
  error: {
    color: '#D91E18',
    fontSize: 12,
    marginBottom: 8,
  },
});
