import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/shared/zustand/authStore';
import { OrderApi, type Order, type ReceiveOrderPayload } from '@/api/OrderApi';
import { feedbackApi } from '@/api/FeedbackApi';
import { StarRating } from '@/shared/components/StarRating';

const ITEMS_PER_PAGE = 8;

const StoreOrdersPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackOrderId, setFeedbackOrderId] = useState<string | null>(null);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [isFeedbackSaving, setIsFeedbackSaving] = useState(false);
  const [hasFeedback, setHasFeedback] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveOrderId, setReceiveOrderId] = useState<string | null>(null);
  const [receiveEvidenceUrl, setReceiveEvidenceUrl] = useState('');
  const [receiveItems, setReceiveItems] = useState<
    { productId: string; name: string; orderedQuantity: number; receivedQuantity: number; discrepancyReason?: 'Missing' | 'Damaged' | 'Other'; note?: string }[]
  >([]);
  const [isReceiving, setIsReceiving] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await OrderApi.getAllOrders();
        const storeId = user?.storeId;
        const filtered = storeId
          ? data.filter((o) => {
            if (typeof o.storeId === 'string') return o.storeId === storeId;
            return (o.storeId as any)?._id === storeId;
          })
          : data;
        setOrders(filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
      } catch {
        setError('Không thể tải danh sách đơn hàng của cửa hàng.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user?.storeId]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentOrders = orders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
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

  const handleCancelOrder = async (orderId: string) => {
    try {
      const toastId = toast.loading('Đang hủy đơn hàng...');
      await OrderApi.rejectOrder(orderId, 'Cancelled by store staff');
      const data = await OrderApi.getAllOrders();
      const storeId = user?.storeId;
      const filtered = storeId
        ? data.filter((o) => {
            if (typeof o.storeId === 'string') return o.storeId === storeId;
            return (o.storeId as any)?._id === storeId;
          })
        : data;
      setOrders(filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
      toast.success('Đã hủy đơn hàng!', { id: toastId });
    } catch {
      toast.error('Không thể hủy đơn hàng.');
    } finally {
      setConfirmCancelId(null);
    }
  };

  const openReceiveModal = (order: Order) => {
    if (!order.items || order.items.length === 0) return;
    setReceiveOrderId(order._id);
    setReceiveEvidenceUrl('');
    setReceiveItems(
      order.items.map((it) => {
        const product =
          typeof it.productId === 'string'
            ? { _id: it.productId, name: it.productId }
            : it.productId;
        return {
          productId: product._id,
          name: product.name,
          orderedQuantity: it.quantity,
          receivedQuantity: it.quantity,
        };
      })
    );
    setReceiveModalOpen(true);
  };

  const handleChangeReceiveQty = (index: number, value: number) => {
    setReceiveItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
            ...item,
            receivedQuantity: value < 0 ? 0 : value,
          }
          : item
      )
    );
  };

  const handleChangeReason = (index: number, value: string) => {
    setReceiveItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
            ...item,
            discrepancyReason: value === '' ? undefined : (value as 'Missing' | 'Damaged' | 'Other'),
          }
          : item
      )
    );
  };

  const handleSaveReceive = async () => {
    if (!receiveOrderId) return;
    const payload: ReceiveOrderPayload = {
      items: receiveItems.map((item) => ({
        productId: item.productId,
        receivedQuantity: item.receivedQuantity,
        note: item.note,
        discrepancyReason: item.discrepancyReason,
      })),
      receivedEvidenceImageURL: receiveEvidenceUrl || undefined,
    };

    try {
      setIsReceiving(true);
      const toastId = toast.loading('Đang cập nhật nhận hàng...');
      await OrderApi.receiveOrder(receiveOrderId, payload);
      setReceiveModalOpen(false);
      const data = await OrderApi.getAllOrders();
      const storeId = user?.storeId;
      const filtered = storeId
        ? data.filter((o) => {
          if (typeof o.storeId === 'string') return o.storeId === storeId;
          return (o.storeId as any)?._id === storeId;
        })
        : data;
      setOrders(filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
      toast.success('Đã cập nhật trạng thái nhận hàng', { id: toastId });
    } catch (error: any) {
      console.error(error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể lưu thông tin nhận hàng';
      toast.error(message);
    } finally {
      setIsReceiving(false);
    }
  };

  const openFeedbackModal = async (orderId: string) => {
    setFeedbackOrderId(orderId);
    setFeedbackModalOpen(true);
    setFeedbackLoading(true);
    setFeedbackContent('');
    setFeedbackRating(5);
    setHasFeedback(false);
    try {
      const fb = await feedbackApi.getByOrderId(orderId);
      if (fb) {
        setFeedbackContent(fb.content);
        setFeedbackRating(fb.rating);
        setHasFeedback(true);
      }
    } catch {
      // keep defaults
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleSaveFeedback = async () => {
    if (!feedbackOrderId || !feedbackContent.trim()) return;
    try {
      setIsFeedbackSaving(true);
      if (hasFeedback) {
        await feedbackApi.update(feedbackOrderId, {
          rating: feedbackRating,
          content: feedbackContent.trim(),
        });
      } else {
        await feedbackApi.create(feedbackOrderId, {
          rating: feedbackRating,
          content: feedbackContent.trim(),
        });
      }
      setHasFeedback(true);
      setFeedbackModalOpen(false);
    } finally {
      setIsFeedbackSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
        <span className="material-symbols-outlined animate-spin mr-2">
          progress_activity
        </span>
        Đang tải đơn hàng...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-sm text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Store • Orders
          </p>
          <h1 className="mt-1 text-base font-bold text-foreground">
            Đơn hàng của cửa hàng
          </h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground max-w-xl">
            Theo dõi các đơn đã gửi về trung tâm, trạng thái giao hàng và thực hiện nhận hàng/thanh toán.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/store/orders/new')}
          className="inline-flex items-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-semibold text-white shadow hover:brightness-105"
        >
          <span className="material-symbols-outlined text-[18px] mr-1">
            add
          </span>
          Tạo đơn mới
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-card/80 p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Tổng đơn</p>
            <p className="text-base font-bold text-foreground">{orders.length}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/80 p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Đang chờ duyệt</p>
            <p className="text-base font-bold text-foreground">
              {orders.filter((o) => o.status === 'Pending').length}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/80 p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">task_alt</span>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Đã nhận hàng</p>
            <p className="text-base font-bold text-foreground">
              {orders.filter((o) => o.status === 'Received').length}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 md:p-5">
        {orders.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Chưa có đơn hàng nào.
          </div>
        ) : (
          <div className="space-y-3">
            {currentOrders.map((order) => (
              <div
                key={order._id}
                className="rounded-xl border border-border/70 bg-background/70 px-3 py-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-semibold">
                      {order.orderCode}
                    </span>
                    <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold bg-secondary/60">
                      {order.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    <span>Ngày giao: {formatDate(order.requestedDeliveryDate)}</span>
                    <span>
                      Số mặt hàng: {order.items?.length ?? 0}
                    </span>
                    <span>
                      Tổng tiền: {formatCurrency(order.totalAmount ?? 0)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const recipientName = (order as any)?.recipientName;
                    const recipientPhone = (order as any)?.recipientPhone;
                    const address = (order as any)?.address;
                    const canReceive =
                      order.status === 'In_Transit' &&
                      recipientName &&
                      recipientPhone &&
                      address;

                    return (
                      <>
                        <button
                          type="button"
                          className="h-8 rounded-lg border border-border px-3 text-[11px] font-semibold hover:bg-secondary"
                          onClick={() => navigate(`/store/orders/${order._id}`)}
                        >
                          Xem chi tiết
                        </button>

                        {canReceive && (
                          <button
                            type="button"
                            className="h-8 rounded-lg border border-border px-3 text-[11px] font-semibold hover:bg-secondary"
                            onClick={() => openReceiveModal(order)}
                            title="Xác nhận hàng đã nhận tại cửa hàng."
                          >
                            Nhận hàng
                          </button>
                        )}

                        {/* Hủy đơn chỉ dành cho Manager/Coordinator/Admin theo backend, nên ẩn ở UI StoreStaff */}

                        {!canReceive && order.status === 'In_Transit' && (
                          <span className="text-[10px] text-red-500 font-semibold">
                            Thiếu thông tin giao hàng
                          </span>
                        )}

                        <button
                          type="button"
                          className="h-8 rounded-lg border border-border px-3 text-[11px] font-semibold hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => openFeedbackModal(order._id)}
                          disabled={order.status !== 'Received'}
                          title={
                            order.status !== 'Received'
                              ? 'Chỉ gửi feedback khi đơn đã nhận hàng.'
                              : ''
                          }
                        >
                          {order.status === 'Received'
                            ? 'Viết / xem feedback'
                            : 'Chờ nhận hàng'}
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="mt-2 flex select-none items-center justify-end gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium text-muted-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    chevron_left
                  </span>
                  Trước
                </button>
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page, idx) =>
                    page === '...' ? (
                      <span
                        key={`dots-${idx}`}
                        className="px-2 text-muted-foreground"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePageChange(page as number)}
                        className={`h-7 min-w-[26px] rounded-lg px-2 font-semibold transition-all ${currentPage === page
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                          }`}
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
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium text-muted-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  Sau
                  <span className="material-symbols-outlined text-[16px]">
                    chevron_right
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {feedbackModalOpen && feedbackOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Feedback đơn hàng</h2>
              <button
                type="button"
                onClick={() => setFeedbackModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <label className="font-medium">Đánh giá</label>
                {feedbackLoading ? (
                  <div className="mt-2 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className="w-7 h-7 rounded bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="mt-2">
                    <StarRating value={feedbackRating} onChange={setFeedbackRating} size="md" />
                  </div>
                )}
              </div>
              <div>
                <label className="font-medium">Nội dung</label>
                <textarea
                  rows={3}
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1 text-xs resize-none"
                  placeholder="Ví dụ: Hàng giao đủ, chất lượng tốt..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFeedbackModalOpen(false)}
                className="h-8 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-secondary"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveFeedback}
                disabled={isFeedbackSaving || !feedbackContent.trim()}
                className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isFeedbackSaving
                  ? 'Đang lưu...'
                  : hasFeedback
                    ? 'Cập nhật'
                    : 'Gửi feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {receiveModalOpen && receiveOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-card border border-border p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Nhận hàng tại cửa hàng</h2>
              <button
                type="button"
                onClick={() => setReceiveModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Cập nhật số lượng thực nhận cho từng sản phẩm. Nếu thiếu / hư hỏng, hãy chọn lý do.
            </p>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {receiveItems.map((item, index) => (
                <div
                  key={item.productId}
                  className="rounded-lg border border-border/60 bg-background/60 p-3 flex flex-col gap-2 md:flex-row md:items-center"
                >
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Đặt: {item.orderedQuantity}
                    </p>
                  </div>
                  <div className="w-full md:w-32 space-y-1">
                    <label className="text-[11px] font-medium">
                      SL nhận
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={item.orderedQuantity}
                      value={item.receivedQuantity}
                      onChange={(e) =>
                        handleChangeReceiveQty(index, Number(e.target.value) || 0)
                      }
                      className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="w-full md:w-40 space-y-1">
                    <label className="text-[11px] font-medium">
                      Lý do chênh lệch
                    </label>
                    <select
                      value={item.discrepancyReason || ''}
                      onChange={(e) => handleChangeReason(index, e.target.value)}
                      className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Không</option>
                      <option value="Missing">Thiếu hàng</option>
                      <option value="Damaged">Hư hỏng</option>
                      <option value="Other">Khác</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium">
                Link ảnh biên bản / bằng chứng (tuỳ chọn)
              </label>
              <input
                type="url"
                value={receiveEvidenceUrl}
                onChange={(e) => setReceiveEvidenceUrl(e.target.value)}
                placeholder="https://..."
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReceiveModalOpen(false)}
                className="h-8 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-secondary"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveReceive}
                disabled={isReceiving}
                className="h-8 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isReceiving ? 'Đang lưu...' : 'Xác nhận đã nhận hàng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmCancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-5 space-y-4 text-xs text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-1">
              <span className="material-symbols-outlined text-[26px]">warning</span>
            </div>
            <p className="text-sm font-semibold">Hủy đơn hàng?</p>
            <p className="text-[11px] text-muted-foreground">
              Đơn hàng đang ở trạng thái chờ duyệt sẽ bị hủy và không được xử lý tại trung tâm.
            </p>
            <div className="flex justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmCancelId(null)}
                className="flex-1 h-8 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-secondary"
              >
                Giữ lại
              </button>
              <button
                type="button"
                onClick={() => handleCancelOrder(confirmCancelId)}
                className="flex-1 h-8 rounded-lg bg-red-500 px-3 text-xs font-semibold text-white hover:bg-red-600"
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreOrdersPage;

