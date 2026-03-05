import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  ClipboardList,
  ChefHat,
  Store,
  Package,
  TrendingUp,
  ArrowRight,
  BarChart3,
  Truck,
  Calendar,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { productionPlanApi, type ProductionPlan } from '@/api/ProductionPlanApi';
import { storeApi } from '@/api/StoreApi';
import { OrderApi } from '@/api/OrderApi';
import DeliveryTripApi, { type ITrip } from '@/api/DeliveryTripApi';
import { inventoryApi } from '@/api/InventoryApi';
import type { LogisticsOrder } from '@/shared/types/logistics';
import { useUserSettingsStore } from '@/shared/zustand/userSettingsStore';
import { cn } from '@/shared/lib/utils';

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
  return <span>{display}</span>;
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return d;
  }
}

const QUICK_LINKS = [
  { label: 'Kế hoạch sản xuất', path: '/manager/production', icon: ChefHat, color: 'from-amber-500 to-orange-600' },
  { label: 'Đơn hàng & Giao hàng', path: '/manager/orders', icon: ClipboardList, color: 'from-blue-500 to-indigo-600' },
  { label: 'Sản phẩm & Công thức', path: '/manager/products', icon: Package, color: 'from-emerald-500 to-teal-600' },
  { label: 'Cửa hàng', path: '/manager/stores', icon: Store, color: 'from-violet-500 to-purple-600' },
];

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { compactMode } = useUserSettingsStore();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [storesCount, setStoresCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<LogisticsOrder[]>([]);
  const [trips, setTrips] = useState<ITrip[]>([]);
  const [aggregate, setAggregate] = useState<{ productName: string; totalQuantity: number }[]>([]);
  const [inventorySummary, setInventorySummary] = useState<{ storeCount: number; totalItems: number } | null>(null);
  const sectionRef = useRef(null);
  useInView(sectionRef, { once: true, margin: '-50px' });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const fetchAll = async () => {
      try {
        setLoading(true);
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
      } catch {
        setPlans([]);
        setOrdersCount(0);
        setStoresCount(0);
        setRecentOrders([]);
        setTrips([]);
        setAggregate([]);
        setInventorySummary(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const planStatusData = [
    { key: 'Planned', label: 'Planned', value: plans.filter((p) => p.status === 'Planned').length, fill: 'hsl(var(--chart-1))' },
    { key: 'In_Progress', label: 'In Progress', value: plans.filter((p) => p.status === 'In_Progress' || p.status === 'InProgress').length, fill: 'hsl(var(--chart-2))' },
    { key: 'Completed', label: 'Completed', value: plans.filter((p) => p.status === 'Completed').length, fill: 'hsl(var(--chart-3))' },
    { key: 'Cancelled', label: 'Cancelled', value: plans.filter((p) => p.status === 'Cancelled').length, fill: 'hsl(var(--chart-4))' },
  ];

  const recentPlans = plans.slice(0, 5);
  const recentTrips = trips.slice(0, 5);
  const inProgressPlans = plans.filter((p) => p.status === 'In_Progress' || p.status === 'InProgress').length;

  const statCards = [
    { label: 'Kế hoạch sản xuất', value: loading ? 0 : plans.length, icon: ChefHat, gradient: 'from-amber-500 to-orange-600', href: '/manager/production' },
    { label: 'Đang thực hiện', value: loading ? 0 : inProgressPlans, icon: TrendingUp, gradient: 'from-orange-500 to-red-500', href: '/manager/production' },
    { label: 'Đơn hàng', value: loading ? 0 : ordersCount, icon: ClipboardList, gradient: 'from-blue-500 to-indigo-600', href: '/manager/orders' },
    { label: 'Chuyến giao', value: loading ? 0 : trips.length, icon: Truck, gradient: 'from-cyan-500 to-blue-600', href: '/manager/orders' },
    { label: 'Cửa hàng', value: loading ? 0 : storesCount, icon: Store, gradient: 'from-emerald-500 to-teal-600', href: '/manager/stores' },
    {
      label: 'Tồn kho (dòng)',
      value: loading ? 0 : inventorySummary?.totalItems ?? 0,
      icon: Package,
      gradient: 'from-violet-500 to-purple-600',
      href: '/manager/inventory',
      sub: inventorySummary?.storeCount ? `${inventorySummary.storeCount} cửa hàng` : undefined,
    },
  ];

  return (
    <motion.div className="space-y-6 pb-12" initial="hidden" animate="show" variants={container}>
      {/* Stat cards — no hero */}
      <motion.section ref={sectionRef} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" variants={container}>
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            whileHover={{ scale: 1.02, y: -2 }}
            className={cn(
              'group cursor-pointer rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:bg-secondary/20',
              compactMode ? 'p-3' : 'p-4'
            )}
            onClick={() => navigate(stat.href)}
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

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.section variants={item} className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Kế hoạch theo trạng thái</h2>
          </div>
          <div className="h-56">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Đang tải...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planStatusData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" vertical={false} opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number | undefined) => [value ?? 0, 'Số lượng']}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {planStatusData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.section>

        <motion.section variants={item} className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Nhu cầu sản phẩm hôm nay</h2>
          </div>
          <div className="h-56">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Đang tải...</div>
            ) : aggregate.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregate.slice(0, 8)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="productName" tick={{ fontSize: 10 }} tickFormatter={(v) => (v.length > 12 ? v.slice(0, 10) + '…' : v)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} formatter={(value: number | undefined) => [value ?? 0, 'Số lượng']} />
                  <Bar dataKey="totalQuantity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Tổng SL" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg bg-muted/30 text-sm text-muted-foreground">Chưa có đơn theo ngày hôm nay</div>
            )}
          </div>
        </motion.section>
      </div>

      {/* Recent tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.section variants={item} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Đơn hàng gần đây</h2>
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => navigate('/manager/orders')}>Xem tất cả</button>
          </div>
          <div className="overflow-x-auto">
            <table className={cn('w-full', compactMode ? 'text-xs' : 'text-sm')}>
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-2 font-medium">Mã đơn</th>
                  <th className="pb-2 pr-2 font-medium">Trạng thái</th>
                  <th className="pb-2 font-medium">Ngày</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">Đang tải...</td></tr>
                ) : recentOrders.length === 0 ? (
                  <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">Chưa có đơn</td></tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr key={o._id} className="border-b border-border/50">
                      <td className={cn('pr-2 font-mono', compactMode ? 'py-1 text-[11px]' : 'py-1.5 text-xs')}>{o.orderCode}</td>
                      <td className={cn('pr-2', compactMode ? 'py-1' : 'py-1.5')}>{o.status}</td>
                      <td className={cn(compactMode ? 'py-1' : 'py-1.5')}>{formatDate(o.requestedDeliveryDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.section variants={item} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Chuyến giao gần đây</h2>
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => navigate('/manager/orders')}>Xem tất cả</button>
          </div>
          <div className="overflow-x-auto">
            <table className={cn('w-full', compactMode ? 'text-xs' : 'text-sm')}>
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-2 font-medium">Mã chuyến</th>
                  <th className="pb-2 pr-2 font-medium">Trạng thái</th>
                  <th className="pb-2 font-medium">Đơn</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">Đang tải...</td></tr>
                ) : recentTrips.length === 0 ? (
                  <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">Chưa có chuyến</td></tr>
                ) : (
                  recentTrips.map((t) => (
                    <tr key={t._id} className="border-b border-border/50">
                      <td className={cn('pr-2 font-mono', compactMode ? 'py-1 text-[11px]' : 'py-1.5 text-xs')}>{t.tripCode}</td>
                      <td className={cn('pr-2', compactMode ? 'py-1' : 'py-1.5')}>{t.status}</td>
                      <td className={cn(compactMode ? 'py-1' : 'py-1.5')}>{Array.isArray(t.orders) ? t.orders.length : 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.section variants={item} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Kế hoạch sản xuất gần đây</h2>
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
                      <td className={cn('pr-2', compactMode ? 'py-1' : 'py-1.5')}>{p.status}</td>
                      <td className={cn(compactMode ? 'py-1' : 'py-1.5')}>{formatDate(p.planDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* (Đã bỏ bớt bảng phụ để dashboard gọn hơn) */}
      </div>

      {/* Quick links */}
      <motion.section variants={item} className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-foreground">Truy cập nhanh</h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map((link) => (
            <motion.button
              key={link.path}
              variants={item}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              onClick={() => navigate(link.path)}
            >
              <div className={cn('rounded-md bg-gradient-to-br p-1.5', link.color)}>
                <link.icon className="h-4 w-4 text-white" />
              </div>
              {link.label}
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </motion.button>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
