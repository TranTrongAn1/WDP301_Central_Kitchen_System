import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, ArrowUpRight, ArrowDownRight, Loader2, RefreshCw } from 'lucide-react';
import { paymentApi } from '@/api/PaymentApi';
import type { WalletInfo } from '@/api/PaymentApi';
import { useAuthStore } from '@/shared/zustand/authStore';
import toast from 'react-hot-toast';
import { cn } from '@/shared/lib/utils';

export default function StoreWalletPage() {
    const { user } = useAuthStore();
    const [wallet, setWallet] = useState<WalletInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [depositing, setDepositing] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [showDeposit, setShowDeposit] = useState(false);

    const fetchWallet = async () => {
        setLoading(true);
        try {
            const storeId = (user as any)?.storeId?._id || (user as any)?.storeId || '';
            if (!storeId) { setLoading(false); return; }
            const data = await paymentApi.getWallet(storeId);
            setWallet(data);
        } catch {
            toast.error('Không thể tải thông tin ví');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWallet();
    }, []);

    const handleDeposit = async () => {
        const amount = parseInt(depositAmount);
        if (!amount || amount <= 0) {
            toast.error('Nhập số tiền hợp lệ');
            return;
        }
        setDepositing(true);
        try {
            const storeId = (user as any)?.storeId?._id || (user as any)?.storeId || '';
            await paymentApi.deposit({ storeId, amount });
            toast.success('Đã gửi yêu cầu nạp tiền');
            setShowDeposit(false);
            setDepositAmount('');
            // Sau khi nạp, refetch ví để tránh 0đ / NaN nếu backend đã cập nhật
            await fetchWallet();
        } catch {
            toast.error('Không thể tạo liên kết nạp tiền');
        } finally {
            setDepositing(false);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
                        <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Ví Cửa Hàng</h1>
                </div>
                <p className="text-muted-foreground text-sm">Quản lý số dư và nạp tiền vào ví</p>
            </motion.div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Balance Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-6 text-white shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-white/80">Số dư hiện tại</p>
                                <p className="text-3xl font-bold mt-1">
                                    {formatCurrency(wallet?.balance ?? 0)}
                                </p>
                            </div>
                            <button
                                onClick={fetchWallet}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <RefreshCw className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/70">
                            <Wallet className="h-4 w-4" />
                            <span>{user?.fullName || 'Store Wallet'}</span>
                        </div>
                    </motion.div>

                    {/* Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowDeposit(!showDeposit)}
                            className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors text-left"
                        >
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                <ArrowDownRight className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="font-medium">Nạp tiền</p>
                                <p className="text-xs text-muted-foreground">Nạp tiền vào ví qua PayOS</p>
                            </div>
                        </motion.button>

                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card text-left"
                        >
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <ArrowUpRight className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-medium">Thanh toán</p>
                                <p className="text-xs text-muted-foreground">Thanh toán đơn hàng bằng ví</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Deposit Form */}
                    {showDeposit && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="rounded-xl border border-border bg-card p-5"
                        >
                            <h3 className="font-semibold mb-3">Nạp tiền vào ví</h3>
                            <div className="flex gap-3">
                                <input
                                    type="number"
                                    placeholder="Nhập số tiền (VND)"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                                <button
                                    onClick={handleDeposit}
                                    disabled={depositing}
                                    className={cn(
                                        'px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/90 disabled:opacity-50',
                                    )}
                                >
                                    {depositing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Nạp'}
                                </button>
                            </div>
                            <div className="flex gap-2 mt-3">
                                {[50000, 100000, 200000, 500000].map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => setDepositAmount(amount.toString())}
                                        className="px-3 py-1.5 rounded-lg border border-border bg-secondary/50 text-xs font-medium hover:bg-secondary transition-colors"
                                    >
                                        {formatCurrency(amount)}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Transaction History */}
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-5 py-3 border-b border-border bg-secondary/20">
                            <h3 className="font-semibold text-sm">Thông tin ví</h3>
                        </div>
                        <div className="p-5 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Số dư</span>
                                <span className="font-semibold">{formatCurrency(wallet?.balance ?? 0)}</span>
                            </div>
                            {wallet?.status && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Trạng thái</span>
                                    <span>{wallet.status}</span>
                                </div>
                            )}
                            {wallet?.currency && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tiền tệ</span>
                                    <span>{wallet.currency}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
