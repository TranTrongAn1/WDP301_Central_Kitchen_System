import { useRouter } from 'expo-router';
import { useState } from 'react';
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

// --- MOCK DATA (Thay thế bằng hook fetch API thật sau này) ---
const MOCK_REQUESTS = [
  {
    _id: 'REQ001',
    ingredientName: 'Bột mì đa dụng',
    quantityRequested: 50,
    unit: 'kg',
    requestType: 'URGENT',
    status: 'PENDING',
    createdAt: '14/03/2026',
  },
  {
    _id: 'REQ002',
    ingredientName: 'Đường cát trắng',
    quantityRequested: 100,
    unit: 'kg',
    requestType: 'PLANNED',
    status: 'APPROVED',
    createdAt: '13/03/2026',
  },
];

const formatValue = (value: number | string | null | undefined) =>
  value === null || value === undefined ? '--' : String(value);

// Helper để render màu trạng thái cho đẹp
const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING': return '#E67E22'; // Cam
    case 'APPROVED': return '#27AE60'; // Xanh lá
    case 'REJECTED': return '#D91E18'; // Đỏ
    case 'COMPLETED': return '#2980B9'; // Xanh dương
    default: return '#8C8C8C';
  }
};

export default function IngredientRequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  
  // Dùng state giả lập loading
  const [isLoading, setIsLoading] = useState(false);
  const [requests, setRequests] = useState(MOCK_REQUESTS);

  const handleRefetch = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: 20 + insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Yêu cầu nguyên liệu</Text>
        {/* Nút Tạo Yêu Cầu cho Bếp */}
        <Pressable 
          style={styles.primaryButton} 
          // onPress={() => router.push('/ingredient-requests/create')} // Trỏ tới trang tạo form
        >
          <Text style={styles.primaryButtonText}>Tạo yêu cầu</Text>
        </Pressable>
      </View>

      <Pressable style={styles.secondaryButton} onPress={handleRefetch}>
        <Text style={styles.secondaryButtonText}>Làm mới</Text>
      </Pressable>

      {isLoading ? <ActivityIndicator color="#D91E18" style={{ marginBottom: 12 }} /> : null}

      <View style={styles.list}>
        {requests.map((item) => {
          const isUrgent = item.requestType === 'URGENT';

          return (
            <Pressable
              key={item._id}
              // onPress={() => router.push(`/ingredient-requests/${item._id}`)}
              style={[styles.card, isUrgent && styles.cardUrgent]}>
              
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.ingredientName}</Text>
                {/* Badge URGENT nếu là phiếu mua gấp */}
                {isUrgent && (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentText}>MUA GẤP</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardMeta}>
                <Text style={styles.cardLabel}>Số lượng cần</Text>
                <Text style={styles.cardValue}>
                  {formatValue(item.quantityRequested)} {formatValue(item.unit)}
                </Text>
              </View>

              <View style={styles.cardMeta}>
                <Text style={styles.cardLabel}>Trạng thái</Text>
                <Text style={[styles.cardValue, { color: getStatusColor(item.status) }]}>
                  {formatValue(item.status)}
                </Text>
              </View>

              <View style={styles.cardMeta}>
                <Text style={styles.cardLabel}>Ngày tạo</Text>
                <Text style={styles.cardValue}>{item.createdAt}</Text>
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
  // Style riêng cho thẻ Mua Gấp (URGENT) -> viền đỏ, nền hồng nhạt
  cardUrgent: {
    borderColor: '#D91E18',
    backgroundColor: '#FFEAEA',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A2A2A',
    flex: 1,
  },
  urgentBadge: {
    backgroundColor: '#D91E18',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgentText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
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
});