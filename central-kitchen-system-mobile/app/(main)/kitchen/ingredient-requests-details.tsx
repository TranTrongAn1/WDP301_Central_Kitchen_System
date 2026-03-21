import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ingredientRequestsApi } from "@/lib/api"; 
import { useAuth } from "@/hooks/use-auth";
export default function IngredientRequestDetailScreen() {
  const { id, data } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  // ỨNG BIẾN: Parse data từ params thay vì gọi API getById
  const request = data ? JSON.parse(data as string) : null;

  const handleCompleteUrgent = () => {
  Alert.alert(
    'Xác nhận nhập kho', 
    'Bạn đã mua và nhận đủ nguyên liệu này?', 
    [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: async () => {
          setSubmitting(true);
          try {
            const res = await ingredientRequestsApi.complete(id as string, {
              status: 'COMPLETED',
              receivedDate: new Date().toISOString(),
            }, token);
            
            // Dùng Alert thay cho Toast
            Alert.alert('Thành công', 'Đã nhập kho nguyên liệu.', [
              { 
                text: 'OK', 
                onPress: () => router.replace('/kitchen/ingredient-requests' as any) 
              }
            ]);

          } catch (error: any) {
            // Báo lỗi cũng dùng Alert
            Alert.alert('Lỗi', error.message || 'Không thể chốt đơn hàng.');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]
  );
};

  if (!request) return <View style={styles.center}><Text>Dữ liệu trống</Text></View>;

  const isUrgent = request.requestType === 'URGENT';
  const canComplete = isUrgent && request.status !== 'COMPLETED';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()}><IconSymbol name="chevron.left" size={24} color="#111" /></Pressable>
        <Text style={styles.headerTitle}>Chi tiết phiếu</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <Text style={styles.label}>Nguyên liệu</Text>
          <Text style={styles.mainValue}>{request.ingredientId?.ingredientName || request.ingredientId?.name || '---'}</Text>
          
          <View style={styles.row}>
            <Text style={styles.subLabel}>Số lượng: <Text style={styles.black}>{request.quantityRequested} {request.unit}</Text></Text>
            <Text style={styles.subLabel}>Loại: <Text style={isUrgent ? styles.red : styles.green}>{request.requestType}</Text></Text>
          </View>
        </View>
      </ScrollView>

      {canComplete && (
        <View style={styles.footer}>
          <Pressable style={styles.btn} onPress={handleCompleteUrgent} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>CHỐT HÀNG & NHẬP KHO</Text>}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12 },
  label: { fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 4 },
  mainValue: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  subLabel: { fontSize: 14, color: '#666' },
  black: { color: '#000', fontWeight: '700' },
  red: { color: '#D91E18', fontWeight: '800' },
  green: { color: '#27AE60', fontWeight: '800' },
  footer: { padding: 16, backgroundColor: '#FFF' },
  btn: { backgroundColor: '#D91E18', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '800' }
});