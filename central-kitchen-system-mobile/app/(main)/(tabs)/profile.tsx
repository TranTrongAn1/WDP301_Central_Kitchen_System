import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { cardShadow } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { useWallet } from '@/hooks/use-wallet';

const formatValue = (value: string | null | undefined) => value ?? '--';

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'Deposit': return '💰';
    case 'Payment': return '💳';
    case 'Refund': return '↩️';
    case 'Withdrawal': return '💸';
    default: return '•';
  }
};

const getTransactionColor = (type: string) => {
  switch (type) {
    case 'Deposit': return '#10B981';
    case 'Refund': return '#F59E0B';
    case 'Payment': return '#EF4444';
    case 'Withdrawal': return '#EF4444';
    default: return '#6B7280';
  }
};

export default function ProfileScreen() {
  const { logout } = useAuth();
  const { profile, isLoading, error, refetch } = useProfile();
  const { wallet, transactions, isLoading: walletLoading, error: walletError, refetch: refetchWallet } = useWallet();
  const [showTransactions, setShowTransactions] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.content}>
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

      {/* Wallet Card */}
      <View style={styles.card}>
        <Pressable
          onPress={() => setShowTransactions(!showTransactions)}
          style={styles.walletHeader}
        >
          <Text style={styles.title}>💳 Số dư ví</Text>
          <Text style={styles.expandIcon}>{showTransactions ? '▼' : '▶'}</Text>
        </Pressable>

        {walletLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#D91E18" size="large" />
            <Text style={styles.loadingText}>Đang tải thông tin ví...</Text>
          </View>
        ) : walletError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {walletError}</Text>
            <Pressable onPress={refetchWallet} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : wallet ? (
          <>
            <View style={styles.walletBalanceSection}>
              <Text style={styles.walletBalanceLabel}>Số dư hiện tại</Text>
              <Text style={styles.walletBalanceValue}>
                {wallet.balance.toLocaleString('vi-VN')} đ
              </Text>
              <Text style={[
                styles.walletStatus,
                { color: wallet.status === 'Active' ? '#10B981' : '#EF4444' }
              ]}>
                {wallet.status === 'Active' ? '✓ Hoạt động' : '✗ Bị khóa'}
              </Text>
            </View>

            {showTransactions && (
              <View style={styles.transactionsList}>
                <View style={styles.transactionHeader}>
                  <Text style={styles.transactionHeaderText}>
                    📋 Lịch sử giao dịch ({transactions.length})
                  </Text>
                  <Pressable onPress={refetchWallet}>
                    <Text style={styles.refreshBtn}>⟳</Text>
                  </Pressable>
                </View>

                {transactions.length === 0 ? (
                  <Text style={styles.emptyTransaction}>Chưa có giao dịch nào</Text>
                ) : (
                  transactions.map((tx, idx) => (
                    <View key={tx._id || idx} style={styles.transactionItem}>
                      <View style={styles.transactionLeft}>
                        <Text style={styles.txIcon}>{getTransactionIcon(tx.type)}</Text>
                        <View style={styles.txInfo}>
                          <Text style={styles.txType}>{tx.type}</Text>
                          <Text style={styles.txDate}>
                            {formatDate(tx.timestamp)}
                          </Text>
                          {tx.description && (
                            <Text style={styles.txDesc}>{tx.description}</Text>
                          )}
                        </View>
                      </View>
                      <Text style={[
                        styles.txAmount,
                        { color: getTransactionColor(tx.type) }
                      ]}>
                        {tx.amount.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Không có dữ liệu ví</Text>
            <Pressable onPress={refetchWallet} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Tải lại</Text>
            </Pressable>
          </View>
        )}
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
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandIcon: {
    fontSize: 12,
    color: '#9B0F0F',
    fontWeight: '600',
  },
  walletBalanceSection: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#FFF4F4',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  walletBalanceLabel: {
    fontSize: 12,
    color: '#8C8C8C',
    marginBottom: 4,
  },
  walletBalanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#9B0F0F',
    marginBottom: 4,
  },
  walletStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionsList: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FFE1E1',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A2A2A',
  },
  refreshBtn: {
    fontSize: 16,
    color: '#9B0F0F',
  },
  emptyTransaction: {
    textAlign: 'center',
    color: '#8C8C8C',
    fontSize: 13,
    paddingVertical: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE1E1',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  txIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  txInfo: {
    flex: 1,
  },
  txType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A2A2A',
    marginBottom: 2,
  },
  txDate: {
    fontSize: 11,
    color: '#8C8C8C',
    marginBottom: 2,
  },
  txDesc: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 13,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    color: '#8C8C8C',
    fontSize: 13,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#9B0F0F',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
});
