import { useEffect, useState } from 'react';
import { useAuthStore } from '@/shared/zustand/authStore';
import { paymentApi, type WalletInfo } from '@/api/PaymentApi';

const StoreDashboard = () => {
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const [isDepositing, setIsDepositing] = useState(false);

  useEffect(() => {
    const fetchWallet = async () => {
      if (!user?.storeId) return;
      try {
        setWalletLoading(true);
        const data = await paymentApi.getWallet(user.storeId);
        setWallet(data);
      } catch {
        setWallet(null);
      } finally {
        setWalletLoading(false);
      }
    };

    fetchWallet();
  }, [user?.storeId]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);

  const handleDeposit = async () => {
    if (!user?.storeId || depositAmount <= 0) return;
    try {
      setIsDepositing(true);
      await paymentApi.deposit({
        storeId: user.storeId,
        amount: depositAmount,
        description: 'Top-up from store dashboard',
      });
      const updated = await paymentApi.getWallet(user.storeId);
      setWallet(updated);
      setDepositAmount(0);
    } catch {
      // silent for now; can hook toast later
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Store Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome, {user?.fullName}! Manage your store operations.
        </p>
        {user?.storeName && (
          <p className="text-sm text-primary mt-2">Store: {user.storeName}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Orders</h3>
          <p className="text-muted-foreground text-sm">
            Create and manage internal orders
          </p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Inventory</h3>
          <p className="text-muted-foreground text-sm">
            Check store inventory by batch
          </p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Pickup Requests</h3>
          <p className="text-muted-foreground text-sm">
            Manage pick-up and end-of-day operations
          </p>
        </div>
      </div>

      {user?.storeId && (
        <div className="bg-card p-6 rounded-lg shadow border border-border/60 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                Store Wallet
              </p>
              <p className="text-lg font-bold mt-1">
                {walletLoading
                  ? 'Đang tải...'
                  : formatCurrency(wallet?.balance ?? 0)}
              </p>
              {wallet?.status === 'Locked' && (
                <p className="text-xs text-red-500 mt-1">
                  Wallet is locked. Please contact manager.
                </p>
              )}
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Store ID:</p>
              <p className="font-mono">{user.storeId.slice(-6).toUpperCase()}</p>
            </div>
          </div>

          <div className="h-px w-full bg-border my-2" />

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="number"
              min={0}
              value={depositAmount || ''}
              onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
              className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Nhập số tiền muốn nạp (VND)"
            />
            <button
              type="button"
              onClick={handleDeposit}
              disabled={
                isDepositing || depositAmount <= 0 || wallet?.status === 'Locked'
              }
              className="inline-flex items-center justify-center px-4 h-9 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary"
            >
              {isDepositing ? 'Đang nạp...' : 'Nạp ví'}
            </button>
          </div>

          {wallet?.transactions && wallet.transactions.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Giao dịch gần đây
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto text-xs">
                {wallet.transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx._id}
                    className="flex items-center justify-between text-muted-foreground"
                  >
                    <span>{tx.type}</span>
                    <span
                      className={
                        tx.amount < 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'
                      }
                    >
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoreDashboard;

