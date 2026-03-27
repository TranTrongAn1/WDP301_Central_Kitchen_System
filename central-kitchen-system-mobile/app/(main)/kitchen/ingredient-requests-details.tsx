import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Pressable, 
  Alert, ActivityIndicator, Modal, TextInput, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ingredientRequestsApi } from "@/lib/api"; 
import { useAuth } from "@/hooks/use-auth";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSuppliers } from '@/hooks/use-suppliers';

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

const formatCurrency = (amount?: number) => {
  if (amount === undefined || amount === null) return '--';
  return `${amount.toLocaleString('vi-VN')} đ`;
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'PENDING': return { text: 'Chờ duyệt', color: '#F39C12', bg: '#FEF5E7' };
    case 'APPROVED': return { text: 'Đã duyệt', color: '#2980B9', bg: '#EAF2F8' };
    case 'COMPLETED': return { text: 'Đã nhập kho', color: '#27AE60', bg: '#E9F7EF' };
    case 'REJECTED': return { text: 'Từ chối', color: '#C0392B', bg: '#FDEDEC' };
    default: return { text: status, color: '#7F8C8D', bg: '#F2F3F4' };
  }
};

export default function IngredientRequestDetailScreen() {
  const { id, data } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  
  const request = data ? JSON.parse(data as string) : null;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [actualCost, setActualCost] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const { suppliers, isLoading: isLoadingSuppliers } = useSuppliers("Active");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  
  // 🚀 THÊM STATE ĐÓNG/MỞ DROPDOWN
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (suppliers.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(suppliers[0]._id);
    }
  }, [suppliers]);

  const handleCompleteSubmit = async () => {
    const cost = Number(actualCost);
    if (actualCost && (isNaN(cost) || cost < 0)) {
        Alert.alert("Lỗi", "Chi phí thực tế không hợp lệ.");
        return;
    }

    if (!expiryDate) {
        Alert.alert("Lỗi", "Bắt buộc phải chọn Hạn sử dụng.");
        return;
    }

    const selectedDate = new Date(expiryDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        Alert.alert("Lỗi", "Hạn sử dụng KHÔNG ĐƯỢC là ngày trong quá khứ!");
        return;
    }

    if (!request.supplierId && !selectedSupplierId) {
        Alert.alert("Lỗi", "Vui lòng chọn Nhà cung cấp từ danh sách.");
        return;
    }

    setSubmitting(true);
    try {
      const payload = {
        status: 'COMPLETED',
        actualCost: cost || 0,
        expiryDate: expiryDate.toISOString(),
        supplierId: request.supplierId ? request.supplierId : selectedSupplierId,
        receiptImage: "", 
      };

      await ingredientRequestsApi.complete(id as string, payload, token);
      
      Alert.alert('Thành công', 'Đã lưu biên lai và tạo Lô kho mới.', [
        { 
          text: 'OK', 
          onPress: () => {
            setIsModalVisible(false);
            router.replace('/(tabs)/ingredient-requests' as any);
          } 
        }
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể chốt đơn hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  if (!request) return <View style={styles.center}><Text>Dữ liệu trống</Text></View>;

  const isUrgent = request.requestType === 'URGENT';
  const statusConfig = getStatusConfig(request.status);
  const canComplete = 
    (isUrgent && request.status !== 'COMPLETED' && request.status !== 'REJECTED') || 
    (!isUrgent && request.status === 'APPROVED');

  return (
    <>
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}>
              <IconSymbol name="chevron.left" size={24} color="#9B0F0F" />
              <Text style={{ fontSize: 15, color: '#9B0F0F', fontWeight: '600', marginLeft: 4 }}>Quay lại</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { position: 'absolute', left: 0, right: 0, textAlign: 'center', zIndex: -1, top: insets.top + 14 }]}>
            Chi tiết phiếu
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Nguyên liệu</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.text}</Text>
              </View>
            </View>
            <Text style={styles.mainValue}>{request.ingredientId?.ingredientName || request.ingredientId?.name || '---'}</Text>
            <View style={styles.divider} />
            <View style={styles.rowBetween}>
              <View>
                  <Text style={styles.subLabel}>Số lượng cần</Text>
                  <Text style={styles.valueText}>{request.quantityRequested} {request.unit}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.subLabel}>Phân loại</Text>
                  <Text style={isUrgent ? styles.urgentText : styles.plannedText}>
                      {isUrgent ? 'Mua Gấp (URGENT)' : 'Kế Hoạch (PLANNED)'}
                  </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
              <Text style={styles.sectionTitle}>Thông tin mua hàng</Text>
              <View style={styles.detailRow}>
                  <Text style={styles.subLabel}>Nhà cung cấp / Nơi mua:</Text>
                  <Text style={styles.detailValue}>{request.supplierId ? 'Nhà cung cấp hệ thống' : (request.supplierName || '---')}</Text>
              </View>
              <View style={styles.detailRow}>
                  <Text style={styles.subLabel}>Chi phí thực tế:</Text>
                  <Text style={[styles.detailValue, { color: '#9B0F0F', fontWeight: '700' }]}>
                      {formatCurrency(request.actualCost)}
                  </Text>
              </View>
          </View>

          <View style={styles.card}>
              <Text style={styles.sectionTitle}>Thời gian & Ghi chú</Text>
              <View style={styles.detailRow}>
                  <Text style={styles.subLabel}>Ngày tạo phiếu:</Text>
                  <Text style={styles.detailValue}>{formatDate(request.createdAt)}</Text>
              </View>
              <View style={styles.detailRow}>
                  <Text style={styles.subLabel}>Cần trước ngày:</Text>
                  <Text style={styles.detailValue}>{formatDate(request.neededByDate)}</Text>
              </View>
              {request.expectedDeliveryDate && (
                  <View style={styles.detailRow}>
                      <Text style={styles.subLabel}>Ngày giao dự kiến:</Text>
                      <Text style={styles.detailValue}>{formatDate(request.expectedDeliveryDate)}</Text>
                  </View>
              )}
              {request.note && (
                  <View style={{ marginTop: 8 }}>
                      <Text style={styles.subLabel}>Ghi chú:</Text>
                      <View style={styles.noteBox}>
                          <Text style={styles.noteText}>{request.note}</Text>
                      </View>
                  </View>
              )}
          </View>
        </ScrollView>

        {canComplete && (
          <View style={styles.footer}>
            <Pressable style={styles.btn} onPress={() => setIsModalVisible(true)}>
              <Text style={styles.btnText}>CHỐT HÀNG & NHẬP KHO</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông tin Nhập lô mới</Text>
              <Pressable onPress={() => setIsModalVisible(false)} style={styles.closeModalBtn}>
                <Text style={styles.closeModalText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.modalSubText}>
              Bếp đang nhập <Text style={{fontWeight: 'bold', color: '#D91E18'}}>{request.quantityRequested} {request.unit}</Text> {request.ingredientId?.ingredientName || 'nguyên liệu'}.
            </Text>

            <Text style={styles.inputLabel}>Hạn sử dụng (Bắt buộc) <Text style={{color: 'red'}}>*</Text></Text>
            <Pressable 
              style={styles.datePickerBtn} 
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{color: '#2A2A2A', fontSize: 15}}>{expiryDate.toLocaleDateString('vi-VN')}</Text>
              <IconSymbol name="calendar" size={20} color="#8C8C8C" />
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={expiryDate}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={today}
              />
            )}

            <Text style={styles.inputLabel}>Chi phí mua thực tế (VND)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              placeholder="VD: 150000"
              value={actualCost}
              onChangeText={setActualCost}
            />

            {/* 🚀 DROPDOWN NHÀ CUNG CẤP */}
            {!request.supplierId && (
              <View style={{ zIndex: 10 }}>
                <Text style={styles.inputLabel}>Chọn Nhà cung cấp <Text style={{color: 'red'}}>*</Text></Text>
                
                {isLoadingSuppliers ? (
                  <ActivityIndicator size="small" color="#D91E18" style={{ alignSelf: 'flex-start', marginVertical: 10 }} />
                ) : (
                  <>
                    <Pressable 
                      style={styles.dropdownTrigger} 
                      onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <Text style={{color: selectedSupplierId ? '#2A2A2A' : '#8C8C8C', fontSize: 15}}>
                        {selectedSupplierId 
                          ? suppliers.find(s => s._id === selectedSupplierId)?.name 
                          : 'Bấm để chọn nhà cung cấp...'}
                      </Text>
                      <IconSymbol name={isDropdownOpen ? "chevron.up" : "chevron.down"} size={20} color="#8C8C8C" />
                    </Pressable>

                    {isDropdownOpen && (
                      <View style={styles.dropdownList}>
                        {/* nestedScrollEnabled giúp scroll trong danh sách mượt mà kể cả khi nằm trong Modal */}
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 160 }}>
                          {suppliers.map((sup) => (
                            <Pressable 
                              key={sup._id} 
                              style={[styles.dropdownItem, selectedSupplierId === sup._id && styles.dropdownItemSelected]}
                              onPress={() => {
                                setSelectedSupplierId(sup._id);
                                setIsDropdownOpen(false); // Chọn xong tự đóng lại
                              }}
                            >
                              <Text style={[styles.dropdownItemText, selectedSupplierId === sup._id && styles.dropdownItemTextSelected]} numberOfLines={2}>
                                {sup.name}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.modalBtn, styles.submitBtn, submitting && { opacity: 0.5 }]} 
                onPress={handleCompleteSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Xác nhận Tạo Lô</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF4F4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FFF4F4' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#9B0F0F' },
  scrollContent: { padding: 16, gap: 16 },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FFE1E1', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#9B0F0F', marginBottom: 12, textTransform: 'uppercase' },
  label: { fontSize: 12, color: '#8C8C8C', textTransform: 'uppercase', marginBottom: 4 },
  mainValue: { fontSize: 20, fontWeight: '800', color: '#2A2A2A', marginTop: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#FFE1E1', marginVertical: 12 },
  subLabel: { fontSize: 13, color: '#8C8C8C', marginBottom: 2 },
  valueText: { fontSize: 16, fontWeight: '700', color: '#2A2A2A' },
  urgentText: { fontSize: 15, fontWeight: '800', color: '#D91E18' },
  plannedText: { fontSize: 15, fontWeight: '800', color: '#27AE60' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#2A2A2A', maxWidth: '60%', textAlign: 'right' },
  noteBox: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: '#EEEEEE' },
  noteText: { fontSize: 14, color: '#444', fontStyle: 'italic' },
  footer: { padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#FFE1E1' },
  btn: { backgroundColor: '#D91E18', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#9B0F0F' },
  closeModalBtn: { padding: 5 },
  closeModalText: { fontSize: 20, color: '#8C8C8C', fontWeight: 'bold' },
  modalSubText: { fontSize: 14, color: '#444', marginBottom: 20, lineHeight: 22 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#2A2A2A', marginBottom: 8, marginTop: 10 },
  textInput: { borderWidth: 1, borderColor: '#FFE1E1', borderRadius: 12, padding: 14, fontSize: 15, color: '#2A2A2A', backgroundColor: '#FFF' },
  datePickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#FFE1E1', borderRadius: 12, padding: 14, backgroundColor: '#FFF' },
  
  // 🚀 STYLE CHO DROPDOWN
  dropdownTrigger: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#FFE1E1', borderRadius: 12, padding: 14, backgroundColor: '#FFF'
  },
  dropdownList: {
    borderWidth: 1, borderColor: '#FFE1E1', borderRadius: 12, backgroundColor: '#FFF',
    marginTop: 6, overflow: 'hidden',
  },
  dropdownItem: {
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5'
  },
  dropdownItemSelected: { backgroundColor: '#FFF0F0' },
  dropdownItemText: { fontSize: 15, color: '#444' },
  dropdownItemTextSelected: { color: '#D91E18', fontWeight: '700' },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  modalBtn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F5F5F5', width: 100 },
  cancelBtnText: { color: '#8C8C8C', fontWeight: '700' },
  submitBtn: { backgroundColor: '#D91E18', flex: 1 },
  submitBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});