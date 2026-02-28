import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OrderApi, type Order as OrderType } from '@/api/OrderApi';
import { productApi, type Product } from '@/api/ProductApi';
import { ingredientApi, type Ingredient, type IngredientBatch } from '@/api/IngredientApi';
import { useThemeStore } from '@/shared/zustand/themeStore';

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
  const { darkMode } = useThemeStore();
  
  const [order, setOrder] = useState<OrderType | null>(null);
  const [inventoryCheck, setInventoryCheck] = useState<InventoryCalculation[]>([]);
  const [isEnoughStock, setIsEnoughStock] = useState<boolean>(true);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // Bước 1: Gọi 3 API cơ bản trước
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

          // Bước 2: Tính tổng Nguyên liệu CẦN THIẾT
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

          // Bước 3: ĐI CHỢ LẤY LÔ (Chỉ gọi API lấy Batches cho những nguyên liệu có trong requiredMap)
          const requiredIngredientIds = Object.keys(requiredMap);
          
          // Tạo mảng các request lấy lô song song
          const batchPromises = requiredIngredientIds.map(ingId => ingredientApi.getBatches(ingId));
          const batchResults = await Promise.all(batchPromises);

          // Gom tất cả các lô thu được vào 1 mảng
          let allRelevantBatches: IngredientBatch[] = [];
          batchResults.forEach(res => {
              const batches = (res as any).data || [];
              allRelevantBatches = [...allRelevantBatches, ...batches];
          });

          // Bước 4: Tính toán TỒN KHO THỰC TẾ từ các Lô hợp lệ
          let allEnough = true;
          const finalCalculations = Object.values(requiredMap).map(calc => {
            
            // Lọc ra các lô của nguyên liệu này (Active, chưa hết hạn, còn hàng)
            const validBatches = allRelevantBatches.filter(batch => {
                const batchIngId = typeof batch.ingredientId === 'object' ? batch.ingredientId._id : batch.ingredientId;
                const isNotExpired = new Date(batch.expiryDate).getTime() > new Date().getTime();
                
                return batchIngId === calc.ingredientId && batch.isActive && isNotExpired && batch.currentQuantity > 0;
            });

            // Cộng dồn currentQuantity của các lô hợp lệ
            const trueStock = validBatches.reduce((sum, batch) => sum + batch.currentQuantity, 0);

            // Đối chiếu
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
  }, [id]);

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

  // --- RENDER ---
  if (loading) return (
    <div className={`flex h-screen items-center justify-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
              {order.status}
            </span>
            <span className="text-sm text-muted-foreground">Ngày đặt: {formatDate(order.createdAt)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {order.status === 'Pending' && (
            <>
              <button className="px-4 py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg font-medium text-sm transition-colors border border-red-200">
                Từ chối
              </button>
              {/* Nút Duyệt: Bị khóa nếu thiếu nguyên liệu */}
              <button 
                disabled={!isEnoughStock}
                title={!isEnoughStock ? 'Không đủ nguyên liệu trong kho để làm đơn này' : ''}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  isEnoughStock 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30' 
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed grayscale'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isEnoughStock ? 'check' : 'block'}
                </span> 
                {isEnoughStock ? 'Duyệt đơn' : 'Thiếu nguyên liệu'}
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
        
        {/* LEFT COLUMN: PRODUCT & INVENTORY (Chiếm 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PRODUCT LIST */}
          <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-[#25252A] border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <span className="material-symbols-outlined text-amber-500">shopping_cart</span>
              Danh sách bánh yêu cầu
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
                  {order.items.map((item: OrderType['items'][0], index: number) => {
                    const productName = (typeof item.productId === 'object' && item.productId?.name) ? item.productId.name : 'Sản phẩm ' + (index + 1);
                    const productPrice = (typeof item.productId === 'object' && item.productId?.price) ? item.productId.price : (item.unitPrice ?? (item.quantity ? item.subtotal / item.quantity : 0));
                    const subtotal = item.subtotal ?? productPrice * item.quantity;

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

          {/* INVENTORY CHECK RESULT */}
          {inventoryCheck.length > 0 && (
            <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-[#25252A] border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
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
                    <tr className={`border-b text-xs uppercase tracking-wider ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-500'}`}>
                      <th className="pb-3 font-semibold">Tên nguyên liệu</th>
                      <th className="pb-3 font-semibold text-right">Tồn kho hiện tại</th>
                      <th className="pb-3 font-semibold text-right">SL Cần dùng</th>
                      <th className="pb-3 font-semibold text-right">Còn lại dự kiến</th>
                      <th className="pb-3 font-semibold text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {inventoryCheck.map((calc, idx) => (
                      <tr key={idx} className={`border-b last:border-0 ${darkMode ? 'border-gray-800' : 'border-gray-50'}`}>
                        <td className="py-3 font-medium">{calc.ingredientName}</td>
                        <td className="py-3 text-right text-gray-500">
                          {calc.currentStock.toFixed(2)} {calc.unit}
                        </td>
                        <td className="py-3 text-right font-bold text-amber-500">
                          - {calc.requiredQty.toFixed(2)} {calc.unit}
                        </td>
                        <td className={`py-3 text-right font-bold ${calc.isEnough ? (darkMode ? 'text-green-400' : 'text-green-600') : 'text-red-500'}`}>
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
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Người tạo:</span>
                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                   {(order.createdBy as any)?.fullName || 'Hệ thống'}
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

          {/* NOTES CARD */}
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