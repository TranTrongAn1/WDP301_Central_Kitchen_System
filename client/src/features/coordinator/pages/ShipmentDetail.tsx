import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DeliveryTripApi, { type ITrip } from '@/api/DeliveryTripApi';
import { OrderApi, type Order } from '@/api/OrderApi';
import { useThemeStore } from '@/shared/zustand/themeStore';
import {
    ArrowLeft,
    Truck,
    MapPin,
    CalendarDays,
    DollarSign,
    Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

const ShipmentDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { darkMode } = useThemeStore();

    const [trip, setTrip] = useState<ITrip | null>(null);
    const [tripOrders, setTripOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isFinalizing, setIsFinalizing] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [tripRes, ordersRes] = await Promise.all([
                    DeliveryTripApi.getDeliveryTripById(id),
                    OrderApi.getAllOrders()
                ]);

                const tripData = tripRes?.data ?? tripRes;
                if (tripData) {
                    setTrip(tripData);

                    const allOrders = Array.isArray(ordersRes) ? ordersRes : [];
                    
                    const mappedOrders = tripData.orders.map((tripOrder: unknown) => {
                        if (typeof tripOrder === 'string') {
                            return allOrders.find((o: Order) => o._id === tripOrder);
                        }
                        const o = tripOrder as { _id?: string; orderCode?: string; storeId?: unknown; totalAmount?: number; status?: string };
                        return o?._id ? allOrders.find((ord: Order) => ord._id === o._id) ?? o : o;
                    }).filter(Boolean) as Order[];

                    setTripOrders(mappedOrders);
                }
            } catch (err) {
                console.error(err);
                toast.error('Không thể tải chi tiết chuyến hàng');
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [id, refreshTrigger]);

    // --- LOGIC XÓA ĐƠN HÀNG ---
    const handleFinalizeTrip = async () => {
        if (!id) return;
        try {
            setIsFinalizing(true);
            await DeliveryTripApi.finalizeTrip(id);
            toast.success('Chuyến hàng đã chuyển sang trạng thái đang giao (In Transit).');
            setRefreshTrigger((prev) => prev + 1);
        } catch (err) {
            toast.error('Không thể duyệt chuyến hàng.');
        } finally {
            setIsFinalizing(false);
        }
    };

    const handleRemoveOrder = async (orderId: string) => {
        if (!trip || !id) return;
        if (!window.confirm("Bạn có chắc chắn muốn gỡ đơn hàng này khỏi chuyến xe?")) return;

        try {
            const toastId = toast.loading('Đang gỡ đơn hàng...');
            const res = await DeliveryTripApi.removeOrdersFromDeliveryTrip(id, [orderId]);

            if ((res as { success?: boolean })?.success) {
                toast.success('Đã gỡ đơn hàng thành công!', { id: toastId });
                setRefreshTrigger(prev => prev + 1);
            } else {
                toast.error('Lỗi khi gỡ đơn hàng!', { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error('Đã xảy ra lỗi kết nối');
        }
    };

    const getTripStatusStyle = (status: string) => {
        if (status === 'Planning') return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
        if (status === 'In_Transit') return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
        if (status === 'Completed') return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
        if (status === 'Cancelled') return 'bg-red-500/20 text-red-500 border-red-500/30';
        return darkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-200';
    };

    const getOrderStatusStyle = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-amber-500/10 text-amber-600 border-amber-200';
            case 'Approved': return 'bg-blue-500/10 text-blue-600 border-blue-200';
            case 'Shipped': return 'bg-purple-500/10 text-purple-600 border-purple-200';
            case 'Received': return 'bg-green-500/10 text-green-600 border-green-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    if (loading && !trip) return (
        <div className={`flex items-center justify-center h-screen ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <span className="material-symbols-outlined animate-spin text-4xl mr-3">progress_activity</span>
            <span className="font-bold tracking-widest uppercase">Đang tải chi tiết chuyến xe...</span>
        </div>
    );

    if (!trip) return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
            <p className="text-red-500 font-bold text-xl">Không tìm thấy chuyến hàng!</p>
            <button 
                type="button" 
                onClick={() => navigate(-1)} 
                className="text-orange-500 hover:underline flex items-center gap-2"
            >
                <ArrowLeft className="w-5 h-5" /> Quay lại
            </button>
        </div>
    );

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            {/* --- HEADER --- */}
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 mb-8 ${darkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
                <div className="flex items-center gap-4">
                    {/* THÊM TYPE="BUTTON" ĐỂ KHÔNG BỊ LOGOUT KHI CLICK */}
                    <button 
                        type="button" 
                        onClick={() => navigate(-1)}
                        className={`p-3 rounded-2xl transition-colors ${darkMode ? 'bg-[#25252A] hover:bg-gray-700 text-gray-400' : 'bg-white hover:bg-gray-100 text-gray-600 shadow-sm'}`}
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className={`text-2xl font-black uppercase italic tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {trip.tripCode ?? `Chuyến #${trip._id.slice(-6).toUpperCase()}`}
                            </h1>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getTripStatusStyle(trip.status)}`}>
                                {trip.status.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                        <p className={`text-xs font-bold uppercase mt-1 tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Khởi tạo lúc: {new Date(trip.createdAt).toLocaleString('vi-VN')}
                        </p>
                    </div>
                </div>

                {trip.status === 'Planning' && (
                    <button
                        type="button"
                        onClick={handleFinalizeTrip}
                        disabled={isFinalizing || (trip.orders?.length ?? 0) === 0}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-all active:scale-95 shadow-lg shadow-orange-500/20 disabled:opacity-50"
                    >
                        {isFinalizing ? 'Đang xử lý...' : 'Duyệt chuyến (Khởi hành)'}
                    </button>
                )}
            </div>

            {/* --- THỐNG KÊ NHANH --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className={`p-6 rounded-2xl border flex items-center gap-4 ${darkMode ? 'bg-[#25252A] border-gray-700/50' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-50 text-blue-600'}`}>
                        <MapPin className="w-8 h-8" />
                    </div>
                    <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Tổng điểm giao</p>
                        <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>{tripOrders.length} Cửa hàng</p>
                    </div>
                </div>

                <div className={`p-6 rounded-2xl border flex items-center gap-4 ${darkMode ? 'bg-[#25252A] border-gray-700/50' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-50 text-orange-600'}`}>
                        <DollarSign className="w-8 h-8" />
                    </div>
                    <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Tổng giá trị hàng</p>
                        <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatCurrency(tripOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0))}
                        </p>
                    </div>
                </div>

                <div className={`p-6 rounded-2xl border flex items-center gap-4 ${darkMode ? 'bg-[#25252A] border-gray-700/50' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}>
                        <CalendarDays className="w-8 h-8" />
                    </div>
                    <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Hoàn thành lúc</p>
                        <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {trip.completedTime ? new Date(trip.completedTime).toLocaleString('vi-VN') : 'Chưa hoàn thành'}
                        </p>
                    </div>
                </div>
            </div>

            {/* --- DANH SÁCH ĐƠN HÀNG --- */}
            <h2 className={`text-xl font-black uppercase italic mb-6 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <Truck className="w-6 h-6 text-orange-500" /> Danh sách điểm giao ({tripOrders.length})
            </h2>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {tripOrders.map((order, index) => (
                    <div key={order._id} className={`rounded-[24px] p-6 border flex flex-col md:flex-row gap-6 transition-all hover:-translate-y-1 ${
                        darkMode 
                            ? 'bg-[#25252A] border-gray-700/50 hover:border-gray-600 shadow-lg shadow-black/20' 
                            : 'bg-white border-gray-200 shadow-sm hover:border-gray-300'
                    }`}>
                        <div className={`hidden md:flex flex-col items-center justify-center w-16 h-16 rounded-2xl font-black text-2xl ${
                            darkMode ? 'bg-[#1A1A1A] text-gray-500' : 'bg-gray-50 text-gray-400'
                        }`}>
                            #{index + 1}
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Mã đơn hàng</p>
                                    <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {/* ĐÃ FIX ORDER CODE, BỎ ORDER NUMBER */}
                                        {order.orderCode || order._id.slice(-6).toUpperCase()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getOrderStatusStyle(order.status)}`}>
                                        {order.status}
                                    </span>
                                    
                                    {/* Nút Xóa (CHỈ ĐƯỢC XÓA KHI TRẠNG THÁI LÀ PLANNING) */}
                                    {trip.status === 'Planning' && (
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveOrder(order._id)}
                                            className={`p-1.5 rounded-xl transition-all ${
                                                darkMode 
                                                    ? 'bg-[#1A1A1A] text-gray-500 hover:text-red-500 hover:bg-red-500/10' 
                                                    : 'bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50'
                                            }`}
                                            title="Gỡ khỏi chuyến xe"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className={`h-px w-full ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}></div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <MapPin className="w-3 h-3" /> Cửa hàng
                                    </p>
                                    <p className={`text-sm font-semibold truncate mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {typeof order.storeId === 'object' && order.storeId?.storeName
                                            ? order.storeId.storeName
                                            : typeof order.storeId === 'string'
                                                ? order.storeId.slice(-6).toUpperCase()
                                                : 'N/A'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Giá trị</p>
                                    <p className="text-sm font-black text-orange-500 mt-1">
                                        {formatCurrency(order.totalAmount || 0)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {tripOrders.length === 0 && (
                    <div className={`col-span-full py-16 text-center rounded-2xl border-2 border-dashed ${darkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
                        <p className={`font-bold italic text-sm uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Không có đơn hàng nào trong chuyến xe này.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShipmentDetail;