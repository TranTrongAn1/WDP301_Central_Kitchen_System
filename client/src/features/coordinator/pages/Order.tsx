import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { OrderApi, type Order as OrderType } from '@/api/OrderApi';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';

const ITEMS_PER_PAGE = 9;

const Order = () => {
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // State Pagination & Filter
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('All'); // State lưu trạng thái lọc

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await OrderApi.getAllOrders();
        // Sort mới nhất lên đầu
        const sortedData = data.sort((a: OrderType, b: OrderType) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(Array.isArray(sortedData) ? sortedData : []);
      } catch (err) {
        setError('Không thể tải danh sách đơn hàng');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // --- LOGIC LỌC (FILTER) ---
  const filteredOrders = filterStatus === 'All' 
    ? orders 
    : orders.filter(order => order.status === filterStatus);

  // Khi thay đổi bộ lọc, tự động reset về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  // --- LOGIC PHÂN TRANG (Dùng danh sách ĐÃ LỌC) ---
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentOrders = filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Logic tạo danh sách trang
  const getPageNumbers = () => {
    const pages = [];
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

  // Helper styles
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'Approved': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'In_Transit': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'Received': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'Cancelled': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) return <div className="flex h-64 items-center justify-center text-gray-500"><span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>Đang tải dữ liệu...</div>;
  if (error) return <div className="text-red-500 text-center p-10">{error}</div>;

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <span className="text-sm text-muted-foreground">
          {filteredOrders.length} đơn hàng
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Trạng thái:</span>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={cn(
                "h-10 min-w-[200px] pl-4 pr-10 py-2 rounded-xl border border-border bg-card text-card-foreground text-sm font-medium transition-colors cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:bg-secondary"
              )}
            >
              <option value="All">Tất cả trạng thái</option>
              <option value="Pending">Chờ duyệt (Pending)</option>
              <option value="Approved">Đã duyệt (Approved)</option>
              <option value="In_Transit">Đang giao (In_Transit)</option>
              <option value="Received">Đã nhận (Received)</option>
              <option value="Cancelled">Đã hủy (Cancelled)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid Cards */}
      {filteredOrders.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50">
          <span className="material-symbols-outlined text-5xl mb-3 text-muted-foreground">search_off</span>
          <p className="text-sm font-medium text-muted-foreground">Không có đơn hàng nào khớp với bộ lọc.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
          {currentOrders.map((order) => (
            <div
              key={order._id}
              className={cn(
                "group relative rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/20"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wider mb-1 text-muted-foreground">Mã đơn hàng</span>
                  <span className="text-base font-bold font-mono text-card-foreground">{order.orderCode}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(order.status)}`}>{order.status}</span>
              </div>
              
              <div className="h-px w-full mb-4 bg-border" />

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><span className="material-symbols-outlined text-[18px]">calendar_clock</span>Ngày giao:</div>
                  <span className="font-medium text-card-foreground">{formatDate(order.requestedDeliveryDate)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><span className="material-symbols-outlined text-[18px]">store</span>Cửa hàng:</div>
                  <span className="font-medium truncate max-w-[150px] text-card-foreground">
                    {typeof order.storeId === 'object' && order.storeId?.storeName
                      ? order.storeId.storeName
                      : typeof order.storeId === 'string'
                        ? order.storeId.slice(-6).toUpperCase()
                        : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><span className="material-symbols-outlined text-[18px]">inventory_2</span>Số lượng:</div>
                  <span className="font-medium text-card-foreground">{order.items?.length || 0}</span>
                </div>
              </div>

              <div className="h-px w-full my-4 bg-border" />

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Tổng giá trị</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(order.totalAmount)}</span>
                </div>
                <button
                  onClick={() => navigate(`/coordinator/orders/${order._id}`)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-secondary text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- PAGINATION --- */}
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 mt-4 select-none">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            Back
          </button>
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => {
              if (page === "...") return <span key={`dots-${index}`} className="px-2 text-muted-foreground">...</span>;
              const isActive = currentPage === page;
              return (
                <button
                  key={index}
                  onClick={() => handlePageChange(page as number)}
                  className={cn(
                    "min-w-[36px] h-9 px-3 rounded-lg text-sm font-semibold transition-all",
                    isActive ? "bg-primary text-primary-foreground shadow-md" : "bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                  )}
                >
                  {page}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
          >
            Next
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Order;