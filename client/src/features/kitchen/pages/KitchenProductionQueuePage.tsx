import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  ChefHat,
  ClipboardList,
  GripVertical,
  CheckCircle2,
  Play,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/manager/components/ui/Card';
import { Button } from '@/features/manager/components/ui/Button';
import { Badge } from '@/features/manager/components/ui/Badge';
import { Calendar as DayPicker } from '@/features/manager/components/ui/Calendar';
import { ErrorState } from '@/features/manager/components/ui/ErrorState';
import { productionPlanApi, type ProductionPlan } from '@/api/ProductionPlanApi';
import toast from 'react-hot-toast';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function KitchenProductionQueuePage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [queue, setQueue] = useState<ProductionPlan[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await productionPlanApi.getAll();
      const data = (res as any)?.data ?? res ?? [];
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading production plans for queue', err);
      setError('Không tải được danh sách kế hoạch sản xuất. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    const sameDay = (d: string) =>
      new Date(d).toDateString() === selectedDate.toDateString();
    const filtered = plans.filter((p) => {
      const status = (p.status as string) || '';
      const isQueueStatus =
        status === 'Planned' ||
        status === 'In_Progress' ||
        status === 'Pending';
      return sameDay(p.planDate) && isQueueStatus;
    });
    setQueue(filtered);
  }, [plans, selectedDate]);

  const handleStatusChange = async (
    planId: string,
    newStatus: 'In_Progress' | 'Completed'
  ) => {
    try {
      const loadingToast = toast.loading('Đang cập nhật trạng thái...');
      await productionPlanApi.updateStatus(planId, { status: newStatus });
      toast.dismiss(loadingToast);
      toast.success(
        newStatus === 'In_Progress'
          ? 'Đã chuyển kế hoạch sang trạng thái Đang sản xuất'
          : 'Đã hoàn thành kế hoạch'
      );
      await loadPlans();
    } catch (error: any) {
      console.error('Error updating plan status from queue', error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể cập nhật trạng thái. Vui lòng thử lại.';
      toast.error(message);
    }
  };

  const onDragStart = (index: number) => {
    setDragIndex(index);
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const onDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    setQueue((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(index, 0, moved);
      return updated;
    });
    setDragIndex(null);
  };

  const renderStatusBadge = (status: ProductionPlan['status']) => {
    if (status === 'In_Progress') {
      return (
        <Badge className="bg-orange-500 text-white">
          <Play className="mr-1 h-3 w-3" />
          Đang sản xuất
        </Badge>
      );
    }
    if (status === 'Planned') {
      return (
        <Badge variant="secondary" className="text-xs">
          Đã lên kế hoạch
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Đang tải queue sản xuất...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/kitchen/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại Dashboard
        </Button>
        <Card>
          <CardContent className="p-6">
            <ErrorState
              title="Không tải được queue sản xuất"
              message={error}
              onRetry={loadPlans}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalUnitsToday = queue.reduce((sum, p) => {
    const total = p.details?.reduce(
      (acc, d) => acc + (d.plannedQuantity || 0),
      0
    );
    return sum + (total || 0);
  }, 0);

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="show"
      variants={container}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">
              Queue sản xuất trong ngày
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              1) Chọn ngày bên trái • 2) Xem các kế hoạch có trạng thái{' '}
              <span className="font-semibold">Planned</span> /
              <span className="font-semibold"> In_Progress</span> • 3) Kéo thả để ưu tiên •
              4) Dùng nút Bắt đầu / Hoàn thành để cập nhật nhanh.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-sm">
            <ChefHat className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Tổng kế hoạch trong queue hôm nay
              </p>
              <p className="text-sm font-semibold">
                {queue.length} kế hoạch • {totalUnitsToday.toLocaleString()} đơn vị
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Chọn ngày sản xuất</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-xl border border-border bg-muted/50 p-2"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Chỉ những kế hoạch có ngày trùng với ngày được chọn và trạng thái Planned/In
              Progress mới xuất hiện trong queue.
            </p>
          </CardContent>
        </Card>

        <motion.section variants={item}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">
                  Danh sách kế hoạch trong queue
                </CardTitle>
              </div>
              <Badge variant="secondary" className="text-[11px]">
                Drag & drop chỉ thay đổi thứ tự hiển thị (frontend)
              </Badge>
            </CardHeader>
            <CardContent>
              {queue.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/30 text-center text-sm text-muted-foreground">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <p>Không có kế hoạch Planned / In_Progress cho ngày này.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/kitchen/production')}
                    className="text-xs"
                  >
                    Mở danh sách kế hoạch để tạo / chỉnh sửa
                  </Button>
                </div>
              ) : (
                <motion.ul
                  className="space-y-3"
                  variants={container}
                  aria-label="Production queue"
                >
                  {queue.map((plan, index) => {
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
                      <motion.li
                        key={plan._id}
                        variants={item}
                        className="group flex cursor-move items-stretch gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-colors hover:bg-muted/40"
                        draggable
                        onDragStart={() => onDragStart(index)}
                        onDragOver={onDragOver}
                        onDrop={() => onDrop(index)}
                      >
                        <div className="flex items-center">
                          <div className="mr-1 flex h-full flex-col justify-center border-r border-border/60 pr-2 text-muted-foreground">
                            <GripVertical className="h-4 w-4" />
                            <span className="mt-1 text-[10px] font-semibold">
                              {index + 1}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground">
                              {new Date(plan.planDate).toLocaleDateString('vi-VN')}
                            </p>
                            <p className="text-sm font-semibold">{plan.planCode}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {totalActual.toLocaleString()}/
                              {totalPlanned.toLocaleString()} đơn vị • Hoàn thành{' '}
                              {percent}%
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 sm:items-center sm:flex-row">
                            {renderStatusBadge(plan.status)}
                            <div className="flex gap-1">
                              {plan.status === 'Planned' && (
                                <Button
                                  size="xs"
                                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-[11px]"
                                  onClick={() =>
                                    handleStatusChange(plan._id, 'In_Progress')
                                  }
                                >
                                  <Play className="mr-1 h-3 w-3" />
                                  Bắt đầu
                                </Button>
                              )}
                              {plan.status === 'In_Progress' && (
                                <Button
                                  size="xs"
                                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-[11px]"
                                  onClick={() =>
                                    handleStatusChange(plan._id, 'Completed')
                                  }
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Hoàn thành
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="xs"
                                className="text-[11px]"
                                onClick={() =>
                                  navigate(`/kitchen/production/${plan._id}`)
                                }
                              >
                                Chi tiết
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              )}
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </motion.div>
  );
}

