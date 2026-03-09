import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OrderApi, type Order as OrderType, type ApproveOrderPayload } from '@/api/OrderApi';
import { productApi, type Product } from '@/api/ProductApi';
import { ingredientApi, type Ingredient, type IngredientBatch } from '@/api/IngredientApi';
import { batchApi, type Batch } from '@/api/BatchApi';
import { feedbackApi } from '@/api/FeedbackApi';
import { StarRating } from '@/shared/components/StarRating';
import toast from 'react-hot-toast';

// Interface cho bảng tính toán tồn kho
interface InventoryCalculation {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  currentStock: number;
  requiredQty: number;
  remainingStock: number;
  isEnough: boolean;
}

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderType | null>(null);
  const [inventoryCheck, setInventoryCheck] = useState<InventoryCalculation[]>([]);
  const [isEnoughStock, setIsEnoughStock] = useState<boolean>(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- STATE CHO CHỨC NĂNG TỪ CHỐI ĐƠN HÀNG ---
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [isFeedbackSaving, setIsFeedbackSaving] = useState(false);
  const [hasFeedback, setHasFeedback] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [orderData, productsRes, ingredientsRes] = await Promise.all([
          OrderApi.getOrderById(id),
          productApi.getAll(),
          ingredientApi.getAll()
        ]);

        setOrder(orderData);

        const products: Product[] = (productsRes as any).data || [];
        const ingredients: Ingredient[] = (ingredientsRes as any).data || [];

        if (orderData && orderData.items) {
          const requiredMap: Record<string, InventoryCalculation> = {};

          orderData.items.forEach((orderItem: any) => {
            const prodId = typeof orderItem.productId === 'object' ? orderItem.productId._id : orderItem.productId;
            const product = products.find(p => p._id === prodId);

            if (product && product.recipe) {
              product.recipe.forEach((rec: any) => {
                const ingId = typeof rec.ingredientId === 'object' ? rec.ingredientId._id : rec.ingredientId;
                const totalQtyNeeded = rec.quantity * orderItem.quantity;

                if (!requiredMap[ingId]) {
                  const ingInfo = ingredients.find(i => i._id === ingId);
                  requiredMap[ingId] = {
                    ingredientId: ingId,
                    ingredientName: ingInfo ? ingInfo.ingredientName : 'N/A',
                    unit: ingInfo ? ingInfo.unit : '',
                    currentStock: 0,
                    requiredQty: 0,
                    remainingStock: 0,
                    isEnough: true
                  };
                }
                requiredMap[ingId].requiredQty += totalQtyNeeded;
              });
            }
          });

          const requiredIngredientIds = Object.keys(requiredMap);
          const batchPromises = requiredIngredientIds.map(ingId => ingredientApi.getBatches(ingId));
          const batchResults = await Promise.all(batchPromises);

          let allRelevantBatches: IngredientBatch[] = [];
          batchResults.forEach(res => {
            const batches = (res as any).data || [];
            allRelevantBatches = [...allRelevantBatches, ...batches];
          });

          let allEnough = true;
          const finalCalculations = Object.values(requiredMap).map(calc => {
            const validBatches = allRelevantBatches.filter(batch => {
              const batchIngId = typeof batch.ingredientId === 'object' ? batch.ingredientId._id : batch.ingredientId;
              const isNotExpired = new Date(batch.expiryDate).getTime() > new Date().getTime();
              return batchIngId === calc.ingredientId && batch.isActive && isNotExpired && batch.currentQuantity > 0;
            });

            const trueStock = validBatches.reduce((sum, batch) => sum + batch.currentQuantity, 0);
            const remaining = trueStock - calc.requiredQty;
            const enough = remaining >= 0;
            if (!enough) allEnough = false;

            return {
              ...calc,
              currentStock: trueStock,
              remainingStock: remaining,
              isEnough: enough
            };
          });

          setInventoryCheck(finalCalculations);
          setIsEnoughStock(allEnough);
        }

      } catch (err) {
        console.error(err);
        setError('Không thể tải dữ liệu đối chiếu.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id, refreshTrigger]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setFeedbackLoading(true);
    feedbackApi.getByOrderId(id).then((fb) => {
      if (cancelled) return;
      if (fb) {
        setFeedbackContent(fb.content);
        setFeedbackRating(fb.rating);
        setHasFeedback(true);
      } else {
        setFeedbackContent('');
        setFeedbackRating(5);
        setHasFeedback(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setFeedbackContent('');
        setFeedbackRating(5);
        setHasFeedback(false);
      }
    }).finally(() => {
      if (!cancelled) setFeedbackLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, refreshTrigger]);

  const handleRejectOrder = async () => {
    if (!id) return;
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối!');
      return;
    }

    try {
      setIsRejecting(true);
      const res = await OrderApi.rejectOrder(id, rejectReason);

      if (res.success) {
        toast.success("Đã từ chối đơn hàng thành công!");
        setIsRejectModalOpen(false);
        setRejectReason('');
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(res.message || "Lỗi khi từ chối đơn hàng");
      }
    } catch (error) {
      console.error(error);
      toast.error("Không thể kết nối đến máy chủ");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleApproveOrder = async () => {
    if (!id || !order) return;
    if (!isEnoughStock) {
      toast.error('Không đủ nguyên liệu để duyệt đơn này.');
      return;
    }

    try {
      setIsApproving(true);

      // Với mỗi item trong đơn, chọn batch Active FEFO, gửi đúng format BE: productId, approvedQuantity, batches[]
      const approveItems: ApproveOrderPayload['items'] = [];

      for (const item of order.items) {
        const pid =
          typeof item.productId === 'object'
            ? item.productId._id
            : (item.productId as string);
        const qty = item.quantity ?? 0;

        const res = await batchApi.getAll({ productId: pid, status: 'Active' });
        const raw = (res as any)?.data ?? res ?? [];
        const batches: Batch[] = Array.isArray(raw) ? raw : [];

        const candidates = batches
          .filter((b) => {
            const notExpired = new Date(b.expDate).getTime() > Date.now();
            return b.currentQuantity >= qty && notExpired;
          })
          .sort(
            (a, b) =>
              new Date(a.expDate).getTime() - new Date(b.expDate).getTime()
          );

        const chosen = candidates[0];

        if (!chosen) {
          throw new Error(
            `Không có lô thành phẩm đủ số lượng cho sản phẩm ${(item.productId as any)?.name || pid} (cần ${qty}).`
          );
        }

        approveItems.push({
          productId: pid,
          approvedQuantity: qty,
          batches: [{ batchId: chosen._id, quantity: qty }],
          // Gửi thêm batchId top-level cho BE nào đọc ở đây
          batchId: chosen._id,
        });
      }

      const payload: ApproveOrderPayload = { items: approveItems };

      const res = await OrderApi.approveOrder(id, payload);

      if (res.success) {
        toast.success('Đã duyệt đơn hàng thành công.');
        setIsApproveConfirmOpen(false);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error(res.message || 'Lỗi khi duyệt đơn hàng');
      }
    } catch (error: any) {
      console.error(error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Lỗi khi duyệt đơn hàng';
      toast.error(message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleSaveFeedback = async () => {
    if (!id) return;
    if (!feedbackContent.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi.');
      return;
    }

    try {
      setIsFeedbackSaving(true);
      if (hasFeedback) {
        await feedbackApi.update(id, {
          rating: feedbackRating,
          content: feedbackContent.trim(),
        });
        toast.success('Đã cập nhật feedback cho đơn hàng.');
      } else {
        await feedbackApi.create(id, {
          rating: feedbackRating,
          content: feedbackContent.trim(),
        });
        toast.success('Đã gửi feedback cho đơn hàng.');
      }
      setHasFeedback(true);
    } catch (error) {
      console.error(error);
      toast.error('Không thể lưu feedback, vui lòng thử lại.');
    } finally {
      setIsFeedbackSaving(false);
    }
  };

  // Các handler thanh toán trực tiếp bằng ví/PayOS/cash đã được loại bỏ khỏi UI trong MVP web.

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'Approved': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'In_Transit': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'Shipped': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'Received': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'Cancelled': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getOrderStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      Pending: 'Chờ duyệt',
      Approved: 'Đã duyệt',
      In_Transit: 'Đang giao',
      'In Transit': 'Đang giao',
      Received: 'Đã nhận',
      Cancelled: 'Đã hủy',
      Shipped: 'Đã giao',
    };
    return map[(status || '').trim()] ?? 'Trạng thái khác';
  };

  if (loading && !order) return (
    <div className="flex h-screen items-center justify-center text-muted-foreground">
      <span className="material-symbols-outlined animate-spin text-3xl mr-2">progress_activity</span>
      Đang tải chi tiết & đối chiếu kho...
    </div>
  );

  if (error || !order) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <span className="text-red-500 text-lg">{error || 'Không tìm thấy đơn hàng'}</span>
      <button onClick={() => navigate(-1)} className="text-blue-500 hover:underline">Quay lại</button>
    </div>
  );

  return (
    <div className="min-h-screen p-6 animate-in fade-in duration-300">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full transition-colors bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-foreground"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-card-foreground font-mono">{order.orderCode}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(order.status)}`}>
              {getOrderStatusLabel(order.status)}
            </span>
            <span className="text-sm text-muted-foreground">Ngày đặt: {formatDate(order.createdAt)}</span>
          </div>
        </div>

        <div className="flex gap-3">

          {(order.status === 'Pending' || order.status === 'Approved') && (
            <button
              onClick={() => setIsRejectModalOpen(true)}
              className="px-4 py-2 bg-red-500/10 text-red-600 border border-red-200 rounded-lg font-medium text-sm transition-colors hover:bg-red-500/25 hover:border-red-300"
            >
              Từ chối
            </button>
          )}
          {order.status === 'Pending' && (
            <button
              disabled={!isEnoughStock || isApproving}
              title={!isEnoughStock ? 'Không đủ nguyên liệu trong kho để làm đơn này' : ''}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${isEnoughStock
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed grayscale'
                }`}
              onClick={() => setIsApproveConfirmOpen(true)}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isApproving ? 'progress_activity' : isEnoughStock ? 'check' : 'block'}
              </span>
              {isApproving ? 'Đang duyệt...' : isEnoughStock ? 'Duyệt đơn' : 'Thiếu nguyên liệu'}
            </button>
          )}

          <button className="px-4 py-2 rounded-lg font-medium text-sm transition-colors border border-border bg-card hover:bg-secondary flex items-center gap-2 text-foreground">
            <span className="material-symbols-outlined text-[18px]">print</span> In phiếu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-6">

          <div className="rounded-2xl border border-border p-6 bg-card shadow-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
              <span className="material-symbols-outlined text-amber-500">shopping_cart</span>
              Danh sách bánh yêu cầu
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-sm uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 font-semibold">Sản phẩm</th>
                    <th className="pb-3 font-semibold text-center">Số lượng</th>
                    <th className="pb-3 font-semibold text-right">Đơn giá</th>
                    <th className="pb-3 font-semibold text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-foreground">
                  {order.items.map((item: OrderType['items'][0], index: number) => {
                    const productName = (typeof item.productId === 'object' && item.productId?.name) ? item.productId.name : 'Sản phẩm ' + (index + 1);
                    const productPrice = (typeof item.productId === 'object' && item.productId?.price) ? item.productId.price : (item.unitPrice ?? (item.quantity ? item.subtotal / item.quantity : 0));
                    const subtotal = item.subtotal ?? productPrice * item.quantity;

                    return (
                      <tr key={index} className="border-b border-border last:border-0">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-secondary">
                              <span className="material-symbols-outlined text-gray-400 text-lg">image</span>
                            </div>
                            <span className="font-medium">{productName}</span>
                          </div>
                        </td>
                        <td className="py-4 text-center font-bold text-amber-500">{item.quantity}</td>
                        <td className="py-4 text-right">{formatCurrency(productPrice)}</td>
                        <td className="py-4 text-right font-semibold">{formatCurrency(subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {inventoryCheck.length > 0 && (
            <div className="rounded-2xl border border-border p-6 bg-card shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <span className="material-symbols-outlined text-blue-500">inventory_2</span>
                  Đối chiếu nguyên liệu Bếp Trung Tâm
                </h3>
                {!isEnoughStock && (
                  <span className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-200 rounded-full text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">warning</span> Cảnh báo: Thiếu NVL
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 font-semibold">Tên nguyên liệu</th>
                      <th className="pb-3 font-semibold text-right">Tồn kho hiện tại</th>
                      <th className="pb-3 font-semibold text-right">SL Cần dùng</th>
                      <th className="pb-3 font-semibold text-right">Còn lại dự kiến</th>
                      <th className="pb-3 font-semibold text-center">Trạng thái</th>
                    </tr>
                  </thead>
                    <tbody className="text-sm text-foreground">
                    {inventoryCheck.map((calc, idx) => (
                      <tr key={idx} className="border-b border-border last:border-0">
                        <td className="py-3 font-medium">{calc.ingredientName}</td>
                        <td className="py-3 text-right text-gray-500">
                          {calc.currentStock.toFixed(2)} {calc.unit}
                        </td>
                        <td className="py-3 text-right font-bold text-amber-500">
                          - {calc.requiredQty.toFixed(2)} {calc.unit}
                        </td>
                        <td className={`py-3 text-right font-bold ${calc.isEnough ? 'text-green-600' : 'text-red-500'}`}>
                          {calc.remainingStock.toFixed(2)} {calc.unit}
                        </td>
                        <td className="py-3 text-center">
                          {calc.isEnough ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-600">
                              <span className="material-symbols-outlined text-[14px]">check</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 text-red-600">
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">

          <div className="rounded-2xl border border-border p-6 bg-card shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-muted-foreground">
              Thông tin cửa hàng
            </h3>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-xl">store</span>
              </div>
              <div>
                <p className="font-bold text-lg text-foreground">
                  {(order.storeId as any)?.storeName || 'Store Unknown'}
                </p>
                <p className="text-sm mt-1 text-muted-foreground">
                  Mã: {typeof order.storeId === 'string' ? order.storeId : (order.storeId as any)?._id}
                </p>
              </div>
            </div>

            <div className="h-px w-full my-4 bg-border"></div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngày giao dự kiến:</span>
                <span className="font-medium text-foreground">
                  {formatDate(order.requestedDeliveryDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Người tạo:</span>
                <span className="font-medium text-foreground">
                  {(order.createdBy as any)?.fullName || 'Hệ thống'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border p-6 bg-card shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-muted-foreground">
              Thanh toán
            </h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tạm tính:</span>
                <span className="text-foreground">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phí vận chuyển:</span>
                <span className="text-foreground">{formatCurrency(0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hình thức thanh toán:</span>
                <span className="text-foreground">
                  {order.paymentMethod === 'Wallet'
                    ? 'Ví cửa hàng (đã trừ khi tạo đơn nếu đủ điều kiện)'
                    : order.paymentMethod || 'Khác'}
                </span>
              </div>
            </div>

            <div className="h-px w-full my-4 border-dashed bg-border"></div>

            <div className="flex justify-between items-end">
              <span className="font-bold text-foreground">Tổng cộng:</span>
              <span className="text-2xl font-bold text-amber-500">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground">
              Theo thiết kế hiện tại, việc trừ ví hoặc thanh toán PayOS được xử lý khi tạo đơn
              (paymentMethod) hoặc qua các hệ thống khác. Màn hình này chỉ hiển thị thông tin, không thực hiện thanh toán lại.
            </p>
          </div>

          {/* SỬA: DÙNG CANCELLATION REASON THAY CHO NOTES */}
          {order.status === 'Cancelled' && (order as any).cancellationReason && (
            <div className="rounded-2xl border border-border p-6 border-l-4 border-l-red-500 bg-destructive/10">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-red-600 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span> Lý do hủy
              </h3>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {(order as any).cancellationReason}
              </p>
            </div>
          )}

          {/* VẪN GIỮ LẠI MỤC GHI CHÚ BÌNH THƯỜNG CHO CỬA HÀNG */}
          {order.notes && (
            <div className="rounded-2xl border border-border p-6 border-l-4 border-l-amber-500 bg-card">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-amber-600">
                Ghi chú đơn hàng
              </h3>
              <p className="text-sm italic text-foreground">
                "{order.notes}"
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-border p-6 bg-card shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-muted-foreground">
              Feedback từ cửa hàng
            </h3>
            {feedbackLoading ? (
              <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                <div className="h-10 rounded-lg bg-muted animate-pulse w-32" />
                <div className="h-20 rounded-lg bg-muted animate-pulse" />
              </div>
            ) : (
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-foreground text-xs font-semibold">
                  Đánh giá
                </label>
                <div className="mt-2">
                  <StarRating value={feedbackRating} onChange={setFeedbackRating} size="lg" />
                </div>
              </div>
              <div>
                <label className="text-foreground text-xs font-semibold">
                  Nội dung
                </label>
                <textarea
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                  placeholder="Ghi nhận chất lượng hàng, thiếu/hư hỏng..."
                />
              </div>
              <button
                type="button"
                onClick={handleSaveFeedback}
                disabled={isFeedbackSaving || !feedbackContent.trim()}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary"
              >
                {isFeedbackSaving ? 'Đang lưu...' : hasFeedback ? 'Cập nhật feedback' : 'Gửi feedback'}
              </button>
            </div>
            )}
          </div>

        </div>
      </div>

      {isApproveConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
          <div className="w-full max-w-md rounded-[24px] border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-card text-card-foreground">
            <div className="p-6 border-b border-border flex items-start gap-4 bg-primary/5">
              <div className="p-3 bg-primary/20 text-primary rounded-2xl flex-shrink-0">
                <span className="material-symbols-outlined text-2xl">check_circle</span>
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                  Duyệt đơn hàng?
                </h3>
                <p className="text-xs mt-1 font-medium text-muted-foreground">
                  Bạn xác nhận duyệt đơn hàng này? Đơn sẽ chuyển sang trạng thái Đã duyệt và có thể được đưa vào chuyến giao.
                </p>
              </div>
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-3 bg-card">
              <button
                onClick={() => setIsApproveConfirmOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                Hủy
              </button>
              <button
                onClick={() => handleApproveOrder()}
                disabled={!isEnoughStock || isApproving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-blue-500/30 flex items-center gap-2"
              >
                {isApproving ? (
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">check</span>
                )}
                Xác nhận duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
          <div className="w-full max-w-md rounded-[24px] border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-card text-card-foreground">
            <div className="p-6 border-b border-border flex items-start gap-4 bg-destructive/10">
              <div className="p-3 bg-red-500/20 text-red-500 rounded-2xl flex-shrink-0">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                  Từ chối đơn hàng?
                </h3>
                <p className="text-xs mt-1 font-medium text-muted-foreground">
                  Hành động này sẽ hủy đơn hàng và hoàn tiền (nếu có). Bạn không thể hoàn tác thao tác này.
                </p>
              </div>
            </div>

            <div className="p-6">
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-foreground">
                Lý do từ chối <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do... (Ví dụ: Hết nguyên liệu, Cửa hàng đặt sai số lượng...)"
                className="w-full p-4 rounded-xl border-2 border-border bg-background text-foreground focus:ring-4 focus:border-destructive/50 focus:ring-destructive/20 outline-none transition-all resize-none h-28 text-sm placeholder:text-muted-foreground"
              />
            </div>

            <div className="p-5 border-t border-border flex justify-end gap-3 bg-card">
              <button
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectReason('');
                }}
                className="px-5 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleRejectOrder}
                disabled={isRejecting || !rejectReason.trim()}
                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-red-500/30 active:scale-95 flex items-center gap-2"
              >
                {isRejecting ? (
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                )}
                Chốt Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrderDetail;