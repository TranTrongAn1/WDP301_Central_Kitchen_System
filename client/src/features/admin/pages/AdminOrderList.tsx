import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderApi, type Order as OrderType } from '@/api/OrderApi';
import { useThemeStore } from '@/shared/zustand/themeStore';
import {
  Search, ChevronRight, Package, Store,
  ArrowUpDown, Loader2, Calendar, X
} from 'lucide-react';

const ALL_STATUSES = [
  { value: 'ALL', label: 'Tất cả', color: 'bg-gray-500' },
  { value: 'Awaiting_Payment', label: 'Chờ thanh toán', color: 'bg-gray-500' },
  { value: 'Pending', label: 'Chờ duyệt', color: 'bg-amber-500' },
  { value: 'Approved', label: 'Đã duyệt', color: 'bg-blue-500' },
  { value: 'Transferred_To_Kitchen', label: 'Đã chuyển bếp', color: 'bg-indigo-500' },
  { value: 'Ready_For_Shipping', label: 'Sẵn sàng giao', color: 'bg-emerald-500' },
  { value: 'In_Transit', label: 'Đang giao', color: 'bg-purple-500' },
  { value: 'Received', label: 'Đã nhận', color: 'bg-green-500' },
  { value: 'Cancelled', label: 'Đã hủy', color: 'bg-red-500' },
];

export default function AdminOrderList() {
  const navigate = useNavigate();
  const { darkMode } = useThemeStore();

  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy] = useState<'createdAt' | 'totalAmount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await OrderApi.getAllOrders(statusFilter === 'ALL' ? {} : { status: statusFilter });
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });

  const getStoreName = (order: OrderType) => {
    if (typeof order.storeId === 'object' && order.storeId?.storeName) return order.storeId.storeName;
    return '—';
  };

  const getStatusConfig = (status: string) => {
    const s = (status || '').trim();
    const configMap: Record<string, { bg: string; text: string; label: string }> = {
      Awaiting_Payment: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Chờ thanh toán' },
      Pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', label: 'Chờ duyệt' },
      Approved: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', label: 'Đã duyệt' },
      Transferred_To_Kitchen: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', label: 'Đã chuyển bếp' },
      Ready_For_Shipping: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', label: 'Sẵn sàng giao' },
      In_Transit: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', label: 'Đang giao' },
      Received: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', label: 'Đã nhận' },
      Cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', label: 'Đã hủy' },
    };
    return configMap[s] || { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: s };
  };

  const filteredOrders = orders
    .filter(order => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        order.orderCode?.toLowerCase().includes(term) ||
        getStoreName(order).toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'createdAt') {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        return sortOrder === 'asc'
          ? (a.totalAmount || 0) - (b.totalAmount || 0)
          : (b.totalAmount || 0) - (a.totalAmount || 0);
      }
    });

  const statusCounts = ALL_STATUSES.reduce((acc, s) => {
    if (s.value === 'ALL') {
      acc[s.value] = orders.length;
    } else {
      acc[s.value] = orders.filter(o => o.status === s.value).length;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`min-h-screen p-6 ${darkMode ? 'bg-[#12121a]' : 'bg-gradient-to-br from-gray-50 to-orange-50/30'}`}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Quản lý đơn hàng
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        {ALL_STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`p-4 rounded-xl border transition-all ${
              statusFilter === s.value
                ? darkMode
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-amber-50 border-amber-300'
                : darkMode
                  ? 'bg-card border-border hover:border-border/80'
                  : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${s.color}`}></div>
              <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {s.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {statusCounts[s.value] || 0}
            </p>
          </button>
        ))}
      </div>

      {/* Search and Sort */}
      <div className={`rounded-2xl border p-4 mb-6 ${darkMode ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo mã đơn, cửa hàng..."
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm ${
                darkMode
                  ? 'bg-muted border-border text-white placeholder-muted-foreground'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
              } focus:ring-2 focus:ring-amber-500/20 outline-none`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            }}
            className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${
              darkMode
                ? 'bg-muted border-border text-foreground hover:bg-muted/80'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ArrowUpDown className="w-4 h-4" />
            {sortBy === 'createdAt' ? 'Ngày tạo' : 'Giá trị'} {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className={`text-center py-20 rounded-2xl border ${darkMode ? 'bg-muted border-border' : 'bg-white border-gray-200'}`}>
          <Package className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`text-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Không tìm thấy đơn hàng nào
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            return (
              <div
                key={order._id}
                className={`rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md ${
                  darkMode
                    ? 'bg-card border-border hover:border-border/80'
                    : 'bg-white border-gray-200 hover:border-amber-300'
                }`}
                onClick={() => navigate(`/admin/orders/${order._id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`font-mono font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {order.orderCode}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Store className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {getStoreName(order)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {order.items?.length || 0} sản phẩm
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        {formatCurrency(order.totalAmount || 0)}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {order.paymentMethod === 'Wallet' ? 'Ví' : order.paymentMethod === 'PayOS' ? 'PayOS' : order.paymentMethod || '—'}
                      </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
