import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardList, Truck, CalendarClock, Loader2, ChevronDown } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { OrderApi, type Order as OrderType } from '@/api/OrderApi';
import DeliveryTripApi, { type ITrip } from '@/api/DeliveryTripApi';
import { useUserSettingsStore } from '@/shared/zustand/userSettingsStore';
import { cn } from '@/shared/lib/utils';

const ITEMS_PER_PAGE = 9;

const OrdersShipmentsPage = () => {
  const navigate = useNavigate();
  const { compactMode } = useUserSettingsStore();

  const [orders, setOrders] = useState<OrderType[]>([]);
  const [trips, setTrips] = useState<ITrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'trips'>('orders');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);
        const [orderRes, tripRes] = await Promise.all([
          OrderApi.getAllOrders().catch(() => []),
          DeliveryTripApi.getAllDeliveryTrips().catch(() => ({ data: [] })),
        ]);
        const sortedOrders = Array.isArray(orderRes)
          ? [...orderRes].sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          : [];
        setOrders(sortedOrders);

        const tripData = Array.isArray((tripRes as { data?: ITrip[] })?.data)
          ? (tripRes as { data: ITrip[] }).data
          : [];
        setTrips(tripData);
      } catch {
        setError('Không thể tải dữ liệu đơn hàng & chuyến giao');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const filteredOrders =
    filterStatus === 'All'
      ? orders
      : orders.filter((order) => order.status === filterStatus);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentOrders = filteredOrders.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handlePageChange = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setCurrentPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(
        1,
        '...',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    } else {
      pages.push(
        1,
        '...',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        '...',
        totalPages
      );
    }
    return pages;
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground text-sm">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-orange-500" />
        Đang tải dữ liệu đơn hàng & chuyến giao...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center text-red-500 text-sm">
        {error}
      </div>
    );
  }

  const totalOrders = orders.length;
  const totalTrips = trips.length;

  return (
    <div className={cn('space-y-6', compactMode ? 'pb-6' : 'pb-10')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Tổng quan đơn hàng & chuyến giao
          </h1>
          <p className="mt-1 text-xs text-muted-foreground max-w-xl">
            Xem nhanh các đơn từ cửa hàng và các chuyến giao hàng đang được điều
            phối.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
          <Card className="border border-border/70 bg-card/80">
            <CardContent className={cn('flex items-center gap-3', compactMode ? 'p-3' : 'p-4')}>
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Đơn hàng</p>
                <p className="text-lg font-bold text-foreground">{totalOrders}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border/70 bg-card/80">
            <CardContent className={cn('flex items-center gap-3', compactMode ? 'p-3' : 'p-4')}>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Chuyến giao</p>
                <p className="text-lg font-bold text-foreground">{totalTrips}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'orders' | 'trips')}>
        <Card>
          <CardHeader className="border-b border-border/40 pb-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                  {activeTab === 'orders' ? (
                    <>
                      <ClipboardList className="h-4 w-4 text-primary" />
                      Đơn hàng từ cửa hàng
                    </>
                  ) : (
                    <>
                      <Truck className="h-4 w-4 text-primary" />
                      Chuyến giao hàng
                    </>
                  )}
                </CardTitle>
                <CardDescription className="mt-1 text-xs">
                  {activeTab === 'orders'
                    ? 'Danh sách đơn logistics được tạo từ các cửa hàng.'
                    : 'Các chuyến giao hàng đã được gom đơn và điều phối.'}
                </CardDescription>
              </div>
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="orders" className="flex-1 md:flex-none">
                  Đơn hàng
                </TabsTrigger>
                <TabsTrigger value="trips" className="flex-1 md:flex-none">
                  Chuyến giao
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          <CardContent className={cn('pt-4', compactMode && 'pt-3')}>
            <TabsContent value="orders" className="mt-0 space-y-4">
              <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", compactMode ? "mb-3" : "mb-4")}>
                <span className="text-xs text-muted-foreground">
                  {filteredOrders.length} đơn hàng
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Trạng thái:
                  </span>
                  <div className="relative">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className={cn(
                        'h-9 min-w-[190px] cursor-pointer appearance-none rounded-xl border border-border bg-card px-3 pr-8 text-xs font-medium text-foreground shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                        compactMode ? 'py-1' : 'py-2'
                      )}
                    >
                      <option value="All">Tất cả trạng thái</option>
                      <option value="Pending">Chờ duyệt (Pending)</option>
                      <option value="Approved">Đã duyệt (Approved)</option>
                      <option value="In_Transit">Đang giao (In_Transit)</option>
                      <option value="Received">Đã nhận (Received)</option>
                      <option value="Cancelled">Đã hủy (Cancelled)</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-10 text-xs text-muted-foreground">
                  <span className="material-symbols-outlined mb-2 text-4xl text-muted-foreground/70">
                    search_off
                  </span>
                  Không có đơn hàng nào khớp với bộ lọc.
                </div>
              ) : (
                <>
                  <div className={cn("grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3", compactMode ? "gap-3" : "gap-4")}>
                    {currentOrders.map((order) => (
                      <motion.div
                        key={order._id}
                        whileHover={{ scale: 1.01, y: -2 }}
                        className={cn(
                          'group relative rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-md',
                          compactMode ? 'p-4' : 'p-5'
                        )}
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex flex-col">
                            <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Mã đơn hàng
                            </span>
                            <span className="font-mono text-sm font-bold text-card-foreground">
                              {order.orderCode}
                            </span>
                          </div>
                          <span className="rounded-full border px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-500/5 border-blue-200">
                            {order.status}
                          </span>
                        </div>

                        <div className="my-3 h-px w-full bg-border" />

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <CalendarClock className="h-3.5 w-3.5" />
                              Ngày giao
                            </div>
                            <span className="font-medium text-card-foreground">
                              {formatDate(order.requestedDeliveryDate)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="material-symbols-outlined text-[16px]">
                                store
                              </span>
                              Cửa hàng
                            </div>
                            <span className="max-w-[150px] truncate text-xs font-medium text-card-foreground">
                              {typeof order.storeId === 'object' &&
                              order.storeId?.storeName
                                ? order.storeId.storeName
                                : typeof order.storeId === 'string'
                                ? order.storeId.slice(-6).toUpperCase()
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="material-symbols-outlined text-[16px]">
                                inventory_2
                              </span>
                              Số lượng mặt hàng
                            </div>
                            <span className="font-medium text-card-foreground">
                              {order.items?.length || 0}
                            </span>
                          </div>
                        </div>

                        <div className="my-3 h-px w-full bg-border" />

                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[11px] text-muted-foreground">
                              Tổng giá trị
                            </span>
                            <span className="text-base font-bold text-primary">
                              {formatCurrency(order.totalAmount)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-9 w-9 rounded-full"
                            onClick={() => navigate(`/coordinator/orders/${order._id}`)}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              arrow_forward
                            </span>
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-4 flex select-none items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          chevron_left
                        </span>
                        Trước
                      </button>
                      <div className="flex items-center gap-1">
                        {getPageNumbers().map((page, idx) =>
                          page === '...' ? (
                            <span
                              key={`dots-${idx}`}
                              className="px-2 text-xs text-muted-foreground"
                            >
                              ...
                            </span>
                          ) : (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handlePageChange(page as number)}
                              className={cn(
                                'h-8 min-w-[32px] rounded-lg px-2 text-xs font-semibold transition-all',
                                currentPage === page
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                              )}
                            >
                              {page}
                            </button>
                          )
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        Sau
                        <span className="material-symbols-outlined text-[18px]">
                          chevron_right
                        </span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="trips" className="mt-0 space-y-4">
              {trips.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-10 text-xs text-muted-foreground">
                  <span className="material-symbols-outlined mb-2 text-4xl text-muted-foreground/70">
                    local_shipping
                  </span>
                  Chưa có chuyến giao nào.
                </div>
              ) : (
                <div className="space-y-3">
                  {trips.map((trip) => (
                    <motion.div
                      key={trip._id}
                      whileHover={{ y: -1 }}
                      className={cn(
                        'flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-xs',
                        compactMode ? 'gap-3' : 'gap-4'
                      )}
                    >
                      <div className="flex flex-1 items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          <Truck className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">
                            {trip.tripCode}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {Array.isArray(trip.orders) ? trip.orders.length : 0} đơn •{' '}
                            {trip.status}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => navigate(`/coordinator/shipments/${trip._id}`)}
                      >
                        Xem chi tiết
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

export default OrdersShipmentsPage;
