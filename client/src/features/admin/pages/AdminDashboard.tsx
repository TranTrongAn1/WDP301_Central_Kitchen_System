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
  Users,
  Settings,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { productionPlanApi, type ProductionPlan } from '@/api/ProductionPlanApi';
import { storeApi } from '@/api/StoreApi';
import { OrderApi } from '@/api/OrderApi';
import DeliveryTripApi, { type ITrip } from '@/api/DeliveryTripApi';
import { inventoryApi } from '@/api/InventoryApi';
import { userApi } from '@/api/UserApi';
import type { LogisticsOrder } from '@/shared/types/logistics';
import { cn } from '@/shared/lib/utils';
import { useThemeStore } from '@/shared/zustand/themeStore';

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
  { label: 'Accounts', path: '/admin/account', icon: Users, color: 'from-rose-500 to-pink-600' },
  { label: 'System Settings', path: '/admin/settings', icon: Settings, color: 'from-slate-500 to-zinc-600' },
  { label: 'Production Plans', path: '/admin/production', icon: ChefHat, color: 'from-amber-500 to-orange-600' },
  { label: 'Orders & Shipments', path: '/admin/orders', icon: ClipboardList, color: 'from-blue-500 to-indigo-600' },
  { label: 'Products & Recipes', path: '/admin/products', icon: Package, color: 'from-emerald-500 to-teal-600' },
  { label: 'Stores', path: '/admin/stores', icon: Store, color: 'from-violet-500 to-purple-600' },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { darkMode } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [storesCount, setStoresCount] = useState(0);
  const [usersCount, setUsersCount] = useState(0);
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
        const [planRes, orderRes, storesRes, tripsRes, inventoryRes, aggregateRes, usersRes] = await Promise.all([
          productionPlanApi.getAll().catch(() => null),
          OrderApi.getListWithCount().catch(() => ({ count: 0, data: [] })),
          storeApi.getAll().catch(() => ({ data: { data: [], count: 0 } })),
          DeliveryTripApi.getAllDeliveryTrips().catch(() => ({ data: [] })),
          inventoryApi.getAll().catch(() => null),
          OrderApi.getAggregate(today).catch(() => ({ data: [] })),
          userApi.getAllUsers().catch(() => []),
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

        setUsersCount(Array.isArray(usersRes) ? usersRes.length : 0);
      } catch {
        setPlans([]);
        setOrdersCount(0);
        setStoresCount(0);
        setRecentOrders([]);
        setTrips([]);
        setAggregate([]);
        setInventorySummary(null);
        setUsersCount(0);
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

  const cardClass = darkMode
    ? 'bg-card border-border shadow-sm'
    : 'bg-white border-gray-100 shadow-sm';

  const statCards = [
    { label: 'Users', value: loading ? 0 : usersCount, icon: Users, gradient: 'from-rose-500 to-pink-600', href: '/admin/account' },
    { label: 'Stores', value: loading ? 0 : storesCount, icon: Store, gradient: 'from-emerald-500 to-teal-600', href: '/admin/stores' },
    { label: 'Production Plans', value: loading ? 0 : plans.length, icon: ChefHat, gradient: 'from-amber-500 to-orange-600', href: '/admin/production' },
    { label: 'In Progress', value: loading ? 0 : inProgressPlans, icon: TrendingUp, gradient: 'from-orange-500 to-red-500', href: '/admin/production' },
    { label: 'Orders', value: loading ? 0 : ordersCount, icon: ClipboardList, gradient: 'from-blue-500 to-indigo-600', href: '/admin/orders' },
    { label: 'Trips', value: loading ? 0 : trips.length, icon: Truck, gradient: 'from-cyan-500 to-blue-600', href: '/admin/shipments' },
    {
      label: 'Inventory',
      value: loading ? 0 : inventorySummary?.totalItems ?? 0,
      icon: Package,
      gradient: 'from-violet-500 to-purple-600',
      href: '/admin/inventory',
      sub: inventorySummary?.storeCount ? `${inventorySummary.storeCount} stores` : undefined,
    },
  ];

  return (
    <div className="p-6">
      <motion.div className="space-y-6 pb-12" initial="hidden" animate="show" variants={container}>
        {/* Stat cards */}
        <motion.section ref={sectionRef} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7" variants={container}>
          {statCards.map((stat) => (
            <motion.div
              key={stat.label}
              variants={item}
              whileHover={{ scale: 1.02, y: -2 }}
              className={cn(
                'group cursor-pointer rounded-xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:bg-secondary/20 p-4',
                cardClass
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
          <motion.section variants={item} className={cn('rounded-xl border p-5', cardClass)}>
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Plans by Status</h2>
            </div>
            <div className="h-56">
              {loading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planStatusData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" vertical={false} opacity={0.5} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                      formatter={(value: number | undefined) => [value ?? 0, 'Count']}
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

          <motion.section variants={item} className={cn('rounded-xl border p-5', cardClass)}>
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Today's Demand</h2>
            </div>
            <div className="h-56">
              {loading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Loading...</div>
              ) : aggregate.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aggregate.slice(0, 8)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <XAxis dataKey="productName" tick={{ fontSize: 10 }} tickFormatter={(v) => (v.length > 12 ? v.slice(0, 10) + '…' : v)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} formatter={(value: number | undefined) => [value ?? 0, 'Quantity']} />
                    <Bar dataKey="totalQuantity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Total Qty" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg bg-muted/30 text-sm text-muted-foreground">No orders for today</div>
              )}
            </div>
          </motion.section>
        </div>

        {/* Recent tables */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <motion.section variants={item} className={cn('rounded-xl border p-4', cardClass)}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Recent Orders</h2>
              <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => navigate('/admin/orders')}>View all</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-2 font-medium">Code</th>
                    <th className="pb-2 pr-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">Loading...</td></tr>
                  ) : recentOrders.length === 0 ? (
                    <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">No orders</td></tr>
                  ) : (
                    recentOrders.map((o) => (
                      <tr key={o._id} className="border-b border-border/50">
                        <td className="py-1.5 pr-2 font-mono text-xs">{o.orderCode}</td>
                        <td className="py-1.5 pr-2">{o.status}</td>
                        <td className="py-1.5">{formatDate(o.requestedDeliveryDate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>

          <motion.section variants={item} className={cn('rounded-xl border p-4', cardClass)}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Recent Trips</h2>
              <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => navigate('/admin/orders')}>View all</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-2 font-medium">Trip Code</th>
                    <th className="pb-2 pr-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">Loading...</td></tr>
                  ) : recentTrips.length === 0 ? (
                    <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">No trips</td></tr>
                  ) : (
                    recentTrips.map((t) => (
                      <tr key={t._id} className="border-b border-border/50">
                        <td className="py-1.5 pr-2 font-mono text-xs">{t.tripCode}</td>
                        <td className="py-1.5 pr-2">{t.status}</td>
                        <td className="py-1.5">{Array.isArray(t.orders) ? t.orders.length : 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>

          <motion.section variants={item} className={cn('rounded-xl border p-4', cardClass)}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Recent Plans</h2>
              <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => navigate('/admin/production')}>View all</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-2 font-medium">Plan Code</th>
                    <th className="pb-2 pr-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">Loading...</td></tr>
                  ) : recentPlans.length === 0 ? (
                    <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">No plans</td></tr>
                  ) : (
                    recentPlans.map((p) => (
                      <tr key={p._id} className="border-b border-border/50">
                        <td className="py-1.5 pr-2 font-mono text-xs">{p.planCode}</td>
                        <td className="py-1.5 pr-2">{p.status}</td>
                        <td className="py-1.5">{formatDate(p.planDate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>
        </div>

        {/* Quick links */}
        <motion.section variants={item} className={cn('rounded-xl border p-4', cardClass)}>
          <h2 className="mb-3 text-sm font-bold text-foreground">Quick Actions</h2>
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
    </div>
  );
};

export default AdminDashboard;
