import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { cardShadowSmall } from '@/constants/theme';
import { useIngredients } from '@/hooks/use-ingredients';
import type { Ingredient } from '@/lib/ingredients';

const formatValue = (value: number | string | null | undefined) =>
  value === null || value === undefined ? '--' : String(value);

export default function InventoryScreen() {
  const router = useRouter();
  const { items, isLoading, error, refetch } = useIngredients();

  const cards = useMemo(() => items ?? [], [items]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Kho nguyên liệu</Text>
        <View style={styles.headerRight}>
          <Pressable
            style={styles.linkButton}
            onPress={() => router.push('/(tabs)/kitchen/orders')}
          >
            <Text style={styles.linkButtonText}>← Đơn</Text>
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push('/ingredient/create')}
          >
            <Text style={styles.primaryButtonText}>Tạo mới</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.secondaryButton} onPress={refetch}>
        <Text style={styles.secondaryButtonText}>Làm mới</Text>
      </Pressable>

      {isLoading ? <ActivityIndicator color="#D91E18" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.list}>
        {cards.map((item: Ingredient) => {
          const isLow =
            item.totalQuantity !== undefined &&
            item.totalQuantity !== null &&
            item.warningThreshold !== undefined &&
            item.totalQuantity < item.warningThreshold;

          return (
            <Pressable
              key={item._id}
              onPress={() => router.push(`/ingredient/${item._id}`)}
              style={[styles.card, isLow && styles.cardLow]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.ingredientName ?? '--'}</Text>
                <Text style={styles.cardUnit}>{formatValue(item.unit)}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardLabel}>Tồn kho</Text>
                <Text style={styles.cardValue}>{formatValue(item.totalQuantity)}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardLabel}>Ngưỡng cảnh báo</Text>
                <Text style={styles.cardValue}>{formatValue(item.warningThreshold)}</Text>
              </View>
            </Pressable>
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  primaryButton: {
    backgroundColor: '#D91E18',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFD6D6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#9B0F0F',
    fontWeight: '600',
    fontSize: 12,
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
  cardLow: {
    borderColor: '#D91E18',
    backgroundColor: '#FFEAEA',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A2A2A',
  },
  cardUnit: {
    fontSize: 12,
    color: '#8C8C8C',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
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
