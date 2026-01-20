import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useIngredient } from '@/hooks/use-ingredient';
import type { Ingredient } from '@/lib/ingredients';

const formatValue = (value: number | string | null | undefined) =>
  value === null || value === undefined ? '--' : String(value);

export default function IngredientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { item, isLoading, error, update, remove } = useIngredient(id);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<Ingredient>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const merged = useMemo(() => ({ ...(item ?? {}), ...form }), [form, item]);

  const startEdit = () => {
    if (item) {
      setForm({
        name: item.name ?? item.ingredientName,
        unit: item.unit,
        costPrice: item.costPrice,
        warningThreshold: item.warningThreshold,
        ingredientName: item.ingredientName ?? item.name,
      });
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!id) {
      return;
    }

    setIsSubmitting(true);
    try {
      await update({
        ...form,
        name: form.name ?? form.ingredientName,
        ingredientName: form.ingredientName ?? form.name,
      });
      setIsEditing(false);
      setForm({});
    } catch (err) {
      Alert.alert('Cập nhật thất bại', err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Xóa nguyên liệu', 'Bạn chắc chắn muốn xóa?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          if (!id) {
            return;
          }
          setIsSubmitting(true);
          try {
            await remove();
            router.replace('/inventory');
          } catch (err) {
            Alert.alert('Xóa thất bại', err instanceof Error ? err.message : 'Có lỗi xảy ra.');
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Chi tiết nguyên liệu</Text>

      {isLoading ? <ActivityIndicator color="#D91E18" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {item ? (
        <View style={styles.card}>
          {isEditing ? (
            <>
              <Text style={styles.label}>Tên</Text>
              <TextInput
                value={merged.name ?? ''}
                onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
                style={styles.input}
              />

              <Text style={styles.label}>Đơn vị</Text>
              <TextInput
                value={merged.unit ?? ''}
                onChangeText={(value) => setForm((prev) => ({ ...prev, unit: value }))}
                style={styles.input}
              />

              <Text style={styles.label}>Giá vốn</Text>
              <TextInput
                value={merged.costPrice !== undefined ? String(merged.costPrice) : ''}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, costPrice: Number(value) || 0 }))
                }
                keyboardType="numeric"
                style={styles.input}
              />

              <Text style={styles.label}>Ngưỡng cảnh báo</Text>
              <TextInput
                value={merged.warningThreshold !== undefined ? String(merged.warningThreshold) : ''}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, warningThreshold: Number(value) || 0 }))
                }
                keyboardType="numeric"
                style={styles.input}
              />

              <Text style={styles.label}>Tên nguyên liệu (phụ)</Text>
              <TextInput
                value={merged.ingredientName ?? ''}
                onChangeText={(value) => setForm((prev) => ({ ...prev, ingredientName: value }))}
                style={styles.input}
              />
            </>
          ) : (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Tên</Text>
                <Text style={styles.value}>
                  {formatValue(item.name ?? item.ingredientName)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Đơn vị</Text>
                <Text style={styles.value}>{formatValue(item.unit)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Giá vốn</Text>
                <Text style={styles.value}>{formatValue(item.costPrice)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Ngưỡng cảnh báo</Text>
                <Text style={styles.value}>{formatValue(item.warningThreshold)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Tồn kho</Text>
                <Text style={styles.value}>{formatValue(item.totalQuantity)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Tên nguyên liệu (phụ)</Text>
                <Text style={styles.value}>
                  {formatValue(item.ingredientName ?? item.name)}
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
              <View style={styles.row}>
                <Text style={styles.label}>ID</Text>
                <Text style={styles.value}>{formatValue(item._id)}</Text>
              </View>
            </>
          )}
        </View>
      ) : null}

      <View style={styles.actions}>
        {isEditing ? (
          <>
            <Pressable
              onPress={handleSave}
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
              disabled={isSubmitting}>
              <Text style={styles.primaryButtonText}>Lưu</Text>
            </Pressable>
            <Pressable onPress={() => setIsEditing(false)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Hủy</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable onPress={startEdit} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Cập nhật</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={[styles.dangerButton, isSubmitting && styles.buttonDisabled]}
              disabled={isSubmitting}>
              <Text style={styles.dangerButtonText}>Xóa</Text>
            </Pressable>
          </>
        )}
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
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFE1E1',
    shadowColor: '#B40000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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
  input: {
    borderWidth: 1,
    borderColor: '#FFD6D6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#FFF',
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#D91E18',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },
  secondaryButtonText: {
    color: '#9B0F0F',
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#B40000',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  error: {
    color: '#D91E18',
    fontSize: 12,
    marginBottom: 8,
  },
});
