import { useState } from 'react';
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
import { useRouter } from 'expo-router';

import { ingredientsApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

export default function IngredientCreateScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [warningThreshold, setWarningThreshold] = useState('');
  const [ingredientName, setIngredientName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name || !unit) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên và đơn vị.');
      return;
    }

    setIsSubmitting(true);
    try {
      await ingredientsApi.create(
        {
          name,
          ingredientName: ingredientName || name,
          unit,
          costPrice: Number(costPrice) || 0,
          warningThreshold: Number(warningThreshold) || 0,
        },
        token
      );
      router.replace('/inventory');
    } catch (err) {
      Alert.alert('Tạo thất bại', err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tạo nguyên liệu</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Tên</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} />

        <Text style={styles.label}>Đơn vị</Text>
        <TextInput value={unit} onChangeText={setUnit} style={styles.input} />

        <Text style={styles.label}>Giá vốn</Text>
        <TextInput
          value={costPrice}
          onChangeText={setCostPrice}
          keyboardType="numeric"
          style={styles.input}
        />

        <Text style={styles.label}>Ngưỡng cảnh báo</Text>
        <TextInput
          value={warningThreshold}
          onChangeText={setWarningThreshold}
          keyboardType="numeric"
          style={styles.input}
        />

        <Text style={styles.label}>Tên nguyên liệu (phụ)</Text>
        <TextInput value={ingredientName} onChangeText={setIngredientName} style={styles.input} />
      </View>

      <Pressable
        onPress={handleSubmit}
        style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
        disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Tạo</Text>}
      </Pressable>
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
  label: {
    fontSize: 12,
    color: '#8C8C8C',
    marginBottom: 4,
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
  buttonDisabled: {
    opacity: 0.6,
  },
});
