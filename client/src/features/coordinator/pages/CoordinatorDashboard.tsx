import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Truck,
  ClipboardList,
  Package,
  AlertCircle,
  ArrowRight,
  MapPin,
  Zap,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { OrderApi } from '@/api/OrderApi';
import DeliveryTripApi, { type ITrip } from '@/api/DeliveryTripApi';
import type { LogisticsOrder } from '@/shared/types/logistics';
import { cn } from '@/shared/lib/utils';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
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
  { label: 'Đơn hàng cửa hàng', path: '/coordinator/orders', icon: ClipboardList, color: 'from-blue-500 to-indigo-600' },
  { label: 'Chuyến giao hàng', path: '/coordinator/shipments', icon: Truck, color: 'from-amber-500 to-orange-600' },
  { label: 'Kho thành phẩm', path: '/coordinator/inventory', icon: Package, color: 'from-emerald-500 to-teal-600' },
  { label: 'Sự cố & Đổi trả', path: '/coordinator/issues', icon: AlertCircle, color: 'from-rose-500 to-red-600' },
];

const STATUS_COLORS: Record<string, string> = {
  Pending: 'hsl(var(--chart-1))',
  Approved: 'hsl(var(--chart-2))',
  In_Transit: 'hsl(var(--chart-3))',
  Received: 'hsl(var(--chart-4))',
  Cancelled: 'hsl(var(--destructive))',
};

export default function CoordinatorDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<LogisticsOrder[]>([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [trips, setTrips] = useState<ITrip[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef(null);
  useInView(sectionRef, { once: true, margin: '-50px' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [orderRes, tripsRes] = await Promise.all([
          OrderApi.getListWithCount(),
          DeliveryTripApi.getAllDeliveryTrips(),
        ]);
        setOrdersCount(orderRes.count);
        setOrders(orderRes.data);
        const tripList = Array.isArray((tripsRes as { data?: ITrip[] })?.data) ? (tripsRes as { data: ITrip[] }).data : [];
        setTrips(tripList);
      } catch {
        setOrders([]);
        setOrdersCount(0);
        setTrips([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const approvedCountAll = orders.filter((o) => o.status === 'Approved').length;
  const planningTrips = trips.filter((t) => t.status === 'Planning').length;
  const inTransitTrips = trips.filter((t) => t.status === 'In_Transit').length;

  const orderChartData = [
    { name: 'Chờ duyệt', value: orders.filter((o) => o.status === 'Pending').length, color: STATUS_COLORS.Pending },
    { name: 'Đã duyệt', value: approvedCountAll, color: STATUS_COLORS.Approved },
    { name: 'Đang giao', value: orders.filter((o) => o.status === 'In_Transit').length, color: STATUS_COLORS.In_Transit },
    { name: 'Đã nhận', value: orders.filter((o) => o.status === 'Received').length, color: STATUS_COLORS.Received },
    { name: 'Đã hủy', value: orders.filter((o) => o.status === 'Cancelled').length, color: STATUS_COLORS.Cancelled },
  ].filter((d) => d.value > 0);
  if (orderChartData.length === 0) orderChartData.push({ name: 'Chưa có đơn', value: 1, color: 'hsl(var(--muted-foreground))' });

  const recentOrders = orders.slice(0, 5);
  const recentTrips = trips.slice(0, 5);

  const statCards = [
    { label: 'Tổng đơn hàng', value: loading ? 0 : ordersCount, icon: ClipboardList, gradient: 'from-blue-500 to-indigo-600', href: '/coordinator/orders' },
    { label: 'Đơn chờ giao', value: loading ? 0 : approvedCountAll, icon: MapPin, gradient: 'from-amber-500 to-orange-600', href: '/coordinator/orders', sub: 'Đã duyệt' },
    { label: 'Chuyến đang lên kế hoạch', value: loading ? 0 : planningTrips, icon: Truck, gradient: 'from-emerald-500 to-teal-600', href: '/coordinator/shipments' },
    { label: 'Chuyến đang giao', value: loading ? 0 : inTransitTrips, icon: Zap, gradient: 'from-violet-500 to-purple-600', href: '/coordinator/shipments' },
  ];

  return (
    <motion.div className="space-y-6 pb-12" initial="hidden" animate="show" variants={container}>
      {/* Stat cards — no hero */}
      <motion.section ref={sectionRef} className="grid grid-cols-2 gap-3 sm:grid-cols-4" variants={container}>
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            whileHover={{ scale: 1.02, y: -2 }}
            className="cursor-pointer rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Pie chart */}
        <motion.section variants={item} className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Đơn hàng theo trạng thái</h2>
          </div>
          <div className="h-56">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Đang tải...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {orderChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--card))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} formatter={(value, name) => [value ?? 0, name ?? '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.section>

        {/* Quick links */}
        <motion.section variants={item} className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">Truy cập nhanh</h2>
          <div className="space-y-2">
            {QUICK_LINKS.map((link) => (
              <motion.button
                key={link.path}
                variants={item}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-secondary/50"
                onClick={() => navigate(link.path)}
              >
                <div className={cn('rounded-md bg-gradient-to-br p-2', link.color)}>
                  <link.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-foreground">{link.label}</span>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </motion.button>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Recent tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.section variants={item} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Đơn hàng gần đây</h2>
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => navigate('/coordinator/orders')}>Xem tất cả</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-2 font-medium">Mã đơn</th>
                  <th className="pb-2 pr-2 font-medium">Trạng thái</th>
                  <th className="pb-2 font-medium">Giao dự kiến</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">Đang tải...</td></tr>
                ) : recentOrders.length === 0 ? (
                  <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">Chưa có đơn</td></tr>
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

        <motion.section variants={item} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Chuyến giao gần đây</h2>
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => navigate('/coordinator/shipments')}>Xem tất cả</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-2 font-medium">Mã chuyến</th>
                  <th className="pb-2 pr-2 font-medium">Trạng thái</th>
                  <th className="pb-2 font-medium">Số đơn</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">Đang tải...</td></tr>
                ) : recentTrips.length === 0 ? (
                  <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">Chưa có chuyến</td></tr>
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
      </div>

      {/* CTA strip */}
      <motion.section
        variants={item}
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-gradient-to-r from-primary/5 to-amber-500/10 p-4"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/20 p-2.5">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Lên lịch chuyến giao hàng</p>
            <p className="text-xs text-muted-foreground">Chọn đơn đã duyệt và tạo chuyến mới</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:shadow-primary/20"
          onClick={() => navigate('/coordinator/shipments')}
        >
          Mở Chuyến giao hàng
        </motion.button>
      </motion.section>
    </motion.div>
  );
}
