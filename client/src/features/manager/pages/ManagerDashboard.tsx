import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  ClipboardList,
  ChefHat,
  Store,
  Package,
  TrendingUp,
  BarChart3,
  Truck,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { productionPlanApi, type ProductionPlan } from '@/api/ProductionPlanApi';
import { storeApi } from '@/api/StoreApi';
import { OrderApi } from '@/api/OrderApi';
import DeliveryTripApi, { type ITrip } from '@/api/DeliveryTripApi';
import { inventoryApi } from '@/api/InventoryApi';
import type { LogisticsOrder } from '@/shared/types/logistics';
import { useUserSettingsStore } from '@/shared/zustand/userSettingsStore';
import { useThemeStore } from '@/shared/zustand/themeStore';
import { cn } from '@/shared/lib/utils';
import { tripStatusBadgeClass, tripStatusVi } from '@/shared/lib/statusLabels';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

function AnimatedNumber({ value, duration = 1 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const end = value;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return <span>{display.toLocaleString('vi-VN')}</span>;
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return d;
  }
}

const QUARTERS = [
  { value: '1', label: 'Quý 1 (T1-T3)' },
  { value: '2', label: 'Quý 2 (T4-T6)' },
  { value: '3', label: 'Quý 3 (T7-T9)' },
  { value: '4', label: 'Quý 4 (T10-T12)' },
];

const getCurrentYear = () => new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => getCurrentYear() - 2 + i);

