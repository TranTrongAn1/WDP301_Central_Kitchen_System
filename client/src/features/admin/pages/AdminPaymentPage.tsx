import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/manager/components/ui/Card';
import { Button } from '@/features/manager/components/ui/Button';
import { Badge } from '@/features/manager/components/ui/Badge';
import { Input } from '@/features/manager/components/ui/Input';
import { Modal } from '@/features/manager/components/ui/Modal';
import { storeApi, type Store as StoreType } from '@/api/StoreApi';
import { paymentApi, type WalletInfo } from '@/api/PaymentApi';
import toast from 'react-hot-toast';

interface StoreWithWallet extends StoreType {
  wallet?: WalletInfo | null;
}

const AdminPaymentPage = () => {
  const [stores, setStores] = useState<StoreWithWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<StoreWithWallet | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositLoading, setDepositLoading] = useState(false);
const MAX_DEPOSIT = 500000000;
  const fetchStores = async () => {
    try {
      setLoading(true);
      const res = await storeApi.getAllStores?.();
      const data = (res as any)?.data || res || [];
      setStores(Array.isArray(data) ? data : []);
    } catch (error) {
      // Fallback: thử getAll nếu getAllStores không tồn tại
      try {
        const res = await (storeApi as any).getAll?.();
        const data = (res as any)?.data || res || [];
        setStores(Array.isArray(data) ? data : []);
      } catch {
        toast.error('Không thể tải danh sách cửa hàng để quản lý ví.');
        setStores([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const openWallet = async (store: StoreWithWallet) => {
    setSelectedStore(store);
    setWallet(null);
    setWalletLoading(true);
    try {
      const w = await paymentApi.getWallet(store._id);
      setWallet(w);
    } catch {
      toast.error('Không thể tải thông tin ví của cửa hàng.');
    } finally {
      setWalletLoading(false);
    }
  };

  const openDepositModal = () => {
    setDepositAmount(0);
    setIsDepositOpen(true);
  };

const handleDeposit = async () => {
  if (!selectedStore || depositAmount <= 0) {
    toast.error('Vui lòng nhập số tiền nạp hợp lệ.');
    return;
  }
  
  // Validate giới hạn 500 triệu
  if (depositAmount > MAX_DEPOSIT) {
    toast.error(`Số tiền nạp không được vượt quá ${formatCurrency(MAX_DEPOSIT)}`);
    return;
  }

  try {
    setDepositLoading(true);
    await paymentApi.deposit({
      storeId: selectedStore._id,
      amount: depositAmount,
    });
    toast.success('Nạp tiền vào ví cửa hàng thành công.');
    setIsDepositOpen(false);
    const w = await paymentApi.getWallet(selectedStore._id);
    setWallet(w);
  } catch (error: any) {
    toast.error(error?.response?.data?.message || 'Không thể nạp tiền vào ví.');
  } finally {
    setDepositLoading(false);
  }
};
const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  // Loại bỏ tất cả ký tự không phải số
  const rawValue = e.target.value.replace(/\D/g, '');
  const numValue = Number(rawValue);

  if (numValue > MAX_DEPOSIT) {
    setDepositAmount(MAX_DEPOSIT);
    toast.error('Tối đa 500.000.000 VNĐ');
  } else {
    setDepositAmount(numValue);
  }
};
  useEffect(() => {
    fetchStores();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                <Store className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng số cửa hàng</p>
                <p className="text-2xl font-bold">{stores.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách cửa hàng & ví</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Đang tải danh sách cửa hàng...
            </div>
          ) : stores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Không có cửa hàng nào.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <div
                  key={store._id}
                  className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all hover:shadow-md cursor-pointer"
                  onClick={() => openWallet(store)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{store.storeName || store.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {store.store_code || store.storeCode}
                      </p>
                    </div>
                    <Badge variant="secondary">Ví cửa hàng</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {store.address || store.adress || 'Chưa có địa chỉ'}
                  </p>
                  {selectedStore?._id === store._id && wallet && !walletLoading && (
                    <div className="mt-3 pt-3 border-t text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Số dư</span>
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(wallet.balance)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStore && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>
                  Ví cửa hàng: {selectedStore.storeName || selectedStore.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Mã cửa hàng: {selectedStore.store_code || selectedStore.storeCode}
                </p>
              </div>
              <Button
                className="bg-gradient-to-r from-orange-600 to-amber-600"
                onClick={openDepositModal}
                disabled={walletLoading}
              >
                Nạp tiền vào ví
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {walletLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Đang tải thông tin ví...
              </div>
            ) : !wallet ? (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có thông tin ví cho cửa hàng này.
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Số dư hiện tại</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {formatCurrency(wallet.balance)}
                    </p>
                  </div>
                  <Badge variant={wallet.status === 'Active' ? 'success' : 'secondary'}>
                    {wallet.status === 'Active' ? 'Đang hoạt động' : 'Bị khóa'}
                  </Badge>
                </div>
                {wallet.transactions && wallet.transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="border-b">
                        <tr>
                          <th className="pb-2 font-semibold">Thời gian</th>
                          <th className="pb-2 font-semibold">Loại giao dịch</th>
                          <th className="pb-2 font-semibold">Ghi chú</th>
                          <th className="pb-2 font-semibold text-right">Số tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wallet.transactions.map((tx) => (
                          <tr key={tx._id} className="border-b last:border-0">
                            <td className="py-2">
                              {new Date(tx.createdAt).toLocaleString('vi-VN')}
                            </td>
                            <td className="py-2">
                              <Badge variant="outline">
                                {tx.type === 'Deposit'
                                  ? 'Nạp tiền'
                                  : tx.type === 'Withdrawal'
                                  ? 'Rút tiền'
                                  : tx.type === 'Refund'
                                  ? 'Hoàn tiền'
                                  : 'Thanh toán'}
                              </Badge>
                            </td>
                            <td className="py-2 text-muted-foreground">
                              {tx.description || '—'}
                            </td>
                            <td className="py-2 text-right">
                              {formatCurrency(tx.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có giao dịch nào trong ví.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        isOpen={isDepositOpen}
        onClose={() => !depositLoading && setIsDepositOpen(false)}
        title="Nạp tiền vào ví cửa hàng"
        description={
          selectedStore
            ? `Cửa hàng: ${selectedStore.storeName || selectedStore.name}`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIsDepositOpen(false)}
              disabled={depositLoading}
            >
              Hủy
            </Button>
            <Button
              className="bg-gradient-to-r from-orange-600 to-amber-600"
              onClick={handleDeposit}
              disabled={depositLoading || depositAmount <= 0}
            >
              {depositLoading ? 'Đang nạp...' : 'Xác nhận nạp'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
    <div>
      <label className="text-sm font-medium mb-1 block">Số tiền (VND)</label>
      <div className="relative">
        <Input
          type="text" // Chuyển sang text để hiển thị format
          value={depositAmount === 0 ? '' : depositAmount.toLocaleString('vi-VN')}
          onChange={handleAmountChange}
          placeholder="Ví dụ: 20.000.000"
          className="pr-12 font-medium text-lg"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm border-l pl-2">
          VNĐ
        </div>
      </div>
      
      {/* Hiển thị gợi ý hoặc cảnh báo */}
      <div className="mt-2 flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          Tối đa: <span className="font-semibold text-orange-600">500.000.000đ</span>
        </p>
      </div>
    </div>
  </div>
      </Modal>
    </div>
  );
};

export default AdminPaymentPage;

