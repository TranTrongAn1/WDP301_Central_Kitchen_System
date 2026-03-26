import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cardShadow } from '@/constants/theme';
import { useNotification } from '@/context/notification-context';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { useWallet } from '@/hooks/use-wallet';
import { paymentApi, walletApi } from '@/lib/api';

const formatValue = (value: string | null | undefined) => value ?? '--';

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'Deposit':
      return '💰';
    case 'Payment':
      return '💳';
    case 'Refund':
      return '↩️';
    case 'Withdrawal':
      return '💸';
    default:
      return '•';
  }
};

const getTransactionColor = (type: string) => {
  switch (type) {
    case 'Deposit':
      return '#10B981';
    case 'Refund':
      return '#F59E0B';
    case 'Payment':
    case 'Withdrawal':
      return '#EF4444';
    default:
      return '#6B7280';
  }
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout, token, user } = useAuth();
  const { showToast } = useNotification();
  const { profile, isLoading, error, refetch } = useProfile();
  const {
    wallet,
    transactions,
    isLoading: walletLoading,
    error: walletError,
    refetch: refetchWallet,
  } = useWallet();
  const [showTransactions, setShowTransactions] = useState(false);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('100000');
  const [depositQrCode, setDepositQrCode] = useState<string | null>(null);
  const [creatingDepositLink, setCreatingDepositLink] = useState(false);
  const [checkingDepositResult, setCheckingDepositResult] = useState(false);

  const openDepositModal = () => {
    setDepositModalVisible(true);
    setDepositQrCode(null);
  };

  const closeDepositModal = () => {
    if (creatingDepositLink || checkingDepositResult) return;
    setDepositModalVisible(false);
    setDepositQrCode(null);
  };

  const waitForDepositConfirmation = async (
    amount: number,
    initialTransactionIds: Set<string>,
  ) => {
    if (!token || !user?.storeId) return false;

    const maxAttempts = 20;
    const delayMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      try {
        const walletRes = await walletApi.getByStoreId(user.storeId, token);
        const nextTransactions = walletRes.data?.transactions ?? [];

        const hasConfirmedDeposit = nextTransactions.some((tx) => {
          if (!tx?._id || initialTransactionIds.has(tx._id)) return false;
          if (tx.type !== 'Deposit') return false;
          return Number(tx.amount) === amount;
        });

        if (hasConfirmedDeposit) {
          await refetchWallet();
          showToast('Nạp tiền thành công.');
          setDepositModalVisible(false);
          setDepositQrCode(null);
          return true;
        }
      } catch {
        // Ignore transient polling failures and continue next attempts.
      }
    }

    await refetchWallet();
    return false;
  };

  const handleOpenDepositCheckout = async () => {
    if (!token || !user?.storeId) {
      showToast('Không xác định được cửa hàng để nạp tiền.', 'error');
      return;
    }

    const amount = Number(depositAmount.replace(/\D/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Vui lòng nhập số tiền nạp hợp lệ.', 'error');
      return;
    }

    setCreatingDepositLink(true);
    try {
      const initialTransactionIds = new Set(
        transactions.map((tx) => tx._id).filter((id): id is string => Boolean(id)),
      );
      const res = await paymentApi.createDepositLink(user.storeId, amount, token);
      const checkoutUrl = res.data?.checkoutUrl ?? null;
      const qrCode = res.data?.qrCode ?? null;

      if (!checkoutUrl && !qrCode) {
        showToast('Không tạo được link nạp tiền.', 'error');
        return;
      }

      setDepositQrCode(qrCode);
      if (checkoutUrl) {
        await WebBrowser.openBrowserAsync(checkoutUrl);
      } else {
        showToast('Đã tạo QR nạp tiền. Vui lòng quét mã để thanh toán.');
      }

      setCheckingDepositResult(true);
      const isDepositSuccess = await waitForDepositConfirmation(amount, initialTransactionIds);
      if (!isDepositSuccess) {
        showToast('Chưa ghi nhận nạp tiền. Vui lòng kiểm tra lại sau.', 'error');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không thể tạo link nạp tiền.';
      showToast(msg, 'error');
    } finally {
      setCheckingDepositResult(false);
      setCreatingDepositLink(false);
    }
  };

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

      <View style={styles.card}>
        <Pressable onPress={() => setShowTransactions(!showTransactions)} style={styles.walletHeader}>
          <Text style={styles.title}>So du vi cua cua hang</Text>
          <Text style={styles.expandIcon}>{showTransactions ? '▼' : '▶'}</Text>
        </Pressable>

        {walletLoading ? (
          <View style={styles.walletStateBox}>
            <ActivityIndicator color="#D91E18" />
            <Text style={styles.walletHint}>Dang tai thong tin vi...</Text>
          </View>
        ) : walletError ? (
          <View style={styles.walletStateBox}>
            <Text style={styles.walletError}>{walletError}</Text>
            <Pressable onPress={refetchWallet} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Thu lai</Text>
            </Pressable>
          </View>
        ) : wallet ? (
          <>
            <View style={styles.walletBalanceSection}>
              <Text style={styles.walletBalanceLabel}>So du hien tai</Text>
              <Text style={styles.walletBalanceValue}>{wallet.balance.toLocaleString('vi-VN')} đ</Text>
              <Text
                style={[
                  styles.walletStatus,
                  { color: wallet.status === 'Active' ? '#10B981' : '#EF4444' },
                ]}
              >
                {wallet.status === 'Active' ? 'Dang hoat dong' : 'Bi khoa'}
              </Text>
            </View>

            <Pressable onPress={openDepositModal} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Nạp tiền vào ví</Text>
            </Pressable>

            {showTransactions ? (
              <View style={styles.transactionsList}>
                <Text style={styles.sectionLabel}>Lich su giao dich ({transactions.length})</Text>
                {transactions.length === 0 ? (
                  <Text style={styles.walletHint}>Chua co giao dich nao</Text>
                ) : (
                  transactions.map((transaction, index) => (
                    <View key={transaction._id || String(index)} style={styles.transactionItem}>
                      <View style={styles.transactionLeft}>
                        <Text style={styles.txIcon}>{getTransactionIcon(transaction.type)}</Text>
                        <View style={styles.txInfo}>
                          <Text style={styles.txType}>{transaction.type}</Text>
                          <Text style={styles.txDate}>{formatDate(transaction.timestamp)}</Text>
                          {transaction.description ? (
                            <Text style={styles.txDesc}>{transaction.description}</Text>
                          ) : null}
                        </View>
                      </View>
                      <Text style={[styles.txAmount, { color: getTransactionColor(transaction.type) }]}>
                        {transaction.amount.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.walletStateBox}>
            <Text style={styles.walletHint}>Khong tim thay thong tin vi cua cua hang</Text>
            <Pressable onPress={refetchWallet} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Tai lai</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Pressable onPress={logout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </Pressable>

      <Modal
        visible={depositModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDepositModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nạp tiền vào ví</Text>
              <Pressable onPress={closeDepositModal}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Nhập số tiền (đ)</Text>
            <TextInput
              value={depositAmount}
              onChangeText={(text) => setDepositAmount(text.replace(/[^0-9]/g, ''))}
              placeholder="100000"
              keyboardType="numeric"
              style={styles.amountInput}
              editable={!creatingDepositLink && !checkingDepositResult}
            />

            <Text style={styles.currentBalanceText}>
              Số dư ví hiện tại: {wallet?.balance.toLocaleString('vi-VN') ?? 0} đ
            </Text>

            {depositQrCode ? (
              <View style={styles.qrWrap}>
                <Image source={{ uri: depositQrCode }} style={styles.qrImage} resizeMode="contain" />
                <Text style={styles.qrHint}>Quét mã QR để thanh toán nạp ví</Text>
              </View>
            ) : null}

            <Pressable
              style={[
                styles.secondaryButton,
                (creatingDepositLink || checkingDepositResult) && styles.buttonDisabled,
              ]}
              onPress={handleOpenDepositCheckout}
              disabled={creatingDepositLink || checkingDepositResult}
            >
              {creatingDepositLink || checkingDepositResult ? (
                <ActivityIndicator color="#9B0F0F" />
              ) : (
                <Text style={styles.secondaryButtonText}>Thanh toán</Text>
              )}
            </Pressable>

            {checkingDepositResult ? (
              <Text style={styles.waitingDepositText}>
                Đang xác nhận giao dịch nạp tiền...
              </Text>
            ) : null}

            <Pressable
              style={[
                styles.secondaryButton,
                (creatingDepositLink || checkingDepositResult) && styles.buttonDisabled,
              ]}
              onPress={closeDepositModal}
              disabled={creatingDepositLink || checkingDepositResult}
            >
              <Text style={styles.secondaryButtonText}>Hủy</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandIcon: {
    fontSize: 12,
    color: '#9B0F0F',
    fontWeight: '700',
  },
  walletStateBox: {
    paddingTop: 8,
    alignItems: 'center',
  },
  walletHint: {
    marginTop: 8,
    color: '#8C8C8C',
    fontSize: 13,
    textAlign: 'center',
  },
  walletError: {
    marginTop: 8,
    color: '#D91E18',
    fontSize: 13,
    textAlign: 'center',
  },
  walletBalanceSection: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFF4F4',
    alignItems: 'center',
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2A2A',
    marginBottom: 12,
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
  },
  txDate: {
    fontSize: 11,
    color: '#8C8C8C',
    marginTop: 2,
  },
  txDesc: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A2A2A',
  },
  modalClose: {
    fontSize: 22,
    color: '#666',
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#FFD6D6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#2A2A2A',
    backgroundColor: '#FFF4F4',
  },
  currentBalanceText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#F15A24',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  qrWrap: {
    marginTop: 16,
    alignItems: 'center',
  },
  qrImage: {
    width: 180,
    height: 180,
    marginBottom: 8,
  },
  qrHint: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  waitingDepositText: {
    marginTop: 8,
    fontSize: 12,
    color: '#8C8C8C',
    textAlign: 'center',
  },
});
