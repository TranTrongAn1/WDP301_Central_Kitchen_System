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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cardShadowSmall } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useIngredientRequests } from '@/hooks/use-ingredient-requests';
import { useIngredients } from '@/hooks/use-ingredients'; // Import để dò tên NL
import type { IngredientRequest, RequestStatus } from '@/lib/ingredient-requests';

const formatValue = (value: number | string | null | undefined) =>
  value === null || value === undefined ? '--' : String(value);

const getStatusColor = (status: RequestStatus | string) => {
  switch (status) {
    case 'PENDING': return '#E67E22';
    case 'APPROVED': return '#27AE60';
    case 'REJECTED': return '#D91E18';
    case 'COMPLETED': return '#2980B9';
    default: return '#8C8C8C';
  }
};

export default function IngredientRequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const isKitchen = user?.role === 'KitchenStaff';

  const { items, isLoading, error, refetch } = useIngredientRequests('ALL');

  // Gọi API lấy toàn bộ NL để dự phòng dò tên
  const { items: allIngredients } = useIngredients();

  const requests = useMemo(() => items ?? [], [items]);

  // Hàm Helper thông minh dò tên nguyên liệu
  const getIngredientName = (ingredientData: any) => {
    if (!ingredientData) return 'Nguyên liệu không xác định';

    // Trường hợp 1: Backend trả về Object và có sẵn tên (Trường hợp đẹp nhất)
    if (typeof ingredientData === 'object') {
      if (ingredientData.name) return ingredientData.name;
      if (ingredientData.ingredientName) return ingredientData.ingredientName;
    }

    // Lấy ra ID gốc (Dù nó là String hay là trường _id nằm trong Object)
    const rawId = typeof ingredientData === 'string' ? ingredientData : ingredientData._id;

    // Trường hợp 2: Dò bằng rawId trong danh sách allIngredients (từ hook useIngredients)
    if (rawId && allIngredients && allIngredients.length > 0) {
      const foundItem = allIngredients.find((ing) => ing._id === rawId);
      if (foundItem) {
        return foundItem.name || foundItem.ingredientName || 'Nguyên liệu không xác định';
      }
    }

    return 'Nguyên liệu không xác định';
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: 20 + insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Yêu cầu nguyên liệu</Text>
        {isKitchen && (
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push('/kitchen/ingredient-requests-create' as any)}
          >
            <Text style={styles.primaryButtonText}>Tạo yêu cầu</Text>
          </Pressable>
        )}
      </View>

      <Pressable style={styles.secondaryButton} onPress={refetch}>
        <Text style={styles.secondaryButtonText}>Làm mới</Text>
      </Pressable>

      {isLoading && <ActivityIndicator color="#D91E18" style={{ marginBottom: 12 }} />}
      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.list}>
        {requests.map((item: IngredientRequest) => {
          const isUrgent = item.requestType === 'URGENT';

          return (
            <Pressable
              key={item._id}
              // BƯỚC 1: Mở điều hướng. Đường dẫn này giả định ông có file app/kitchen/ingredient-requests/[id].tsx
              onPress={() => {
                // Debug thử xem có dữ liệu không
                console.log("Đang gửi data cho item:", item._id);

                router.push({
                  // 1. Phải khớp với tên folder/file: app/kitchen/ingredient-requests/[id].tsx
                  pathname: '/kitchen/ingredient-requests-details',
                  params: {
                    id: item._id,
                    // 2. Ép kiểu object thành string để truyền qua URL
                    data: JSON.stringify(item)
                  }
                } as any);
              }}
              // Thêm hiệu ứng nhấn cho người dùng biết là bấm được
              style={({ pressed }) => [
                styles.card,
                isUrgent && styles.cardUrgent,
                pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
              ]}>

              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {getIngredientName(item.ingredientId)}
                </Text>
                {isUrgent ? (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentText}>MUA GẤP</Text>
                  </View>
                ) : (
                  <View style={styles.plannedBadge}>
                    <Text style={styles.plannedText}>KẾ HOẠCH</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardMeta}>
                <Text style={styles.cardLabel}>Số lượng</Text>
                <Text style={styles.cardValue}>
                  {formatValue(item.quantityRequested)} {formatValue(item.unit)}
                </Text>
              </View>

              <View style={styles.cardMeta}>
                <Text style={styles.cardLabel}>Trạng thái</Text>
                <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    ● {formatValue(item.status)}
                  </Text>
                </View>
              </View>

              <View style={[styles.cardMeta, { marginTop: 4, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 8 }]}>
                <Text style={styles.cardTime}>
                  Ngày tạo: {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                </Text>
                <Text style={styles.detailLink}>Xem chi tiết ›</Text>
              </View>
            </Pressable>
          );
        })}
        {!isLoading && requests.length === 0 && !error && (
          <Text style={styles.emptyText}>Chưa có phiếu yêu cầu nào.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 20, backgroundColor: '#FFF4F4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#9B0F0F' },
  primaryButton: { backgroundColor: '#D91E18', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  secondaryButton: { alignSelf: 'flex-start', borderRadius: 10, borderWidth: 1, borderColor: '#FFD6D6', paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  secondaryButtonText: { color: '#9B0F0F', fontWeight: '600', fontSize: 12 },
  list: { gap: 12 },
  card: { padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FFE1E1', ...cardShadowSmall, elevation: 1 },
  cardUrgent: { borderColor: '#D91E18', backgroundColor: '#FFEAEA' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#2A2A2A', flex: 1 },
  urgentBadge: { backgroundColor: '#D91E18', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  urgentText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardLabel: { fontSize: 12, color: '#8C8C8C' },
  cardValue: { fontSize: 12, fontWeight: '600', color: '#2A2A2A' },
  errorText: { color: '#D91E18', fontSize: 14, marginBottom: 12, fontWeight: '500' },
  emptyText: { textAlign: 'center', color: '#8C8C8C', marginTop: 20, fontStyle: 'italic' },
  plannedBadge: { backgroundColor: '#E9F7EF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#27AE60' },
  plannedText: { color: '#27AE60', fontSize: 10, fontWeight: 'bold' },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardTime: {
    fontSize: 11,
    color: '#A0A0A0',
  },
  detailLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D91E18',
  },
});