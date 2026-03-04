import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Truck,
  Loader2,
  Search,
  CalendarDays,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import DeliveryTripApi, { type ITrip } from '@/api/DeliveryTripApi';
import { OrderApi, type Order } from '@/api/OrderApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/manager/components/ui/Card';
import { Button } from '@/features/manager/components/ui/Button';
import { Badge } from '@/features/manager/components/ui/Badge';
import { Input } from '@/features/manager/components/ui/Input';
import { Tabs, TabsList, TabsTrigger } from '@/features/manager/components/ui/Tabs';
import toast from 'react-hot-toast';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

type TripStatusFilter = 'All' | 'Planning' | 'Pending' | 'ReadyForShipping' | 'In_Transit' | 'Completed';

export default function KitchenTripsPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<ITrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TripStatusFilter>('All');
  const [search, setSearch] = useState('');
  const [markingTripId, setMarkingTripId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);
        const [tripRes] = await Promise.all([
          DeliveryTripApi.getAllDeliveryTrips(),
        ]);

        const tripData =
          tripRes && typeof tripRes === 'object' && 'data' in tripRes
            ? (tripRes as { data: ITrip[] }).data
            : (tripRes as unknown as ITrip[]) ?? [];
        setTrips(Array.isArray(tripData) ? tripData : []);

      } catch (err) {
        console.error('Error loading trips for kitchen', err);
        setError('Không thể tải danh sách chuyến giao. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handleMarkReady = async (tripId: string) => {
    try {
      setMarkingTripId(tripId);
      const toastId = toast.loading('Đang đánh dấu chuyến sẵn sàng giao...');
      await DeliveryTripApi.markReady(tripId);
      toast.success('Đã đánh dấu chuyến sẵn sàng giao cho điều phối viên.', {
        id: toastId,
      });
      setTrips((prev) =>
        prev.map((t) =>
          t._id === tripId ? { ...t, status: 'ReadyForShipping' } : t,
        ),
      );
    } catch (error: any) {
      console.error('Error marking trip ready from kitchen page', error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể đánh dấu chuyến. Vui lòng thử lại.';
      toast.error(message);
    } finally {
      setMarkingTripId(null);
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('vi-VN');
    } catch {
      return value;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Planning' || status === 'Pending') {
      return (
        <Badge className="bg-amber-500/10 text-amber-700 border border-amber-300 text-xs">
          Đang lập kế hoạch
        </Badge>
      );
    }
    if (status === 'Transferred_To_Kitchen') {
      return (
        <Badge className="bg-amber-500/15 text-amber-700 border border-amber-300 text-xs">
          Đã chuyển cho bếp
        </Badge>
      );
    }
    if (status === 'ReadyForShipping') {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-300 text-xs">
          Sẵn sàng giao
        </Badge>
      );
    }
    if (status === 'In_Transit') {
      return (
        <Badge className="bg-blue-500/10 text-blue-700 border border-blue-300 text-xs">
          Đang giao
        </Badge>
      );
    }
    if (status === 'Completed') {
      return (
        <Badge className="bg-gray-500/10 text-gray-700 border border-gray-300 text-xs">
          Đã hoàn thành
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs">
        {status}
      </Badge>
    );
  };

  const filteredTrips = trips.filter((trip) => {
    const normalizedStatus = (trip.status as string) || '';
    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Pending'
        ? normalizedStatus === 'Pending' ||
          normalizedStatus === 'Transferred_To_Kitchen'
        : normalizedStatus === statusFilter;
    const code = (trip.tripCode || '').toLowerCase();
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || code.includes(q);
    return matchesStatus && matchesSearch;
  });

  const getOrderCount = (trip: ITrip) =>
    Array.isArray(trip.orders) ? trip.orders.length : 0;

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-orange-500" />
        Đang tải danh sách chuyến giao...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2 text-sm text-red-500">
        <AlertCircle className="h-5 w-5" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 pb-10"
      initial="hidden"
      animate="show"
      variants={container}
    >
      <Card>
        <CardHeader className="border-b border-border/50 pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">
                Danh sách chuyến giao từ kho trung tâm
              </CardTitle>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo mã chuyến..."
                  className="pl-9 text-xs"
                />
              </div>
            </div>
          </div>

          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as TripStatusFilter)}
            className="mt-3"
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="All" className="text-[11px]">
                Tất cả
              </TabsTrigger>
              <TabsTrigger value="Planning" className="text-[11px]">
                Planning
              </TabsTrigger>
              <TabsTrigger value="Pending" className="text-[11px]">
                Pending
              </TabsTrigger>
              <TabsTrigger value="ReadyForShipping" className="text-[11px]">
                Ready
              </TabsTrigger>
              <TabsTrigger value="In_Transit" className="text-[11px]">
                In Transit
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          {filteredTrips.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 text-center text-sm text-muted-foreground">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <p>Không có chuyến giao nào khớp bộ lọc hiện tại.</p>
            </div>
          ) : (
            <motion.div
              className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
              variants={container}
            >
              {filteredTrips.map((trip) => (
                <motion.div
                  key={trip._id}
                  variants={item}
                  className="relative flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md text-foreground"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          {trip.tripCode ??
                            `TRIP-${trip._id.slice(-6).toUpperCase()}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Tạo lúc: {formatDateTime(trip.createdAt)}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(trip.status)}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          Số điểm giao
                        </p>
                        <p className="font-semibold">
                          {getOrderCount(trip)} đơn hàng
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          Hoàn thành
                        </p>
                        <p className="font-semibold">
                          {trip.completedTime
                            ? formatDateTime(trip.completedTime)
                            : 'Chưa hoàn thành'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {(() => {
                        const status = (trip.status as string) || '';
                        const canMarkReady =
                          status === 'Planning' ||
                          status === 'Pending' ||
                          status === 'Transferred_To_Kitchen';
                        if (!canMarkReady) return null;
                        return (
                          <Button
                            size="sm"
                            className="bg-emerald-600 text-[11px] text-white hover:bg-emerald-700 h-7 px-2"
                            disabled={markingTripId === trip._id}
                            onClick={() => handleMarkReady(trip._id)}
                          >
                            {markingTripId === trip._id ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Đang đánh dấu...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Đánh dấu Ready
                              </>
                            )}
                          </Button>
                        );
                      })()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[11px] h-7 px-2"
                      onClick={() => navigate(`/kitchen/trips/${trip._id}`)}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Xem chi tiết
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

