import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OrderApi, type Order as OrderType } from '@/api/OrderApi';
import { invoiceApi, type Invoice } from '@/api/InvoiceApi';
import { feedbackApi } from '@/api/FeedbackApi';
import { useThemeStore } from '@/shared/zustand/themeStore';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Package, Store, Clock, User, MapPin, Phone,
  CreditCard, FileText, MessageSquare, CheckCircle, XCircle,
  AlertTriangle, TruckIcon, Calendar, Banknote,
  Tag, Info, Star
} from 'lucide-react';

interface OrderItemExtended {
  productId: { _id: string; name: string; sku?: string; price?: number; image?: string } | string;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
  _id?: string;
}

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { darkMode } = useThemeStore();

  const [order, setOrder] = useState<OrderType | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [feedback, setFeedback] = useState<{ rating: number; content: string; tags?: string[]; images?: string[] } | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const orderData = await OrderApi.getOrderById(id);
        setOrder(orderData);
        const inv = await invoiceApi.getFirstByOrderId(id).catch(() => null);
        setInvoice(inv);
      } catch (err) {
        console.error(err);
        setError('Không thể tải dữ liệu đơn hàng.');
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
        setFeedback({ rating: fb.rating, content: fb.content, tags: (fb as any).tags, images: (fb as any).images });
      } else {
        setFeedback(null);
      }
    }).catch(() => {
      if (!cancelled) setFeedback(null);
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
    } catch {
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
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(res.message || 'Lỗi khi duyệt đơn hàng');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err?.response?.data?.message || err?.message || 'Lỗi khi duyệt đơn hàng');
    } finally {
      setIsApproving(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  const getStatusConfig = (status: string) => {
    const s = (status || '').trim();
    const configMap: Record<string, { bg: string; text: string; border: string; icon: string; label: string }> = {
      Awaiting_Payment: { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-200', icon: 'schedule', label: 'Chờ thanh toán' },
      Payment_Failed: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-200', icon: 'error', label: 'Thanh toán thất bại' },
      Pending: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-200', icon: 'pending', label: 'Chờ trung tâm duyệt' },
      Approved: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-200', icon: 'verified', label: 'Đã duyệt' },
      Transferred_To_Kitchen: { bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-200', icon: 'restaurant', label: 'Đã chuyển bếp' },
      Ready_For_Shipping: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-200', icon: 'inventory', label: 'Sẵn sàng giao' },
      In_Transit: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-200', icon: 'local_shipping', label: 'Đang giao hàng' },
      Received: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-200', icon: 'check_circle', label: 'Đã nhận hàng' },
      Cancelled: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-200', icon: 'cancel', label: 'Đã hủy' },
    };
    return configMap[s] || { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', icon: 'help', label: s };
  };

  const getProductName = (item: OrderItemExtended) => {
    if (typeof item.productId === 'object' && item.productId?.name) return item.productId.name;
    return 'Sản phẩm không xác định';
  };

  const getProductPrice = (item: OrderItemExtended) => {
    if (typeof item.productId === 'object' && item.productId?.price) return item.productId.price;
    return item.unitPrice ?? 0;
  };

  const getStoreName = () => {
    if (!order) return '—';
    if (typeof order.storeId === 'object' && order.storeId?.storeName) return order.storeId.storeName;
    return 'Cửa hàng không xác định';
  };

  const getStoreAddress = () => {
    if (!order) return '';
    if (typeof order.storeId === 'object' && order.storeId?.address) return order.storeId.address;
    return '';
  };

  const getStoreCode = () => {
    if (!order) return '';
    if (typeof order.storeId === 'object' && order.storeId?.storeCode) return order.storeId.storeCode;
    return '';
  };

  const getCreatorName = () => {
    if (!order) return '—';
    if (typeof order.createdBy === 'object' && order.createdBy?.fullName) return order.createdBy.fullName;
    return 'Hệ thống';
  };

  if (loading && !order) return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium">Đang tải chi tiết đơn hàng...</p>
      </div>
    </div>
  );

  if (error || !order) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <AlertTriangle className="w-12 h-12 text-red-500" />
      <p className="text-red-500 text-lg font-medium">{error || 'Không tìm thấy đơn hàng'}</p>
      <button onClick={() => navigate(-1)} className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors">
        Quay lại
      </button>
    </div>
  );

  const orderAmount = order.totalAmount ?? 0;
  const shippingFee = invoice ? (invoice.subtotal ?? 0) - orderAmount : 0;
  const invoiceTotal = invoice?.totalAmount ?? invoice?.subtotal ?? orderAmount;
  const totalPayable = invoiceTotal;

  const statusConfig = getStatusConfig(order.status);

  return (
    <div className={`min-h-screen p-6 ${!darkMode ? 'bg-gradient-to-br from-gray-50 to-orange-50/30' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className={`p-2.5 rounded-xl transition-all ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-white hover:bg-gray-100 text-gray-600 shadow-sm'}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Chi tiết đơn hàng
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                <span className="material-symbols-outlined text-[14px] align-middle mr-1">{statusConfig.icon}</span>
                {statusConfig.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Mã đơn: <span className="font-mono font-semibold">{order.orderCode}</span> • Ngày đặt: {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mb-6">
        {order.status === 'Pending' && (
          <>
            <button
              onClick={() => setIsRejectModalOpen(true)}
              className="px-4 py-2.5 bg-red-500/10 text-red-600 border border-red-200 rounded-xl font-semibold text-sm transition-all hover:bg-red-500/20 flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Từ chối
            </button>
            <button
              onClick={() => setIsApproveConfirmOpen(true)}
              disabled={isApproving}
              className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-orange-900/30"
            >
              <CheckCircle className="w-4 h-4" />
              {isApproving ? 'Đang duyệt...' : 'Duyệt đơn'}
            </button>
          </>
        )}
        {(order.status === 'Approved' || order.status === 'Transferred_To_Kitchen') && (
            <div className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 ${darkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
            <Package className="w-4 h-4" />
            Đơn đã chuyển bếp chuẩn bị
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="xl:col-span-2 space-y-6">
          {/* Products List */}
          <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                <Package className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
              </div>
              <div>
                <h2 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>Danh sách bánh yêu cầu</h2>
                <p className="text-sm text-muted-foreground">{order.items?.length || 0} sản phẩm</p>
              </div>
            </div>

            <div className="space-y-4">
              {order.items?.map((item: OrderItemExtended, index: number) => {
                const productName = getProductName(item);
                const productPrice = getProductPrice(item);
                const subtotal = item.subtotal ?? (productPrice * item.quantity);

                return (
                  <div
                    key={item._id || index}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${darkMode ? 'bg-muted hover:bg-muted/80' : 'bg-gray-50 hover:bg-gray-100'}`}
                  >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-sm`}>
                      {typeof item.productId === 'object' && item.productId?.image ? (
                        <img src={item.productId.image} alt={productName} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Package className={`w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{productName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(productPrice)} × {item.quantity}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className={`font-bold text-lg ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        {formatCurrency(subtotal)}
                      </p>
                      <p className="text-xs text-muted-foreground">Thành tiền</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tiền hàng:</span>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{formatCurrency(orderAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phí vận chuyển:</span>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{formatCurrency(Math.max(shippingFee, 0))}</span>
                </div>
                {invoice && (invoice as any).taxAmount !== undefined && (invoice as any).taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Thuế:</span>
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{formatCurrency((invoice as any).taxAmount)}</span>
                  </div>
                )}
              </div>
              <div className={`flex justify-between items-center mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Tổng thanh toán:</span>
                <span className={`text-2xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                  {formatCurrency(totalPayable)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment & Invoice */}
          <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-green-500/10' : 'bg-green-50'}`}>
                <CreditCard className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              </div>
              <div>
                <h2 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>Thông tin thanh toán</h2>
                <p className="text-sm text-muted-foreground">Hóa đơn và phương thức</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phương thức</label>
                  <div className={`mt-2 px-4 py-3 rounded-xl ${darkMode ? 'bg-muted' : 'bg-gray-50'} flex items-center gap-3`}>
                    {order.paymentMethod === 'Wallet' ? (
                      <>
                        <Banknote className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Ví cửa hàng</span>
                      </>
                    ) : order.paymentMethod === 'PayOS' ? (
                      <>
                        <CreditCard className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>PayOS</span>
                      </>
                    ) : (
                      <>
                        <Banknote className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{order.paymentMethod || 'Khác'}</span>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ngày giao dự kiến</label>
                  <div className={`mt-2 px-4 py-3 rounded-xl ${darkMode ? 'bg-muted' : 'bg-gray-50'} flex items-center gap-3`}>
                    <Calendar className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`} />
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {order.requestedDeliveryDate ? formatDate(order.requestedDeliveryDate) : 'Chưa xác định'}
                    </span>
                  </div>
                </div>
              </div>

              {invoice && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mã hóa đơn</label>
                    <div className={`mt-2 px-4 py-3 rounded-xl ${darkMode ? 'bg-muted' : 'bg-gray-50'} flex items-center gap-3`}>
                      <FileText className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`} />
                      <span className={`font-mono font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {invoice.invoiceNumber || invoice._id?.slice(-8).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng thái thanh toán</label>
                    <div className="mt-2">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        invoice.paymentStatus === 'Paid' ? 'bg-green-500/10 text-green-600 border-green-200' :
                        invoice.paymentStatus === 'Pending' ? 'bg-amber-500/10 text-amber-600 border-amber-200' :
                        'bg-gray-500/10 text-gray-600 border-gray-200'
                      }`}>
                        {invoice.paymentStatus === 'Paid' ? 'Đã thanh toán' :
                         invoice.paymentStatus === 'Pending' ? 'Chờ thanh toán' :
                         invoice.paymentStatus || 'Chưa xác định'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {order.notes && (
              <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Info className={`w-4 h-4 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ghi chú</label>
                </div>
                <p className={`italic ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>"{order.notes}"</p>
              </div>
            )}

            {/* Cancellation Reason */}
            {order.status === 'Cancelled' && (order as any).cancellationReason && (
              <div className={`mt-6 pt-6 border-t border-l-4 border-l-red-500 ${darkMode ? 'border-gray-700 bg-red-500/5' : 'border-gray-200 bg-red-50'} p-4 rounded-r-xl`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <label className="text-sm font-bold text-red-600">Lý do hủy đơn</label>
                </div>
                <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                  {(order as any).cancellationReason}
                </p>
              </div>
            )}
          </div>

          {/* Feedback Section */}
          <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-primary/15' : 'bg-orange-50'}`}>
                <MessageSquare className={`w-5 h-5 ${darkMode ? 'text-primary' : 'text-orange-600'}`} />
              </div>
              <div>
                <h2 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>Phản hồi từ cửa hàng</h2>
                <p className="text-sm text-muted-foreground">Đánh giá và nhận xét của cửa hàng</p>
              </div>
            </div>

            {feedbackLoading ? (
              <div className="space-y-3">
                <div className="h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            ) : feedback ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Đánh giá:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`w-5 h-5 ${star <= feedback.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-300'}`} />
                    ))}
                    <span className={`ml-2 font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                      {feedback.rating}/5
                    </span>
                  </div>
                </div>

                {feedback.content && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nội dung</label>
                    <p className={`mt-2 p-4 rounded-xl ${darkMode ? 'bg-muted text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                      "{feedback.content}"
                    </p>
                  </div>
                )}

                {feedback.tags && feedback.tags.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {feedback.tags.map((tag, index) => {
                        const isNegative = ['Vận chuyển thiếu hàng', 'Hàng hư hỏng'].includes(tag);
                        return (
                          <span
                            key={index}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                              isNegative
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : 'bg-green-50 text-green-600 border-green-200'
                            }`}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có phản hồi từ cửa hàng</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Info Cards */}
        <div className="space-y-6">
          {/* Store Info */}
          <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-muted' : 'bg-orange-50'}`}>
                <Store className={`w-5 h-5 ${darkMode ? 'text-primary' : 'text-orange-600'}`} />
              </div>
              <div>
                <h2 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Cửa hàng</h2>
                <p className="text-xs text-muted-foreground">Thông tin cửa hàng đặt</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{getStoreName()}</h3>
                {getStoreCode() && (
                  <p className="text-sm text-muted-foreground font-mono">Mã: {getStoreCode()}</p>
                )}
              </div>

              {getStoreAddress() && (
                <div className="flex items-start gap-3">
                  <MapPin className={`w-4 h-4 mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{getStoreAddress()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Info */}
          <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                <Clock className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`} />
              </div>
              <div>
                <h2 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Thông tin đơn</h2>
                <p className="text-xs text-muted-foreground">Chi tiết đơn hàng</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" /> Người tạo
                </span>
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {getCreatorName()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Ngày đặt
                </span>
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {formatDate(order.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <TruckIcon className="w-4 h-4" /> Ngày giao
                </span>
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {order.requestedDeliveryDate ? new Date(order.requestedDeliveryDate).toLocaleDateString('vi-VN') : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Package className="w-4 h-4" /> Số sản phẩm
                </span>
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {order.items?.length || 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Mã đơn
                </span>
                <span className={`text-sm font-mono font-medium ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                  {order.orderCode}
                </span>
              </div>
            </div>
          </div>

          {/* Recipient Info */}
          {(order.recipientName || order.recipientPhone || order.address) && (
            <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-green-500/10' : 'bg-green-50'}`}>
                  <User className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                </div>
                <div>
                  <h2 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Người nhận</h2>
                  <p className="text-xs text-muted-foreground">Thông tin giao hàng</p>
                </div>
              </div>

              <div className="space-y-3">
                {order.recipientName && (
                  <div className="flex items-center gap-3">
                    <User className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{order.recipientName}</span>
                  </div>
                )}
                {order.recipientPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{order.recipientPhone}</span>
                  </div>
                )}
                {order.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className={`w-4 h-4 mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{order.address}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {isApproveConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
            <div className={`p-6 border-b ${darkMode ? 'border-border' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/20 text-emerald-500 rounded-xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Duyệt đơn hàng?</h3>
                  <p className="text-sm text-muted-foreground">Đơn sẽ chuyển sang trạng thái Đã duyệt và có thể được đưa vào chuyến giao.</p>
                </div>
              </div>
            </div>
            <div className="p-5 flex justify-end gap-3">
              <button
                onClick={() => setIsApproveConfirmOpen(false)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                Hủy
              </button>
              <button
                onClick={handleApproveOrder}
                disabled={isApproving}
                className="px-6 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-orange-900/30"
              >
                {isApproving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Xác nhận duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
            <div className={`p-6 border-b ${darkMode ? 'border-border' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/20 text-red-500 rounded-xl">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Từ chối đơn hàng?</h3>
                  <p className="text-sm text-muted-foreground">Hành động này sẽ hủy đơn hàng. Bạn không thể hoàn tác.</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Lý do từ chối <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                className={`w-full p-4 rounded-xl border text-sm resize-none h-28 ${
                  darkMode
                    ? 'bg-muted border-border text-white focus:border-red-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-red-500'
                } focus:ring-2 focus:ring-red-500/20 outline-none`}
              />
            </div>
            <div className="p-5 flex justify-end gap-3 border-t dark:border-border">
              <button
                onClick={() => { setIsRejectModalOpen(false); setRejectReason(''); }}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleRejectOrder}
                disabled={isRejecting || !rejectReason.trim()}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isRejecting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
