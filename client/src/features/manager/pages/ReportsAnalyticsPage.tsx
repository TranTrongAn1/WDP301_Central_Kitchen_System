import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    TrendingUp,
    Package,
    Truck,
    ShoppingCart,
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { OrderApi, type Order } from '@/api/OrderApi';
import { productionPlanApi } from '@/api/ProductionPlanApi';
import { inventoryApi } from '@/api/InventoryApi';
import DeliveryTripApi from '@/api/DeliveryTripApi';
import { cn } from '@/shared/lib/utils';
import { useUserSettingsStore } from '@/shared/zustand/userSettingsStore';

interface StatCard {
    label: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    color: string;
}

const ReportsAnalyticsPage = () => {
    const { compactMode } = useUserSettingsStore();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [tripCount, setTripCount] = useState(0);
    const [inventoryCount, setInventoryCount] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [orderRes, planRes, tripRes, invRes] = await Promise.all([
                    OrderApi.getAllOrders().catch(() => []),
                    productionPlanApi.getAll().catch(() => ({ data: [] })),
                    DeliveryTripApi.getAllDeliveryTrips().catch(() => ({ data: [] })),
                    inventoryApi.getAll().catch(() => null),
                ]);

                setOrders(Array.isArray(orderRes) ? orderRes : []);

                const planData = Array.isArray(planRes) ? planRes : (planRes as any)?.data ?? [];
                setPlans(planData);

                const tripData = Array.isArray((tripRes as any)?.data) ? (tripRes as any).data : [];
                setTripCount(tripData.length);

                if (invRes && typeof invRes === 'object' && 'totalItems' in invRes) {
                    setInventoryCount((invRes as any).totalItems ?? 0);
                } else if (invRes && typeof invRes === 'object' && 'data' in invRes) {
                    const arr = (invRes as any).data;
                    setInventoryCount(Array.isArray(arr) ? arr.reduce((s: number, g: any) => s + (g.items?.length || 0), 0) : 0);
                }
            } catch {
                // errors silently handled above
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Analyze data
    const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const pendingOrders = orders.filter((o) => o.status === 'Pending').length;
    const approvedOrders = orders.filter((o) => o.status === 'Approved').length;
    const receivedOrders = orders.filter((o) => o.status === 'Received').length;
    const cancelledOrders = orders.filter((o) => o.status === 'Cancelled').length;
    const inTransitOrders = orders.filter((o) => o.status === 'In_Transit').length;
    const completedPlans = plans.filter((p) => p.status === 'Completed').length;
    const activePlans = plans.filter((p) => p.status === 'In_Progress' || p.status === 'Approved').length;

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

    const stats: StatCard[] = [
        {
            label: 'Tổng doanh thu đơn hàng',
            value: formatCurrency(totalRevenue),
            icon: <TrendingUp className="h-5 w-5" />,
            color: 'from-emerald-500 to-teal-600',
        },
        {
            label: 'Tổng đơn hàng',
            value: orders.length,
            icon: <ShoppingCart className="h-5 w-5" />,
            color: 'from-blue-500 to-indigo-600',
        },
        {
            label: 'Kế hoạch sản xuất',
            value: plans.length,
            icon: <Package className="h-5 w-5" />,
            color: 'from-orange-500 to-amber-600',
        },
        {
            label: 'Chuyến giao hàng',
            value: tripCount,
            icon: <Truck className="h-5 w-5" />,
            color: 'from-purple-500 to-violet-600',
        },
    ];

    // Order status breakdown for bar chart
    const statusBreakdown = [
        { label: 'Chờ duyệt', value: pendingOrders, color: 'bg-amber-500' },
        { label: 'Đã duyệt', value: approvedOrders, color: 'bg-blue-500' },
        { label: 'Đang giao', value: inTransitOrders, color: 'bg-indigo-500' },
        { label: 'Đã nhận', value: receivedOrders, color: 'bg-emerald-500' },
        { label: 'Đã hủy', value: cancelledOrders, color: 'bg-red-500' },
    ];
    const maxStatus = Math.max(...statusBreakdown.map((s) => s.value), 1);

    // Production status
    const planBreakdown = [
        { label: 'Đang hoạt động', value: activePlans, color: 'bg-blue-500' },
        { label: 'Hoàn thành', value: completedPlans, color: 'bg-emerald-500' },
        { label: 'Khác', value: plans.length - activePlans - completedPlans, color: 'bg-gray-400' },
    ];
    const maxPlan = Math.max(...planBreakdown.map((s) => s.value), 1);

    // Recent orders table
    const recentOrders = orders.slice(0, 8);

    const formatDate = (d: string) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            Approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            In_Transit: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
            Received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        return map[status] || 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center text-muted-foreground text-sm">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-orange-500" />
                Đang tải dữ liệu báo cáo...
            </div>
        );
    }

    return (
        <div className={cn('space-y-6', compactMode ? 'pb-6' : 'pb-10')}>
            {/* Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600">
                        <BarChart3 className="h-5 w-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-foreground">Báo cáo & Phân tích</h1>
                </div>
                <p className="text-xs text-muted-foreground max-w-xl">
                    Tổng hợp dữ liệu đơn hàng, sản xuất, giao hàng và tồn kho từ hệ thống.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                    >
                        <Card className="border border-border/70">
                            <CardContent className={cn('flex items-center gap-4', compactMode ? 'p-3' : 'p-4')}>
                                <div className={cn('rounded-xl p-2.5 text-white bg-gradient-to-br', stat.color)}>
                                    {stat.icon}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                                    {stat.change !== undefined && (
                                        <div className={cn('flex items-center gap-0.5 text-[10px]', stat.change >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                                            {stat.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                            {Math.abs(stat.change)}%
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Order Status Breakdown */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-primary" />
                            Phân bổ trạng thái đơn hàng
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Tổng {orders.length} đơn hàng trong hệ thống
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-2">
                        {statusBreakdown.map((s) => (
                            <div key={s.label} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{s.label}</span>
                                    <span className="font-semibold">{s.value}</span>
                                </div>
                                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(s.value / maxStatus) * 100}%` }}
                                        transition={{ duration: 0.6 }}
                                        className={cn('h-full rounded-full', s.color)}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Production Plan Breakdown */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            Phân bổ kế hoạch sản xuất
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Tổng {plans.length} kế hoạch • {inventoryCount} lô tồn kho
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-2">
                        {planBreakdown.map((s) => (
                            <div key={s.label} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{s.label}</span>
                                    <span className="font-semibold">{s.value}</span>
                                </div>
                                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(s.value / maxPlan) * 100}%` }}
                                        transition={{ duration: 0.6 }}
                                        className={cn('h-full rounded-full', s.color)}
                                    />
                                </div>
                            </div>
                        ))}

                        {/* Donut-style summary */}
                        <div className="mt-4 pt-3 border-t border-border/50">
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p className="text-lg font-bold text-foreground">{activePlans}</p>
                                    <p className="text-[10px] text-muted-foreground">Đang chạy</p>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-emerald-600">{completedPlans}</p>
                                    <p className="text-[10px] text-muted-foreground">Hoàn thành</p>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-muted-foreground">{inventoryCount}</p>
                                    <p className="text-[10px] text-muted-foreground">Tồn kho</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Orders Table */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Đơn hàng gần nhất
                    </CardTitle>
                    <CardDescription className="text-xs">
                        8 đơn hàng mới nhất trong hệ thống
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border text-left text-muted-foreground">
                                    <th className="px-3 py-2.5 font-medium">Mã đơn</th>
                                    <th className="px-3 py-2.5 font-medium">Cửa hàng</th>
                                    <th className="px-3 py-2.5 font-medium text-center">Sản phẩm</th>
                                    <th className="px-3 py-2.5 font-medium text-right">Tổng tiền</th>
                                    <th className="px-3 py-2.5 font-medium text-center">Trạng thái</th>
                                    <th className="px-3 py-2.5 font-medium">Ngày tạo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((order) => {
                                    const store = typeof order.storeId === 'object' ? order.storeId : null;
                                    return (
                                        <tr key={order._id} className="border-b border-border/30 hover:bg-secondary/10">
                                            <td className="px-3 py-2 font-mono font-medium">{order.orderCode}</td>
                                            <td className="px-3 py-2 max-w-[150px] truncate">{store?.storeName || '—'}</td>
                                            <td className="px-3 py-2 text-center">{order.items?.length || 0}</td>
                                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(order.totalAmount)}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold', statusBadge(order.status))}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">{formatDate(order.createdAt)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReportsAnalyticsPage;
