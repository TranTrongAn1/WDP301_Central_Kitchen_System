import React, { useEffect, useState } from 'react';
import { OrderApi, type Order as OrderType } from '../../../api/OrderAPi';
import { useThemeStore } from '@/shared/zustand/themeStore';
import { useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE = 9;

const Order = () => {
  const { darkMode } = useThemeStore();
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await OrderApi.getAllOrders();
        // Sort mới nhất lên đầu
        const sortedData = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(sortedData);
      } catch (err) {
        setError('Không thể tải danh sách đơn hàng');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // --- LOGIC PHÂN TRANG ---
  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentOrders = orders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Logic tạo danh sách trang: [1, 2, 3, '...', 12]
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
  // ------------------------

  // Helper styles
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'Approved': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'Shipped': return 'bg-purple-500/10 text-purple-600 border-purple-200';
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
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Danh sách đơn đặt hàng ({orders.length})
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Quản lý đơn hàng từ các cửa hàng</p>
        </div>
        {/* <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
          <span className="material-symbols-outlined text-[20px]">add</span> Tạo đơn thủ công
        </button> */}
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        {currentOrders.map((order) => (
          <div key={order._id} className={`group relative rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${darkMode ? 'bg-[#25252A] border-gray-700/50 hover:border-gray-600' : 'bg-white border-gray-100 shadow-sm hover:border-amber-200'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col">
                <span className={`text-xs font-semibold uppercase tracking-wider mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Mã đơn hàng</span>
                <span className={`text-base font-bold font-mono ${darkMode ? 'text-white' : 'text-gray-900'}`}>{order.orderCode}</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(order.status)}`}>{order.status}</span>
            </div>
            
            <div className={`h-px w-full mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}></div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}><span className="material-symbols-outlined text-[18px]">calendar_clock</span>Ngày giao:</div>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{formatDate(order.requestedDeliveryDate)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}><span className="material-symbols-outlined text-[18px]">store</span>Cửa hàng:</div>
                <span className={`font-medium truncate max-w-[150px] ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {typeof order.storeId === 'string' ? order.storeId.slice(-6).toUpperCase() : (order.storeId as any)?._id ? (order.storeId as any)._id.toString().slice(-6).toUpperCase() : 'N/A'}
                </span>
              </div>
               <div className="flex items-center justify-between text-sm">
                <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}><span className="material-symbols-outlined text-[18px]">inventory_2</span>Số lượng:</div>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{order.items?.length || 0}</span>
              </div>
            </div>

            <div className={`h-px w-full my-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}></div>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tổng giá trị</span>
                <span className="text-lg font-bold text-amber-500">{formatCurrency(order.totalAmount)}</span>
              </div>
              <button 
                onClick={() => navigate(`/orders/${order._id}`)} // Chuyển hướng sang trang chi tiết
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white' : 'bg-gray-50 text-gray-400 hover:bg-amber-50 hover:text-amber-600'}`}
              >
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- PAGINATION (Góc phải dưới giống mẫu) --- */}
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 mt-4 select-none">
          {/* Nút Back */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent ${
              darkMode ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-indigo-600'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            Back
          </button>

          {/* Dãy số trang */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => {
              if (page === '...') {
                return <span key={`dots-${index}`} className={`px-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>...</span>;
              }
              
              const isActive = currentPage === page;
              return (
                <button
                  key={index}
                  onClick={() => handlePageChange(page as number)}
                  className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      // Style cho nút Active (Màu tím giống mẫu, hoặc bạn có thể đổi thành amber-500 nếu muốn đồng bộ)
                      ? 'bg-amber-600 text-white shadow-md shadow-indigo-500/30'
                      // Style cho nút thường
                      : darkMode 
                        ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                        : 'bg-indigo-50 text-amber-600 hover:bg-indigo-100'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Nút Next */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent ${
              darkMode ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-amber-600'
            }`}
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