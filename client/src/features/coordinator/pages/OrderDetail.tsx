import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Cần cài react-router-dom
import { OrderApi, type Order as OrderType } from '@/api/OrderAPi';
import { useThemeStore } from '@/shared/zustand/themeStore';

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>(); // Lấy ID từ URL
  const navigate = useNavigate();
  const { darkMode } = useThemeStore();
  
  const [order, setOrder] = useState<OrderType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await OrderApi.getOrderById(id);
        setOrder(data);
      } catch (err) {
        console.error(err);
        setError('Không thể tải thông tin đơn hàng.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [id]);

  // --- HELPER FUNCTIONS (Tái sử dụng từ trang Order) ---
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
      case 'Shipped': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'Received': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'Cancelled': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  // --- RENDER ---
  if (loading) return (
    <div className={`flex h-screen items-center justify-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
      <span className="material-symbols-outlined animate-spin text-3xl mr-2">progress_activity</span>
      Đang tải chi tiết đơn hàng...
    </div>
  );

  if (error || !order) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <span className="text-red-500 text-lg">{error || 'Không tìm thấy đơn hàng'}</span>
      <button onClick={() => navigate(-1)} className="text-blue-500 hover:underline">Quay lại</button>
    </div>
  );

  return (
    <div className={`min-h-screen p-6 animate-in fade-in duration-300 ${darkMode ? 'bg-[#1e1e24] text-gray-200' : 'bg-gray-50 text-gray-800'}`}>
      
      {/* 1. TOP NAVIGATION & HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {order.orderCode}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(order.status)}`}>
                {order.status.toUpperCase()}
              </span>
            </div>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Ngày đặt: {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {order.status === 'Pending' && (
            <>
              <button className="px-4 py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg font-medium text-sm transition-colors border border-red-200">
                Từ chối
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium text-sm transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check</span> Duyệt đơn
              </button>
            </>
          )}
           <button className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors border flex items-center gap-2 ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
             <span className="material-symbols-outlined text-[18px]">print</span> In phiếu
           </button>
        </div>
      </div>

      {/* 2. MAIN GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: PRODUCT LIST (Chiếm 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-[#25252A] border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <span className="material-symbols-outlined text-amber-500">shopping_cart</span>
              Danh sách sản phẩm
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-sm uppercase tracking-wider ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                    <th className="pb-3 font-semibold">Sản phẩm</th>
                    <th className="pb-3 font-semibold text-center">Số lượng</th>
                    <th className="pb-3 font-semibold text-right">Đơn giá</th>
                    <th className="pb-3 font-semibold text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {order.items.map((item, index) => {
                    // Xử lý an toàn nếu product bị null hoặc chưa populate
                    const productName = (item.productId as any)?.name || 'Sản phẩm ' + (index + 1);
                    const productPrice = (item.productId as any)?.price || item.price || 0;
                    const subtotal = productPrice * item.quantity;

                    return (
                      <tr key={index} className={`border-b last:border-0 ${darkMode ? 'border-gray-800' : 'border-gray-50'}`}>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                              <span className="material-symbols-outlined text-gray-400 text-lg">image</span>
                            </div>
                            <span className="font-medium">{productName}</span>
                          </div>
                        </td>
                        <td className="py-4 text-center">{item.quantity}</td>
                        <td className="py-4 text-right">{formatCurrency(productPrice)}</td>
                        <td className="py-4 text-right font-semibold">{formatCurrency(subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INFO & SUMMARY (Chiếm 1/3) */}
        <div className="space-y-6">
          
          {/* STORE INFO CARD */}
          <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-[#25252A] border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Thông tin cửa hàng
            </h3>
            <div className="flex items-start gap-3 mb-4">
              <div className={`p-2 rounded-full ${darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                <span className="material-symbols-outlined text-xl">store</span>
              </div>
              <div>
                <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {(order.storeId as any)?.storeName || 'Store Unknown'}
                </p>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Mã: {typeof order.storeId === 'string' ? order.storeId : (order.storeId as any)?._id}
                </p>
              </div>
            </div>
            
            <div className={`h-px w-full my-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}></div>

            <div className="space-y-3 text-sm">
               <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Ngày giao dự kiến:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {formatDate(order.requestedDeliveryDate)}
                </span>
              </div>
               {/* Nếu có người tạo */}
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Người tạo:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                   {(order.createdBy as any)?.fullName || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* PAYMENT SUMMARY CARD */}
          <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-[#25252A] border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
             <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Thanh toán
            </h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Tạm tính:</span>
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Phí vận chuyển:</span>
                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>{formatCurrency(0)}</span>
              </div>
            </div>
            
            <div className={`h-px w-full my-4 border-dashed ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

            <div className="flex justify-between items-end">
              <span className={`font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Tổng cộng:</span>
              <span className="text-2xl font-bold text-amber-500">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>

          {/* NOTES CARD (Chỉ hiện nếu có ghi chú) */}
          {order.notes && (
             <div className={`rounded-2xl border p-6 border-l-4 border-l-amber-500 ${darkMode ? 'bg-[#25252A] border-y-gray-700 border-r-gray-700' : 'bg-amber-50 border-y-amber-100 border-r-amber-100'}`}>
               <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 text-amber-600`}>
                Ghi chú
              </h3>
              <p className={`text-sm italic ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                "{order.notes}"
              </p>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default OrderDetail;