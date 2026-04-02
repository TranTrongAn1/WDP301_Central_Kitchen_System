import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OrderApi, type Order as OrderType } from '@/api/OrderApi';
import { invoiceApi, type Invoice } from '@/api/InvoiceApi';
import { feedbackApi } from '@/api/FeedbackApi';
import { StarRating } from '@/shared/components/StarRating';
import toast from 'react-hot-toast';
import { productApi, } from '@/api/ProductApi';
import { ingredientApi, type Ingredient } from '@/api/IngredientApi';
const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderType | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

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
  const [ingredientSummary, setIngredientSummary] = useState<{ 
        name: string; 
        unit: string; 
        totalQty: number; 
        inStock: number; 
        reserved: number; 
        available: number 
    }[]>([]);
useEffect(() => {
  const fetchAllData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      // 1. Lấy đơn hàng và toàn bộ sản phẩm cùng lúc
      const [orderRes, productsRes, invRes] = await Promise.all([
        OrderApi.getOrderById(id),
        productApi.getAll(),
        invoiceApi.getFirstByOrderId(id).catch(() => null)
      ]);

      const allProducts = unwrapArrayData<any>(productsRes);

      // 2. Duyệt qua từng item của đơn hàng, tìm ảnh tương ứng trong allProducts
      if (orderRes && orderRes.items) {
        const itemsWithImages = orderRes.items.map((item: any) => {
          // Lấy ID sản phẩm (phòng trường hợp nó là string hoặc object)
          const targetId = item.productId?._id ?? item.productId;
          // Tìm sản phẩm gốc trong danh sách 22 món trả về
          const productInfo = allProducts.find(p => p._id === targetId);
          
          return {
            ...item,
            // Ép dữ liệu productId phải chứa field image từ sản phẩm gốc
            productId: productInfo || item.productId 
          };
        });
        
        // Cập nhật lại state order với items đã có đủ ảnh
        setOrder({ ...orderRes, items: itemsWithImages });
      } else {
        setOrder(orderRes);
      }

      setInvoice(invRes);
    } catch (err) {
      console.error("Lỗi fetch:", err);
      setError('Lỗi tải dữ liệu.');
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
    if (order.status !== 'Pending') return;

    try {
      setIsApproving(true);
      const res = await OrderApi.approveOrder(id);

      if (res.success) {
        toast.success(res.message || 'Đã duyệt đơn hàng thành công.');
        setIsApproveConfirmOpen(false);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error(res.message || 'Lỗi khi duyệt đơn hàng');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const message =
        err?.response?.data?.message ||
        err?.message ||
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
    } catch {
      toast.error('Không thể lưu feedback, vui lòng thử lại.');
    } finally {
      setIsFeedbackSaving(false);
    }
  };

  // Các handler thanh toán trực tiếp bằng ví/PayOS/cash đã được loại bỏ khỏi UI trong MVP web.

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const getInvoiceShippingFee = (
    inv: Invoice | null,
    orderAmount: number
  ): number | null => {
    // Backend gộp shipping vào invoice.subtotal: subtotal = totalAmount(order) + shippingCost
    if (!inv || typeof inv.subtotal !== 'number') return null;
    const shipping = inv.subtotal - orderAmount;
    return shipping >= 0 ? shipping : 0;
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  const getStatusStyle = (status: string) => {
    const s = (status || '').trim();
    switch (s) {
      case 'Pending':
        return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'Approved':
        return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'Transferred_To_Kitchen':
        return 'bg-indigo-500/10 text-indigo-600 border-indigo-200';
      case 'Ready_For_Shipping':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'In_Transit':
      case 'In Transit':
        return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'Shipped':
        return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'Received':
        return 'bg-green-500/10 text-green-600 border-green-200';
      case 'Cancelled':
        return 'bg-red-500/10 text-red-600 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getOrderStatusLabel = (status: string) => {
    const normalized = (status || '').trim();
    const map: Record<string, string> = {
      Pending: 'Chờ trung tâm duyệt',
      Approved: 'Đã duyệt',
      Transferred_To_Kitchen: 'Đã chuyển sang bếp chuẩn bị',
      Ready_For_Shipping: 'Trung tâm đã chuẩn bị xong – đang chờ giao',
      In_Transit: 'Đang giao đến cửa hàng',
      'In Transit': 'Đang giao đến cửa hàng',
      Received: 'Cửa hàng đã nhận',
      Cancelled: 'Đã hủy',
      Shipped: 'Đã giao',
    };
    return map[normalized] ?? map[normalized.replace(/\s+/g, '_')] ?? 'Trạng thái hệ thống khác';
  };
const unwrapArrayData = <T,>(res: unknown): T[] => {
      if (Array.isArray(res)) return res as T[];
      if (res && typeof res === 'object' && 'data' in res) {
          const data = (res as { data?: unknown }).data;
          if (Array.isArray(data)) return data as T[];
      }
      return [];
  };

useEffect(() => {
    if (!order || !order.items || order.items.length === 0) {
      setIngredientSummary([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const [productsRes, ingredientsRes] = await Promise.all([
          productApi.getAll(),
          ingredientApi.getAll(),
        ]);
        const products = unwrapArrayData<any>(productsRes);
        const ingredients = unwrapArrayData<Ingredient>(ingredientsRes);

        const ingMap: Record<string, any> = {};

        // Hàm phụ xử lý Recipe (Dùng để cộng dồn nguyên liệu)
        const processRecipe = (recipe: any[], multiplier: number) => {
          if (!recipe) return;
          recipe.forEach((rec: any) => {
            const ingId = String(rec.ingredientId?._id ?? rec.ingredientId ?? '');
            if (!ingId) return;
            const need = (rec.quantity || 0) * multiplier;
            const ing = ingredients.find((i) => i._id === ingId);

            if (!ingMap[ingId]) {
              const inStock = ing?.totalQuantity ?? 0;
              const reserved = ing?.reservedQuantity ?? 0;
              ingMap[ingId] = {
                name: ing?.ingredientName ?? 'N/A',
                unit: ing?.unit ?? '',
                totalQty: 0,
                inStock,
                reserved,
                available: inStock - reserved,
              };
            }
            ingMap[ingId].totalQty += need;
          });
        };

        // Duyệt từng item trong đơn hàng để đối chiếu
        order.items.forEach((item: any) => {
          const pid = item.productId?._id ?? item.productId;
          const product = products.find((p) => p._id === pid);
          const orderQty = item.quantity || 0;
          if (!product) return;

          // CASE 1: NẾU LÀ COMBO (Có bundleItems)
          if (product.bundleItems && Array.isArray(product.bundleItems) && product.bundleItems.length > 0) {
            product.bundleItems.forEach((bundle: any) => {
              const childId = bundle.childProductId?._id ?? bundle.childProductId;
              const childProduct = products.find((p) => p._id === childId);
              if (childProduct?.recipe) {
                // Công thức trừ kho: NL của bánh con * SL bánh con trong combo * SL combo khách đặt
                processRecipe(childProduct.recipe, (bundle.quantity || 1) * orderQty);
              }
            });
          }
          // CASE 2: NẾU LÀ SẢN PHẨM ĐƠN (Có recipe trực tiếp)
          else if (product.recipe) {
            processRecipe(product.recipe, orderQty);
          }
        });

        if (!cancelled) {
          setIngredientSummary(Object.values(ingMap));
        }
      } catch (err) {
        console.error('Lỗi đối chiếu kho:', err);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [order]);
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

  const orderAmount = order.totalAmount ?? 0;
  const shippingFee = getInvoiceShippingFee(invoice, orderAmount);
  const invoiceTotal =
    typeof invoice?.totalAmount === 'number'
      ? invoice.totalAmount
      : typeof invoice?.total === 'number'
        ? invoice.total
        : typeof invoice?.subtotal === 'number'
          ? invoice.subtotal
          : null;
  const totalPayable = invoiceTotal ?? (shippingFee != null ? orderAmount + shippingFee : orderAmount);
  const taxAmount =
    invoiceTotal != null && shippingFee != null
      ? Math.max(invoiceTotal - (orderAmount + shippingFee), 0)
      : null;

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
              disabled={isApproving}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 hover:text-white shadow-lg shadow-blue-500/30"
              onClick={() => setIsApproveConfirmOpen(true)}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isApproving ? 'progress_activity' : 'check'}
              </span>
              {isApproving ? 'Đang duyệt...' : 'Duyệt đơn'}
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

                  </tr>
                </thead>
                <tbody className="text-sm text-foreground">
{order.items.map((item: any, index: number) => {
                    const product = item.productId;
                    const imageUrl = product?.image || null;
                    const productName = product?.name || `Sản phẩm ${index + 1}`;

                    return (
                      <tr key={index} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                        <td className="py-4">
                          <div className="flex items-center gap-4">
                            {/* FIX: HIỂN THỊ ẢNH THẬT */}
                            <div className="w-12 h-12 rounded-xl overflow-hidden border bg-secondary flex items-center justify-center">
                              {imageUrl ? (
                                <img src={imageUrl} alt={productName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="material-symbols-outlined text-gray-400">image</span>
                              )}
                            </div>
                            <span className="font-bold text-gray-700">{productName}</span>
                          </div>
                        </td>
                        <td className="py-4 text-center font-bold text-amber-500 text-lg">{item.quantity}</td>
                        <td className="py-4 text-right font-black">{formatCurrency(item.subtotal || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {ingredientSummary.length > 0 && order.status === 'Pending' && (
              <div className="rounded-2xl border border-border p-6 bg-card shadow-sm">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
                      <span className="material-symbols-outlined text-emerald-500">inventory_2</span>
                      Kiểm tra Tồn kho Nguyên liệu
                  </h3>
                  
                  {/* Chỉ hiện cảnh báo nếu đơn hàng chưa duyệt (Pending) */}
                  {order.status === 'Pending' && ingredientSummary.some(ing => ing.available < ing.totalQty) && (
                      <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm font-semibold flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">warning</span>
                          Không đủ nguyên liệu khả dụng! Nếu duyệt đơn này, có thể bếp sẽ không sản xuất được.
                      </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                      {ingredientSummary.map((ing, idx) => {
                          const isShortage = order.status === 'Pending' && ing.available < ing.totalQty;
                          
                          return (
                              <div
                                  key={idx}
                                  className={`flex flex-col p-4 rounded-xl border transition-colors ${
                                      isShortage 
                                          ? 'border-red-500/50 bg-red-500/5' 
                                          : 'border-border bg-secondary/50'
                                  }`}
                              >
                                  <span className="font-bold text-sm mb-3 text-card-foreground">
                                      {ing.name}
                                  </span>
                                  <div className="space-y-2">
                                      <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Cần cho đơn này:</span>
                                          <span className="font-bold text-primary">
                                              {ing.totalQty.toFixed(2)} {ing.unit}
                                          </span>
                                      </div>
                                      <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Kho thực tế:</span>
                                          <span className="font-semibold text-card-foreground">
                                              {ing.inStock.toFixed(2)} {ing.unit}
                                          </span>
                                      </div>
                                      <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Đã giữ cho đơn khác:</span>
                                          <span className="font-semibold text-orange-500">
                                              {ing.reserved.toFixed(2)} {ing.unit}
                                          </span>
                                      </div>
                                  </div>
                                  <div className={`flex justify-between text-xs mt-3 pt-3 border-t ${isShortage ? 'border-red-500/20' : 'border-border'}`}>
                                      <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                                          Khả dụng (Còn lại):
                                      </span>
                                      <span className={`font-black ${isShortage ? 'text-red-600' : 'text-emerald-600'}`}>
                                          {ing.available.toFixed(2)} {ing.unit}
                                      </span>
                                  </div>
                              </div>
                          );
                      })}
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
                  {typeof order.storeId === 'object' && order.storeId?.storeName
                    ? order.storeId.storeName
                    : 'Cửa hàng không xác định'}
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
                  {typeof order.createdBy === 'object' && order.createdBy?.fullName
                    ? order.createdBy.fullName
                    : 'Hệ thống'}
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
                <span className="text-muted-foreground">Tiền hàng:</span>
                <span className="text-foreground">{formatCurrency(orderAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phí vận chuyển:</span>
                <span className="text-foreground">
                  {shippingFee == null ? '—' : formatCurrency(shippingFee)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Thuế (ước tính):</span>
                <span className="text-foreground">
                  {taxAmount == null ? '—' : formatCurrency(taxAmount)}
                </span>
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
              <span className="font-bold text-foreground">Tổng thanh toán (gồm thuế nếu có):</span>
              <span className="text-2xl font-bold text-amber-500">
                {formatCurrency(totalPayable)}
              </span>
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground">
              Theo thiết kế hiện tại, việc trừ ví hoặc thanh toán PayOS được xử lý khi tạo đơn
              (paymentMethod) hoặc qua các hệ thống khác. Màn hình này chỉ hiển thị thông tin, không thực hiện thanh toán lại.
            </p>
          </div>

          {/* Lý do hủy đơn từ backend */}
          {order.status === 'Cancelled' && (order as unknown as { cancellationReason?: string }).cancellationReason && (
            <div className="rounded-2xl border border-border p-6 border-l-4 border-l-red-500 bg-destructive/10">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-red-600 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span> Lý do hủy
              </h3>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {(order as unknown as { cancellationReason?: string }).cancellationReason}
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
                disabled={isApproving}
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