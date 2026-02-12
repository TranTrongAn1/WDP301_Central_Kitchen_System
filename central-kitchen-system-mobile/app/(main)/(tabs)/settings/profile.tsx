import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cardShadow } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';

const formatValue = (value: string | null | undefined) => value ?? '--';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();
  const { profile, isLoading, error, refetch } = useProfile();

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: 20 + insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </Pressable>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Thông tin tài khoản</Text>

        {isLoading ? (
          <ActivityIndicator color="#D91E18" />
        ) : (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Họ tên</Text>
              <Text style={styles.value}>{formatValue(profile?.fullName)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Username</Text>
              <Text style={styles.value}>{formatValue(profile?.username)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{formatValue(profile?.email)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Role</Text>
              <Text style={styles.value}>{formatValue(profile?.role)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Cửa hàng</Text>
              <Text style={styles.value}>{formatValue(profile?.storeName)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Trạng thái</Text>
              <Text style={styles.value}>
                {profile?.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
              </Text>
            </View>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={refetch} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Làm mới</Text>
        </Pressable>
      </View>

      <Pressable onPress={logout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFE1E1',
    ...cardShadow,
    elevation: 2,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9B0F0F',
    marginBottom: 16,
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
    marginTop: 12,
    color: '#D91E18',
    fontSize: 12,
  },
  secondaryButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },
  secondaryButtonText: {
    color: '#9B0F0F',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#D91E18',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
