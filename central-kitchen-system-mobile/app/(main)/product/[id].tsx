import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { productsApi } from '@/lib/api';
import type { Product } from '@/lib/products';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/hooks/use-auth';

const formatValue = (value: number | string | null | undefined) =>
  value === null || value === undefined ? '--' : String(value);

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const cart = useCart();
  const [item, setItem] = useState<Product | null>(null);
  const isStoreStaff = user?.role === 'StoreStaff';
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
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: 20 + insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>Chi tiết sản phẩm</Text>
      {isLoading ? <ActivityIndicator color="#D91E18" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {item ? (
        <>
          {item.image ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
            </View>
          ) : null}
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
                {item.price != null ? `${item.price.toLocaleString('vi-VN')} đ` : '--'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Hạn sử dụng (ngày)</Text>
              <Text style={styles.value}>{formatValue(item.shelfLifeDays)}</Text>
            </View>
          </View>
          {isStoreStaff ? (
            <Pressable
              style={styles.addBtn}
              onPress={() => {
                cart.addItem(
                  {
                    productId: item._id,
                    productName: item.name ?? '',
                    price: item.price ?? 0,
                    image: item.image,
                  },
                  1,
                );
                router.back();
              }}
            >
              <Text style={styles.addBtnText}>Thêm vào giỏ</Text>
            </Pressable>
          ) : null}
        </>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: 14,
    color: '#9B0F0F',
    fontWeight: '600',
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
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  addBtn: {
    backgroundColor: '#D91E18',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
