import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Truck,
  Loader2,
  Search,
  CalendarDays,
  MapPin,
  AlertCircle,
  Eye,
} from 'lucide-react';
import DeliveryTripApi, { type ITrip } from '@/api/DeliveryTripApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/manager/components/ui/Card';
import { Button } from '@/features/manager/components/ui/Button';
import { Badge } from '@/features/manager/components/ui/Badge';
import { Input } from '@/features/manager/components/ui/Input';
import { Tabs, TabsList, TabsTrigger } from '@/features/manager/components/ui/Tabs';
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

type TripStatusFilter = 'All' | 'Planning' | 'Transferred_To_Kitchen' | 'Ready_For_Shipping' | 'In_Transit' | 'Completed';

const ITEMS_PER_PAGE = 9;

export default function KitchenTripsPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<ITrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TripStatusFilter>('All');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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
        const sorted = Array.isArray(tripData)
          ? tripData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          : [];
        setTrips(sorted);

      } catch (err) {
        console.error('Error loading trips for kitchen', err);
        setError('Không thể tải danh sách chuyến giao. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('vi-VN');
    } catch {
      return value;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').trim();
    if (s === 'Planning' || s === 'Pending') {
      return (
        <Badge className="bg-amber-500/10 text-amber-700 border border-amber-300 text-xs">
          Đang lập kế hoạch
        </Badge>
      );
    }
    if (s === 'Transferred_To_Kitchen') {
      return (
        <Badge className="bg-amber-500/15 text-amber-700 border border-amber-300 text-xs">
          Đã chuyển cho bếp
        </Badge>
      );
    }
    if (s === 'Ready_For_Shipping' || s === 'ReadyForShipping' || s === 'Ready for shipping') {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-300 text-xs">
          Bếp đã chuẩn bị xong – sẵn sàng giao
        </Badge>
      );
    }
    if (s === 'In_Transit' || s === 'In Transit') {
      return (
        <Badge className="bg-blue-500/10 text-blue-700 border border-blue-300 text-xs">
          Đang giao cho cửa hàng
        </Badge>
      );
    }
    if (s === 'Completed') {
      return (
        <Badge className="bg-gray-500/10 text-gray-700 border border-gray-300 text-xs">
          Đã hoàn thành
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs">
        Trạng thái hệ thống khác
      </Badge>
    );
  };

  const normalizeTripStatus = (rawStatus: string): TripStatusFilter => {
    const status = (rawStatus || '').trim();
    if (status === 'Planning' || status === 'Pending') return 'Planning';
    if (status === 'Transferred_To_Kitchen') return 'Transferred_To_Kitchen';
    if (status === 'Ready_For_Shipping' || status === 'ReadyForShipping' || status === 'Ready for shipping')
      return 'Ready_For_Shipping';
    if (status === 'In_Transit' || status === 'In Transit') return 'In_Transit';
    if (status === 'Completed') return 'Completed';
    return 'All';
  };

  const filteredTrips = trips.filter((trip) => {
    const normalized = normalizeTripStatus((trip.status as string) || '');
    const matchesStatus =
      statusFilter === 'All'
        ? true
        : normalized === statusFilter;
    const code = (trip.tripCode || '').toLowerCase();
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || code.includes(q);
    return matchesStatus && matchesSearch;
  });

  // Reset page khi filter hoặc search thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  // Pagination
  const totalPages = Math.ceil(filteredTrips.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentTrips = filteredTrips.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

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
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="All" className="text-[11px]">
                Tất cả
              </TabsTrigger>
              <TabsTrigger value="Planning" className="text-[11px]">
                Lập kế hoạch
              </TabsTrigger>
              <TabsTrigger value="Transferred_To_Kitchen" className="text-[11px]">
                Chuyển bếp
              </TabsTrigger>
              <TabsTrigger value="Ready_For_Shipping" className="text-[11px]">
                Sẵn sàng
              </TabsTrigger>
              <TabsTrigger value="In_Transit" className="text-[11px]">
                Đang giao
              </TabsTrigger>
              <TabsTrigger value="Completed" className="text-[11px]">
                Hoàn thành
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
              key={`grid-${statusFilter}-${search}-${currentPage}`}
              className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
              initial="hidden"
              animate="show"
              variants={container}
            >
              {currentTrips.map((trip) => (
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
                      {/* Kitchen chỉ quan sát trạng thái trip, không đánh dấu Ready ở cấp Trip.
                          Việc "Ready_For_Shipping" được thực hiện khi hoàn tất sản xuất (complete-item). */}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                Hiện {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredTrips.length)} / {filteredTrips.length} chuyến
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  ‹ Trước
                </Button>
                {getPageNumbers().map((page, index) => {
                  if (page === '...') return <span key={`dots-${index}`} className="px-1.5 text-xs text-muted-foreground">...</span>;
                  const isActive = currentPage === page;
                  return (
                    <Button
                      key={index}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      className={`h-8 w-8 p-0 text-xs ${isActive ? 'bg-primary text-primary-foreground' : ''}`}
                      onClick={() => handlePageChange(page as number)}
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Sau ›
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

