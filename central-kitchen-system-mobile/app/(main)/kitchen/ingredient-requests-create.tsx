import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/use-auth';
import { ingredientRequestsApi } from '@/lib/api';
// Gọi hook lấy danh sách nguyên liệu có sẵn của bạn
import { useIngredients } from '@/hooks/use-ingredients';
import type { Ingredient } from '@/lib/ingredients';

export default function CreateIngredientRequestScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  
  // Data nguyên liệu từ API
  const { items: ingredients, isLoading: isIngredientsLoading } = useIngredients();
  
  // State quản lý Dropdown
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const [selectedIngredientName, setSelectedIngredientName] = useState('Chọn nguyên liệu...');

  // State form
  const [ingredientId, setIngredientId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [requestType, setRequestType] = useState<'URGENT' | 'PLANNED'>('URGENT');
  const [note, setNote] = useState('');

  // Hàm xử lý chọn nguyên liệu từ danh sách
  const handleSelectIngredient = (item: Ingredient) => {
    setIngredientId(item._id);
    setSelectedIngredientName(item.name ?? item.ingredientName ?? 'Không xác định');
    // Gợi ý luôn đơn vị mặc định của nguyên liệu đó nếu có
    if (item.unit) setUnit(item.unit);
    setDropdownVisible(false);
  };

  const handleSubmit = async () => {
    if (!ingredientId || !quantity) {
      Alert.alert('Lỗi', 'Vui lòng chọn nguyên liệu và nhập số lượng!');
      return;
    }

    setIsLoadingSubmit(true);
    try {
      const payload = {
        ingredientId,
        quantityRequested: Number(quantity),
        unit,
        requestType,
        note,
      };

      const res = await ingredientRequestsApi.create(payload, token);
      
      if (res.success) {
        Alert.alert('Thành công', 'Đã tạo phiếu yêu cầu mua hàng!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo yêu cầu');
    } finally {
      setIsLoadingSubmit(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>{'< Trở lại'}</Text>
          </Pressable>
          <Text style={styles.title}>Tạo phiếu yêu cầu</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* --- KHU VỰC CHỌN NGUYÊN LIỆU (DROPDOWN) --- */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nguyên liệu</Text>
          <Pressable 
            style={styles.dropdownButton} 
            onPress={() => setDropdownVisible(true)}
          >
            <Text style={[styles.dropdownText, !ingredientId && { color: '#8C8C8C' }]}>
              {selectedIngredientName}
            </Text>
            {isIngredientsLoading ? (
              <ActivityIndicator size="small" color="#D91E18" />
            ) : (
              <Text style={{ color: '#8C8C8C' }}>▼</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 2, marginRight: 10 }]}>
            <Text style={styles.label}>Số lượng</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Đơn vị</Text>
            <TextInput
              style={styles.input}
              value={unit}
              onChangeText={setUnit}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Mức độ ưu tiên</Text>
          <View style={styles.radioGroup}>
            <Pressable 
              style={[styles.radioBtn, requestType === 'URGENT' && styles.radioActive]}
              onPress={() => setRequestType('URGENT')}
            >
              <Text style={[styles.radioText, requestType === 'URGENT' && styles.radioTextActive]}>Mua gấp</Text>
            </Pressable>
            <Pressable 
              style={[styles.radioBtn, requestType === 'PLANNED' && styles.radioActivePln]}
              onPress={() => setRequestType('PLANNED')}
            >
              <Text style={[styles.radioText, requestType === 'PLANNED' && styles.radioTextActive]}>Kế hoạch</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Ghi chú cho Điều phối</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Lý do mua gấp, nhãn hiệu yêu cầu..."
            multiline
            numberOfLines={4}
            value={note}
            onChangeText={setNote}
          />
        </View>

        <Pressable 
          style={styles.submitBtn} 
          onPress={handleSubmit}
          disabled={isLoadingSubmit}
        >
          {isLoadingSubmit ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitText}>Gửi Yêu Cầu</Text>
          )}
        </Pressable>
      </ScrollView>

      {/* --- MODAL CHỌN NGUYÊN LIỆU --- */}
      <Modal
        visible={isDropdownVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDropdownVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn nguyên liệu</Text>
              <Pressable onPress={() => setDropdownVisible(false)}>
                <Text style={styles.modalClose}>Đóng</Text>
              </Pressable>
            </View>
            
            <FlatList
              data={ingredients || []}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <Pressable 
                  style={styles.modalItem}
                  onPress={() => handleSelectIngredient(item)}
                >
                  <Text style={styles.modalItemText}>
                    {item.name ?? item.ingredientName ?? 'N/A'}
                  </Text>
                  <Text style={styles.modalItemUnit}>Tồn: {item.totalQuantity || 0} {item.unit}</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', marginTop: 20, color: '#8C8C8C' }}>
                  {isIngredientsLoading ? 'Đang tải...' : 'Không có dữ liệu nguyên liệu'}
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#FFF4F4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 18, fontWeight: '700', color: '#9B0F0F' },
  backBtn: { paddingVertical: 8, width: 60 },
  backText: { color: '#D91E18', fontWeight: '600' },
  formGroup: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '600', color: '#2A2A2A', marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FFE1E1', borderRadius: 10, padding: 12, fontSize: 15, color: '#2A2A2A' },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FFE1E1', borderRadius: 10, padding: 15 },
  dropdownText: { fontSize: 15, color: '#2A2A2A' },
  textArea: { height: 100, textAlignVertical: 'top' },
  radioGroup: { flexDirection: 'row', gap: 10 },
  radioBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#FFE1E1', borderRadius: 10, alignItems: 'center', backgroundColor: '#FFF' },
  radioActive: { borderColor: '#D91E18', backgroundColor: '#FFEAEA' },
  radioActivePln: { borderColor: '#27AE60', backgroundColor: '#E9F7EF' },
  radioText: { color: '#8C8C8C', fontWeight: '600' },
  radioTextActive: { color: '#2A2A2A' },
  submitBtn: { backgroundColor: '#D91E18', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  
  // Styles cho Dropdown Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2A2A2A' },
  modalClose: { color: '#D91E18', fontWeight: 'bold', fontSize: 16 },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 16, color: '#2A2A2A', fontWeight: '500' },
  modalItemUnit: { fontSize: 13, color: '#8C8C8C' }
});