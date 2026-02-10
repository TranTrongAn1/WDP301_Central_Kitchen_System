import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { cardShadow } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Cài đặt</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tài khoản</Text>
        <Text style={styles.cardSubtitle}>{user?.fullName ?? user?.username}</Text>
        <Text style={styles.cardMeta}>{user?.role ?? '--'}</Text>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/(tabs)/settings/profile')}
        >
          <Text style={styles.secondaryButtonText}>Xem hồ sơ</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hỗ trợ</Text>
        <Text style={styles.cardSubtitle}>Thông tin liên hệ hoặc hướng dẫn sử dụng.</Text>
        <Pressable style={styles.secondaryButton} onPress={() => {}}>
          <Text style={styles.secondaryButtonText}>Hướng dẫn</Text>
        </Pressable>
      </View>

      <Pressable style={styles.dangerButton} onPress={logout}>
        <Text style={styles.dangerButtonText}>Đăng xuất</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#FFF4F4',
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9B0F0F',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFE1E1',
    ...cardShadow,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A2A2A',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6E6E6E',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: '#9B0F0F',
    marginBottom: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#FFD6D6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#9B0F0F',
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#B40000',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
