import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ClipboardList, Wallet, Boxes, ShoppingBag } from 'lucide-react';

import { useAuthStore } from '@/shared/zustand/authStore';
import { paymentApi, type WalletInfo } from '@/api/PaymentApi';
import { OrderApi, type Order } from '@/api/OrderApi';
import { inventoryApi, type StoreInventoryResponse } from '@/api/InventoryApi';
import { cn } from '@/shared/lib/utils';

const StoreDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [isDepositing, setIsDepositing] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<StoreInventoryResponse | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      if (!user?.storeId) return;
      try {
        setLoadingMetrics(true);
        const [walletRes, ordersRes, inventoryRes] = await Promise.all([
          paymentApi.getWallet(user.storeId).catch(() => null),
          OrderApi.getAllOrders().catch(() => []),
          inventoryApi.getByStore(user.storeId).catch(() => null),
        ]);

        setWallet(walletRes);
        const storeOrders = Array.isArray(ordersRes)
          ? ordersRes.filter((o) => {
              if (typeof o.storeId === 'string') return o.storeId === user.storeId;
              return (o.storeId as any)?._id === user.storeId;
            })
          : [];
        setOrders(
          storeOrders.sort((a, b) =>
            a.createdAt < b.createdAt ? 1 : -1
          )
        );
        if (inventoryRes) {
          const body =
            typeof inventoryRes === 'object' && 'data' in (inventoryRes as any)
              ? (inventoryRes as any).data
              : inventoryRes;
          if (body && typeof body === 'object' && 'success' in (body as any)) {
            setInventory(body as StoreInventoryResponse);
          }
        }
      } finally {
        setLoadingMetrics(false);
      }
    };

    fetchAll();
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
      const toastId = toast.loading('Đang nạp ví cửa hàng...');
      const before = wallet?.balance ?? 0;
      const res = await paymentApi.deposit({
        storeId: user.storeId,
        amount: depositAmount,
        description: 'Top-up from store dashboard',
      });
      const maybeWallet = (res as any)?.data;
      if (maybeWallet && typeof maybeWallet.balance === 'number') {
        setWallet(maybeWallet as WalletInfo);
      }

      // Nếu BE cập nhật số dư async (webhook), poll nhẹ rồi mới kết luận
      const delaysMs = [800, 1200, 2000, 3000, 5000];
      let changed = false;
      for (const d of delaysMs) {
        await new Promise((r) => setTimeout(r, d));
        const next = await paymentApi.getWallet(user.storeId).catch(() => null);
        if (next && typeof next.balance === 'number') {
          setWallet(next);
          if (next.balance !== before) {
            changed = true;
            break;
          }
        }
      }
      setDepositAmount(0);
      toast.success(
        changed ? 'Nạp ví thành công' : 'Đã gửi yêu cầu nạp tiền (đang chờ hệ thống xác nhận)',
        { id: toastId }
      );
    } finally {
      setIsDepositing(false);
      if (depositAmount <= 0) toast.dismiss();
    }
  };

  const totalOrders = orders.length;
  const receivedOrders = orders.filter((o) => o.status === 'Received').length;
  const inventoryLines = inventory?.count ?? inventory?.data?.length ?? 0;

  const recentOrders = orders.slice(0, 5);

  const normalizeStatus = (status: string | undefined | null) => {
    const s = (status || '').trim();
    return s;
  };

  return (
    <motion.div
      className="space-y-6 pb-10"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Hàng stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="cursor-pointer rounded-xl border border-border bg-card p-4 shadow-sm hover:bg-secondary/10"
          onClick={() => navigate('/store/orders')}
        >
          <div className="mb-2 inline-flex rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 p-2 text-white">
            <ClipboardList className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Tổng đơn nội bộ</p>
          <p className="text-xl font-bold">{loadingMetrics ? '—' : totalOrders}</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="cursor-pointer rounded-xl border border-border bg-card p-4 shadow-sm hover:bg-secondary/10"
          onClick={() => navigate('/store/orders')}
        >
          <div className="mb-2 inline-flex rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 p-2 text-white">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Đơn đã nhận</p>
          <p className="text-xl font-bold">
            {loadingMetrics ? '—' : receivedOrders}
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="cursor-pointer rounded-xl border border-border bg-card p-4 shadow-sm hover:bg-secondary/10"
          onClick={() => navigate('/store/inventory')}
        >
          <div className="mb-2 inline-flex rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 p-2 text-white">
            <Boxes className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Dòng tồn kho</p>
          <p className="text-xl font-bold">
            {loadingMetrics ? '—' : inventoryLines}
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="mb-2 inline-flex rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 p-2 text-white">
            <Wallet className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Số dư ví</p>
          <p className="text-lg font-bold">
            {loadingMetrics ? 'Đang tải...' : formatCurrency(wallet?.balance ?? 0)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {wallet?.status === 'Locked'
              ? 'Ví đang bị khóa'
              : 'Dùng để thanh toán đơn & phí vận chuyển'}
          </p>
        </motion.div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <motion.div
          whileHover={{ scale: 1.01, y: -1 }}
          className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Đơn nội bộ
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tạo đơn mới gửi về bếp trung tâm và theo dõi trạng thái duyệt / giao hàng.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/store/orders/new')}
              className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-[16px] mr-1">
                add
              </span>
              Tạo đơn mới
            </button>
            <button
              type="button"
              onClick={() => navigate('/store/orders')}
              className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary"
            >
              Xem tất cả đơn
            </button>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.01, y: -1 }}
          className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Tồn kho
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Kiểm tra tồn kho thực tế theo từng lô hàng, hạn sử dụng và số lượng.
            </p>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => navigate('/store/inventory')}
              className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary"
            >
              Mở trang tồn kho
            </button>
          </div>
        </motion.div>

        {user?.storeId && (
          <motion.div
            whileHover={{ scale: 1.01, y: -1 }}
            className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                  Store Wallet
                </p>
                <p className="text-lg font-bold mt-1">
                  {loadingMetrics
                    ? 'Đang tải...'
                    : formatCurrency(wallet?.balance ?? 0)}
                </p>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                <p>Store:</p>
                <p className="font-mono">
                  {user.storeName || user.storeId.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>

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
                className={cn(
                  'inline-flex items-center justify-center px-4 h-9 rounded-lg text-xs font-semibold text-primary-foreground',
                  wallet?.status === 'Locked'
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary hover:bg-primary/90',
                )}
              >
                {isDepositing ? 'Đang nạp...' : 'Nạp ví'}
              </button>
            </div>

            {wallet?.transactions && wallet.transactions.length > 0 && (
              <div className="pt-1 border-t border-border/60 mt-1">
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                  Giao dịch gần đây
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto text-[11px]">
                  {wallet.transactions.slice(0, 4).map((tx) => (
                    <div
                      key={tx._id}
                      className="flex items-center justify-between text-muted-foreground"
                    >
                      <span>{tx.type}</span>
                      <span
                        className={
                          tx.amount < 0
                            ? 'text-red-500 font-medium'
                            : 'text-green-600 font-medium'
                        }
                      >
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">
              Đơn gần đây
            </p>
            <button
              type="button"
              className="text-[11px] font-semibold text-primary hover:underline"
              onClick={() => navigate('/store/orders')}
            >
              Xem tất cả
            </button>
          </div>
          <div className="space-y-2 text-xs">
            {recentOrders.map((order) => {
              const s = normalizeStatus(order.status as string);
              return (
              <div
                key={order._id}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2"
              >
                <div>
                  <p className="font-mono text-[12px] font-semibold">
                    {order.orderCode}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Trạng thái: {/* đơn giản dùng cùng label với trang đơn hàng */}
                    {s === 'Pending' && ' Chờ trung tâm duyệt'}
                    {s === 'Approved' && ' Đã duyệt'}
                    {s === 'Transferred_To_Kitchen' && ' Đã chuyển sang bếp chuẩn bị'}
                    {s === 'Ready_For_Shipping' && ' Trung tâm đã chuẩn bị xong – đang chờ giao'}
                    {s === 'In_Transit' && ' Đang giao đến cửa hàng'}
                    {s === 'Received' && ' Cửa hàng đã nhận'}
                    {s === 'Cancelled' && ' Đã hủy'}
                    {s === 'Shipped' && ' Đã giao'}
                    {!['Pending','Approved','Transferred_To_Kitchen','Ready_For_Shipping','In_Transit','Received','Cancelled','Shipped'].includes(s) && ` ${s}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(order.requestedDeliveryDate).toLocaleDateString('vi-VN')}
                  </p>
                  <p className="text-[11px] font-semibold">
                    {formatCurrency(order.totalAmount ?? 0)}
                  </p>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StoreDashboard;

