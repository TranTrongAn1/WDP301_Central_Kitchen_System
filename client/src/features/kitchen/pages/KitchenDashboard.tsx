import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChefHat,
  ClipboardList,
  Package,
  Truck,
  BarChart3,
  Calendar,
  Flame,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuthStore } from '@/shared/zustand/authStore';
import { productionPlanApi, type ProductionPlan } from '@/api/ProductionPlanApi';
import { batchApi, type Batch } from '@/api/BatchApi';
import { OrderApi, type OrderAggregateItem } from '@/api/OrderApi';
import DeliveryTripApi, { type ITrip } from '@/api/DeliveryTripApi';
import toast from 'react-hot-toast';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const KitchenDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [aggregate, setAggregate] = useState<OrderAggregateItem[]>([]);
  const [trips, setTrips] = useState<ITrip[]>([]);
  const [markingTripId, setMarkingTripId] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);

    const fetchAll = async () => {
      try {
        setLoading(true);
        const [planRes, batchRes, aggRes, tripRes] = await Promise.all([
          productionPlanApi.getAll().catch(() => null),
          batchApi.getAll({ status: 'Active' }).catch(() => null),
          OrderApi.getAggregate(today).catch(() => ({ data: [] })),
          DeliveryTripApi.getAllDeliveryTrips().catch(() => ({ data: [] })),
        ]);

        // Plans
        const planData =
          planRes && typeof planRes === 'object' && 'data' in (planRes as any)
            ? (planRes as any).data
            : planRes ?? [];
        setPlans(Array.isArray(planData) ? planData : []);

        // Batches
        const batchData =
          batchRes && typeof batchRes === 'object' && 'data' in (batchRes as any)
            ? (batchRes as any).data
            : batchRes ?? [];
        setBatches(Array.isArray(batchData) ? batchData : []);

        // Aggregate demand for today
        const aggData = (aggRes as { data?: OrderAggregateItem[] })?.data ?? [];
        setAggregate(aggData);

        // Trips
        const tripList = Array.isArray((tripRes as { data?: ITrip[] })?.data) ? (tripRes as { data: ITrip[] }).data : [];
        setTrips(tripList);
      } catch (error) {
        console.error('Error loading kitchen dashboard data', error);
        setPlans([]);
        setBatches([]);
        setAggregate([]);
        setTrips([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const todayPlans = plans.filter((p) => {
    try {
      return new Date(p.planDate).toDateString() === new Date().toDateString();
    } catch {
      return false;
    }
  });

  const inProgressPlans = plans.filter((p) => p.status === 'In_Progress').length;
  const completedPlansToday = todayPlans.filter((p) => p.status === 'Completed').length;

  const activeBatches = batches;
  const expiringSoonBatches = activeBatches.filter((b) => {
    const exp = new Date(b.expDate);
    const diffDays = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  const tripsNeedingReady = trips.filter((t) => {
    const status = (t.status as string) || '';
    return (
      status === 'Planning' ||
      status === 'Pending' ||
      status === 'Transferred_To_Kitchen'
    );
  });

  const planStatusData = [
    {
      key: 'Planned',
      label: 'Planned',
      value: plans.filter((p) => p.status === 'Planned').length,
      fill: 'hsl(var(--chart-1))',
    },
    {
      key: 'In_Progress',
      label: 'In Progress',
      value: plans.filter((p) => p.status === 'In_Progress').length,
      fill: 'hsl(var(--chart-2))',
    },
    {
      key: 'Completed',
      label: 'Completed',
      value: plans.filter((p) => p.status === 'Completed').length,
      fill: 'hsl(var(--chart-3))',
    },
    {
      key: 'Cancelled',
      label: 'Cancelled',
      value: plans.filter((p) => p.status === 'Cancelled').length,
      fill: 'hsl(var(--chart-4))',
    },
  ];

  const statCards = [
    {
      label: 'Kế hoạch hôm nay',
      value: todayPlans.length,
      icon: ChefHat,
      gradient: 'from-amber-500 to-orange-600',
      href: '/kitchen/production',
    },
    {
      label: 'Đang sản xuất',
      value: inProgressPlans,
      icon: Flame,
      gradient: 'from-orange-500 to-red-500',
      href: '/kitchen/production',
    },
    {
      label: 'Lô active',
      value: activeBatches.length,
      icon: Package,
      gradient: 'from-emerald-500 to-teal-600',
      href: '/kitchen/production/batches',
    },
    {
      label: 'Chuyến cần Ready',
      value: tripsNeedingReady.length,
      icon: Truck,
      gradient: 'from-cyan-500 to-blue-600',
      href: '/kitchen/dashboard',
    },
  ];

  const handleMarkTripReady = async (tripId: string) => {
    try {
      setMarkingTripId(tripId);
      const loadingToast = toast.loading('Đang đánh dấu chuyến sẵn sàng...');
      await DeliveryTripApi.markReady(tripId);
      toast.dismiss(loadingToast);
      toast.success('Đã đánh dấu chuyến sẵn sàng giao');
      setTrips((prev) =>
        prev.map((t) => (t._id === tripId ? { ...t, status: 'ReadyForShipping' } : t))
      );
    } catch (error: any) {
      console.error('Error marking trip ready', error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể đánh dấu chuyến, vui lòng thử lại';
      toast.error(message);
    } finally {
      setMarkingTripId(null);
    }
  };

  return (
    <motion.div
      className="space-y-6 pb-12"
      initial="hidden"
      animate="show"
      variants={container}
    >
      {/* Stat cards */}
      <motion.section
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        variants={container}
      >
        {statCards.map((stat) => (
          <motion.button
            key={stat.label}
            type="button"
            variants={item}
            whileHover={{ scale: 1.02, y: -2 }}
            onClick={() => stat.href && navigate(stat.href)}
            className="group cursor-pointer rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:bg-secondary/20 hover:shadow-md"
          >
            <div
              className={`mb-2 inline-flex rounded-lg bg-gradient-to-br ${stat.gradient} p-2`}
            >
              <stat.icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {loading ? '—' : stat.value}
            </p>
            <p className="text-xs font-medium text-muted-foreground leading-tight">
              {stat.label}
            </p>
          </motion.button>
        ))}
      </motion.section>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.section
          variants={item}
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Kế hoạch theo trạng thái
            </h2>
          </div>
          <div className="h-56">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Đang tải...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={planStatusData}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="hsl(var(--border))"
                    strokeDasharray="4 4"
                    vertical={false}
                    opacity={0.5}
                  />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                    }}
                    formatter={(value: number | undefined) => [
                      value ?? 0,
                      'Số kế hoạch',
                    ]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {planStatusData.map((entry, idx) => (
                      <Bar key={entry.key} dataKey="value" fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.section>

        <motion.section
          variants={item}
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Nhu cầu sản phẩm hôm nay
            </h2>
          </div>
          <div className="h-56">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Đang tải...
              </div>
            ) : aggregate.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={aggregate.slice(0, 8)}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="productName"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: string) =>
                      v.length > 12 ? `${v.slice(0, 10)}…` : v
                    }
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                    }}
                    formatter={(value: number | undefined) => [
                      value ?? 0,
                      'Số lượng',
                    ]}
                  />
                  <Bar
                    dataKey="totalQuantity"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Tổng SL"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg bg-muted/30 text-sm text-muted-foreground">
                Chưa có đơn theo ngày hôm nay
              </div>
            )}
          </div>
        </motion.section>
      </div>

      {/* Hàng dưới: kế hoạch & chuyến giao */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.section
          variants={item}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Kế hoạch sản xuất hôm nay
              </h2>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => navigate('/kitchen/production')}
            >
              Xem tất cả
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-dashed border-border/60 bg-muted/30">
            {loading ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Đang tải...
              </div>
            ) : todayPlans.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Hôm nay chưa có kế hoạch
              </div>
            ) : (
              <ul className="divide-y divide-border/60 text-sm">
                {todayPlans.slice(0, 6).map((plan) => {
                  const totalPlanned =
                    plan.details?.reduce(
                      (sum, d) => sum + (d.plannedQuantity || 0),
                      0
                    ) ?? 0;
                  const totalActual =
                    plan.details?.reduce(
                      (sum, d) => sum + (d.actualQuantity || 0),
                      0
                    ) ?? 0;
                  const percent =
                    totalPlanned > 0
                      ? Math.round((totalActual / totalPlanned) * 100)
                      : 0;

                  return (
                    <li
                      key={plan._id}
                      className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 hover:bg-background"
                      onClick={() =>
                        navigate(`/kitchen/production/${plan._id}`)
                      }
                    >
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          {new Date(plan.planDate).toLocaleDateString('vi-VN')}
                        </p>
                        <p className="text-sm font-medium">{plan.planCode}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden text-right text-xs text-muted-foreground sm:block">
                          <p>
                            {totalActual.toLocaleString()}/
                            {totalPlanned.toLocaleString()} đơn vị
                          </p>
                          <p className="mt-0.5 text-[11px]">
                            Hoàn thành {percent}%
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            plan.status === 'Completed'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : plan.status === 'In_Progress'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200'
                          }`}
                        >
                          {plan.status === 'Completed'
                            ? 'Hoàn thành'
                            : plan.status === 'In_Progress'
                            ? 'Đang làm'
                            : 'Đã lên kế hoạch'}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </motion.section>

        <motion.section
          variants={item}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Chuyến giao cần Kitchen đánh dấu Ready
              </h2>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-dashed border-border/60 bg-muted/30">
            {loading ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Đang tải...
              </div>
            ) : tripsNeedingReady.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Hiện không có chuyến nào chờ Kitchen đánh dấu sẵn sàng
              </div>
            ) : (
              <ul className="divide-y divide-border/60 text-sm">
                {tripsNeedingReady.slice(0, 6).map((trip) => (
                  <li
                    key={trip._id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium">{trip.tripCode}</p>
                      <p className="text-xs text-muted-foreground">
                        {Array.isArray(trip.orders)
                          ? `${trip.orders.length} đơn hàng`
                          : 'Chưa có đơn'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        Đang chờ bếp
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMarkTripReady(trip._id)}
                        disabled={markingTripId === trip._id}
                        className="inline-flex items-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {markingTripId === trip._id ? (
                          'Đang xử lý...'
                        ) : (
                          <>
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Mark Ready
                          </>
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {expiringSoonBatches.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <p>
                Có{' '}
                <span className="font-semibold">
                  {expiringSoonBatches.length} lô
                </span>{' '}
                sắp hết hạn trong 7 ngày tới. Vui lòng ưu tiên xuất kho trước (FEFO).
              </p>
            </div>
          )}
        </motion.section>
      </div>
    </motion.div>
  );
};

export default KitchenDashboard;