const MONTHS = [
  { value: '1', label: 'Tháng 1' },
  { value: '2', label: 'Tháng 2' },
  { value: '3', label: 'Tháng 3' },
  { value: '4', label: 'Tháng 4' },
  { value: '5', label: 'Tháng 5' },
  { value: '6', label: 'Tháng 6' },
  { value: '7', label: 'Tháng 7' },
  { value: '8', label: 'Tháng 8' },
  { value: '9', label: 'Tháng 9' },
  { value: '10', label: 'Tháng 10' },
  { value: '11', label: 'Tháng 11' },
  { value: '12', label: 'Tháng 12' },
];

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { compactMode } = useUserSettingsStore();
  const { darkMode } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [selectedYear, setSelectedYear] = useState<string>(String(getCurrentYear()));
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [filterKey, setFilterKey] = useState(0);

  // Data states
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [, setOrdersCount] = useState(0);
  const [storesCount, setStoresCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<LogisticsOrder[]>([]);
  const [trips, setTrips] = useState<ITrip[]>([]);
  const [aggregate, setAggregate] = useState<{ productName: string; totalQuantity: number }[]>([]);
  const [inventorySummary, setInventorySummary] = useState<{ storeCount: number; totalItems: number } | null>(null);
  const [, setOrdersByStatus] = useState<{ status: string; count: number }[]>([]);
  const [ordersByMonth, setOrdersByMonth] = useState<{ month: string; orders: number; revenue: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number }[]>([]);

  const sectionRef = useRef(null);
  useInView(sectionRef, { once: true, margin: '-50px' });

  const getMonthsInQuarter = (quarter: string, _year: number) => {
    const quarterMonths: Record<string, number[]> = {
      '1': [1, 2, 3],
      '2': [4, 5, 6],
      '3': [7, 8, 9],
      '4': [10, 11, 12],
    };
    return quarterMonths[quarter] || [];
  };

  const filterDataByDate = <T extends { createdAt?: string; planDate?: string; requestedDeliveryDate?: string }>(items: T[]): T[] => {
    return items.filter((item) => {
      const dateStr = item.createdAt || item.planDate || item.requestedDeliveryDate;
      if (!dateStr) return true;
      const date = new Date(dateStr);
      const itemYear = date.getFullYear();
      const itemMonth = date.getMonth() + 1;

      if (String(itemYear) !== selectedYear) return false;

      if (selectedQuarter !== 'all') {
        const quarterMonths = getMonthsInQuarter(selectedQuarter, itemYear);
        if (!quarterMonths.includes(itemMonth)) return false;
      }

      if (selectedMonth !== 'all') {
        if (itemMonth !== parseInt(selectedMonth)) return false;
      }

      return true;
    });
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);

      const [planRes, orderRes, storesRes, tripsRes, inventoryRes, aggregateRes] = await Promise.all([
        productionPlanApi.getAll().catch(() => null),
        OrderApi.getListWithCount().catch(() => ({ count: 0, data: [] })),
        storeApi.getAll().catch(() => ({ data: { data: [], count: 0 } })),
        DeliveryTripApi.getAllDeliveryTrips().catch(() => ({ data: [] })),
        inventoryApi.getAll().catch(() => null),
        OrderApi.getAggregate(today).catch(() => ({ data: [] })),
      ]);

      const planBody = (planRes as unknown as { data?: { data?: ProductionPlan[] } } | null)?.data;
      const planList = Array.isArray(planBody?.data) ? planBody.data : [];
      setPlans(planList);

      setOrdersCount(orderRes.count ?? 0);
      setRecentOrders(Array.isArray(orderRes.data) ? orderRes.data.slice(0, 5) : []);

      const storesPayload = (storesRes as { data?: { data?: unknown[]; count?: number } })?.data;
      const storesData = Array.isArray(storesPayload?.data) ? storesPayload.data : [];
      setStoresCount(storesPayload?.count ?? storesData.length);

      const tripList = Array.isArray((tripsRes as { data?: ITrip[] })?.data) ? (tripsRes as { data: ITrip[] }).data : [];
      setTrips(tripList);

      const invBody = inventoryRes && typeof inventoryRes === 'object' && 'data' in inventoryRes
        ? (inventoryRes as { data: { storeCount?: number; totalItems?: number } }).data
        : inventoryRes && typeof inventoryRes === 'object' && 'storeCount' in inventoryRes
          ? (inventoryRes as { storeCount: number; totalItems?: number })
          : null;
      if (invBody && typeof invBody.storeCount === 'number') {
        setInventorySummary({ storeCount: invBody.storeCount, totalItems: invBody.totalItems ?? 0 });
      }

      const aggData = (aggregateRes as { data?: { productName: string; totalQuantity: number }[] })?.data ?? [];
      setAggregate(aggData);

      // Calculate orders by status from recent orders
      const statusMap: Record<string, number> = {};
      orderRes.data?.forEach((order: LogisticsOrder) => {
        const status = order.status || 'Unknown';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });
      setOrdersByStatus(Object.entries(statusMap).map(([status, count]) => ({ status, count })));

      // Calculate orders by month from recent orders
      const monthMap: Record<string, { orders: number; revenue: number }> = {};
      for (let m = 1; m <= 12; m++) {
        monthMap[m] = { orders: 0, revenue: 0 };
      }
      orderRes.data?.forEach((order: LogisticsOrder) => {
        const date = new Date(order.requestedDeliveryDate || order.createdAt || '');
        if (date.getFullYear().toString() === selectedYear) {
          const month = date.getMonth() + 1;
          monthMap[month].orders += 1;
          monthMap[month].revenue += (order as any).totalAmount || 0;
        }
      });
      setOrdersByMonth(
        Object.entries(monthMap).map(([month, data]) => ({
          month: `T${month}`,
          orders: data.orders,
          revenue: data.revenue / 1000000,
        }))
      );

      // Top products from aggregate
      setTopProducts(
        aggData.slice(0, 10).map((p) => ({
          name: (p.productName || '').length > 15 ? (p.productName || '').substring(0, 15) + '...' : (p.productName || 'Unknown'),
          quantity: p.totalQuantity || 0,
        }))
      );
    } catch {
      setPlans([]);
      setOrdersCount(0);
      setStoresCount(0);
      setRecentOrders([]);
      setTrips([]);
      setAggregate([]);
      setInventorySummary(null);
      setOrdersByStatus([]);
      setOrdersByMonth([]);
      setTopProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    fetchAll();
  }, [filterKey]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  // Filter data based on selected filters
  const filteredPlans = filterDataByDate(plans);
  const filteredOrders = filterDataByDate(recentOrders);
  const filteredTrips = filterDataByDate(trips);

  const planStatusData = [
    { key: 'Planned', label: 'Đã lập', value: filteredPlans.filter((p) => p.status === 'Planned').length, fill: 'hsl(200, 80%, 50%)' },
    { key: 'In_Progress', label: 'Đang thực hiện', value: filteredPlans.filter((p) => p.status === 'In_Progress' || p.status === 'InProgress').length, fill: 'hsl(24, 95%, 53%)' },
    { key: 'Completed', label: 'Hoàn thành', value: filteredPlans.filter((p) => p.status === 'Completed').length, fill: 'hsl(142, 70%, 45%)' },
    { key: 'Cancelled', label: 'Đã hủy', value: filteredPlans.filter((p) => p.status === 'Cancelled').length, fill: 'hsl(0, 84%, 60%)' },
  ];

  const recentPlans = filteredPlans.slice(0, 5);
  const recentFilteredTrips = filteredTrips.slice(0, 5);
  const inProgressPlans = filteredPlans.filter((p) => p.status === 'In_Progress' || p.status === 'InProgress').length;

  const statCards = [
    { label: 'Kế hoạch sản xuất', value: loading ? 0 : filteredPlans.length, icon: ChefHat, gradient: 'from-amber-500 to-orange-600' },
    { label: 'Đang thực hiện', value: loading ? 0 : inProgressPlans, icon: TrendingUp, gradient: 'from-orange-500 to-red-500' },
    { label: 'Đơn hàng', value: loading ? 0 : filteredOrders.length, icon: ClipboardList, gradient: 'from-blue-500 to-indigo-600' },
    { label: 'Chuyến giao', value: loading ? 0 : filteredTrips.length, icon: Truck, gradient: 'from-cyan-500 to-blue-600' },
    { label: 'Cửa hàng', value: loading ? 0 : storesCount, icon: Store, gradient: 'from-emerald-500 to-teal-600' },
    {
      label: 'Tồn kho (dòng)',
      value: loading ? 0 : inventorySummary?.totalItems ?? 0,
      icon: Package,
      gradient: 'from-violet-500 to-purple-600',
      sub: inventorySummary?.storeCount ? `${inventorySummary.storeCount} cửa hàng` : undefined,
    },
  ];

  const cardClass = darkMode ? 'bg-card border-border shadow-sm' : 'bg-white border-gray-100 shadow-sm';

  return (
    <motion.div className="space-y-6 pb-12" initial="hidden" animate="show" variants={container}>
      {/* Filter Bar */}
      <motion.section variants={item} className={cn('rounded-xl border p-4', cardClass)}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Bộ lọc dữ liệu:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setFilterKey(k => k + 1); }}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Chọn năm" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    Năm {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedQuarter} onValueChange={(v) => { setSelectedQuarter(v); setFilterKey(k => k + 1); }}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Chọn quý" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả các quý</SelectItem>
                {QUARTERS.map((q) => (
                  <SelectItem key={q.value} value={q.value}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setFilterKey(k => k + 1); }}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả tháng</SelectItem>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                darkMode
                  ? 'bg-muted border-border text-foreground hover:bg-secondary'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              )}
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
              Làm mới
            </button>
          </div>
        </div>
      </motion.section>

      {/* Stat cards */}
      <motion.section ref={sectionRef} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" variants={container}>
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            whileHover={{ scale: 1.02, y: -2 }}
            className={cn(
              'group cursor-pointer rounded-xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
              cardClass,
              compactMode ? 'p-3' : 'p-4'
            )}
          >
            <div className={cn('mb-2 inline-flex rounded-lg bg-gradient-to-br p-2', stat.gradient)}>
              <stat.icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-xl font-bold text-foreground">{loading ? '—' : <AnimatedNumber value={stat.value} />}</p>
            <p className="text-xs font-medium text-muted-foreground leading-tight">{stat.label}</p>
            {'sub' in stat && stat.sub && <p className="mt-0.5 text-[10px] text-muted-foreground/80">{stat.sub}</p>}
          </motion.div>
        ))}
      </motion.section>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* Plans by Status */}
        <motion.section variants={item} className={cn('rounded-xl border p-5', cardClass)}>
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Kế hoạch theo trạng thái</h2>
          </div>
          <div className="h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Đang tải...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planStatusData} layout="vertical" margin={{ top: 8, right: 12, left: 60, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" horizontal={true} vertical={false} opacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number | undefined) => [value ?? 0, 'Số lượng']}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={30}>
                    {planStatusData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.section>

        {/* Orders by Month */}
        <motion.section variants={item} className={cn('rounded-xl border p-5', cardClass)}>
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Đơn hàng & Doanh thu theo tháng</h2>
          </div>
          <div className="h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Đang tải...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ordersByMonth} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number | undefined, name?: string) => [
                      name === 'revenue' ? `${(value ?? 0).toFixed(1)}M` : value ?? 0,
                      name === 'orders' ? 'Đơn hàng' : 'Doanh thu (M)'
                    ]}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="orders" stroke="hsl(24, 95%, 53%)" strokeWidth={2} dot={{ r: 3 }} name="Đơn hàng" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(142, 70%, 45%)" strokeWidth={2} dot={{ r: 3 }} name="Doanh thu (M)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.section>

        {/* Top Products */}
        <motion.section variants={item} className={cn('rounded-xl border p-5', cardClass)}>
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Top sản phẩm nhu cầu</h2>
          </div>
          <div className="h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Đang tải...</div>
            ) : aggregate.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 12, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number | undefined) => [value ?? 0, 'Số lượng']}
                  />
                  <Bar dataKey="quantity" fill="hsl(24, 95%, 53%)" radius={[0, 4, 4, 0]} name="SL" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg bg-muted/30 text-sm text-muted-foreground">Chưa có dữ liệu</div>
            )}
          </div>
        </motion.section>
      </div>

      {/* Bottom Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Plans Table */}
        <motion.section variants={item} className={cn('rounded-xl border p-4', cardClass)}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Kế hoạch sản xuất gần đây</h2>
            </div>
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => navigate('/manager/production')}>Xem tất cả</button>
          </div>
          <div className="overflow-x-auto">
            <table className={cn('w-full', compactMode ? 'text-xs' : 'text-sm')}>
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-2 font-medium">Mã kế hoạch</th>
                  <th className="pb-2 pr-2 font-medium">Trạng thái</th>
                  <th className="pb-2 font-medium">Ngày</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">Đang tải...</td></tr>
                ) : recentPlans.length === 0 ? (
                  <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">Chưa có kế hoạch</td></tr>
                ) : (
                  recentPlans.map((p) => (
                    <tr key={p._id} className="border-b border-border/50">
                      <td className={cn('pr-2 font-mono', compactMode ? 'py-1 text-[11px]' : 'py-1.5 text-xs')}>{p.planCode}</td>
                      <td className={cn('pr-2', compactMode ? 'py-1' : 'py-1.5')}>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium border',
                          p.status === 'Completed' ? 'bg-emerald-500 text-white border-emerald-600' :
                          p.status === 'In_Progress' || p.status === 'InProgress' ? 'bg-orange-500 text-white border-orange-600' :
                          p.status === 'Cancelled' ? 'bg-red-500 text-white border-red-600' :
                          'bg-slate-500 text-white border-slate-600'
                        )}>
                          {p.status === 'In_Progress' || p.status === 'InProgress' ? 'Đang thực hiện' :
                           p.status === 'Completed' ? 'Hoàn thành' :
                           p.status === 'Cancelled' ? 'Đã hủy' : 'Đã lập'}
                        </span>
                      </td>
                      <td className={cn(compactMode ? 'py-1' : 'py-1.5')}>{formatDate(p.planDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Recent Trips Table */}
        <motion.section variants={item} className={cn('rounded-xl border p-4', cardClass)}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Chuyến giao gần đây</h2>
            </div>
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => navigate('/manager/orders')}>Xem tất cả</button>
          </div>
          <div className="overflow-x-auto">
            <table className={cn('w-full', compactMode ? 'text-xs' : 'text-sm')}>
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-2 font-medium">Mã chuyến</th>
                  <th className="pb-2 pr-2 font-medium">Trạng thái</th>
                  <th className="pb-2 font-medium">Số đơn</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">Đang tải...</td></tr>
                ) : recentFilteredTrips.length === 0 ? (
                  <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">Chưa có chuyến</td></tr>
                ) : (
                  recentFilteredTrips.map((t) => (
                    <tr key={t._id} className="border-b border-border/50">
                      <td className={cn('pr-2 font-mono', compactMode ? 'py-1 text-[11px]' : 'py-1.5 text-xs')}>{t.tripCode}</td>
                      <td className={cn('pr-2', compactMode ? 'py-1' : 'py-1.5')}>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            tripStatusBadgeClass(String(t.status))
                          )}
                        >
                          {tripStatusVi(String(t.status))}
                        </span>
                      </td>
                      <td className={cn(compactMode ? 'py-1' : 'py-1.5')}>{Array.isArray(t.orders) ? t.orders.length : 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
