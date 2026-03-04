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
    const [isMarkingReady, setIsMarkingReady] = useState(false);
    const [isStartingShipping, setIsStartingShipping] = useState(false);

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

    const handleMarkReady = async () => {
        if (!id) return;
        try {
            setIsMarkingReady(true);
            await DeliveryTripApi.markReady(id);
            toast.success('Chuyến hàng đã sẵn sàng giao.');
            setRefreshTrigger((prev) => prev + 1);
        } catch (err) {
            toast.error('Không thể đánh dấu sẵn sàng giao.');
        } finally {
            setIsMarkingReady(false);
        }
    };

    const handleStartShipping = async () => {
        if (!id) return;
        try {
            setIsStartingShipping(true);
            await DeliveryTripApi.startShipping(id);
            toast.success('Chuyến hàng đã bắt đầu giao (In Transit).');
            setRefreshTrigger((prev) => prev + 1);
        } catch (err) {
            toast.error('Không thể bắt đầu giao hàng.');
        } finally {
            setIsStartingShipping(false);
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="p-3 rounded-xl transition-colors bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-lg font-semibold text-card-foreground font-mono">
                            {trip.tripCode ?? `TRIP-${trip._id.slice(-6).toUpperCase()}`}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getTripStatusStyle(trip.status)}`}>
                            {trip.status.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            Khởi tạo: {new Date(trip.createdAt).toLocaleString('vi-VN')}
                        </span>
                    </div>
                </div>

                <div className="flex gap-2">
                    {trip.status === 'Planning' && (
                        <button
                            type="button"
                            onClick={handleFinalizeTrip}
                            disabled={isFinalizing || (trip.orders?.length ?? 0) === 0}
                            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-all hover:opacity-90 disabled:opacity-50"
                        >
                            {isFinalizing ? 'Đang chốt kế hoạch...' : 'Chốt kế hoạch (Finalize)'}
                        </button>
                    )}
                    {(trip.status === 'Pending' || trip.status === 'Planning') && (
                        <button
                            type="button"
                            onClick={handleMarkReady}
                            disabled={isMarkingReady}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold tracking-wide hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {isMarkingReady ? 'Đang đánh dấu...' : 'Sẵn sàng giao (Ready)'}
                        </button>
                    )}
                    {(trip.status === 'ReadyForShipping' || trip.status === 'Pending') && (
                        <button
                            type="button"
                            onClick={handleStartShipping}
                            disabled={isStartingShipping}
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold tracking-wide hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isStartingShipping ? 'Đang bắt đầu...' : 'Bắt đầu giao (In Transit)'}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 rounded-xl border border-border bg-card flex items-center gap-4">
                    <div className="p-4 rounded-xl bg-primary/10 text-primary">
                        <MapPin className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tổng điểm giao</p>
                        <p className="text-2xl font-bold text-card-foreground">{tripOrders.length} Cửa hàng</p>
                    </div>
                </div>
                <div className="p-6 rounded-xl border border-border bg-card flex items-center gap-4">
                    <div className="p-4 rounded-xl bg-primary/10 text-primary">
                        <DollarSign className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tổng giá trị hàng</p>
                        <p className="text-2xl font-bold text-card-foreground">
                            {formatCurrency(tripOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0))}
                        </p>
                    </div>
                </div>
                <div className="p-6 rounded-xl border border-border bg-card flex items-center gap-4">
                    <div className="p-4 rounded-xl bg-primary/10 text-primary">
                        <CalendarDays className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hoàn thành lúc</p>
                        <p className="text-lg font-bold text-card-foreground">
                            {trip.completedTime ? new Date(trip.completedTime).toLocaleString('vi-VN') : 'Chưa hoàn thành'}
                        </p>
                    </div>
                </div>
            </div>

            <h2 className="text-lg font-semibold text-card-foreground mb-6 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" /> Danh sách điểm giao ({tripOrders.length})
            </h2>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {tripOrders.map((order, index) => (
                    <div
                        key={order._id}
                        className="rounded-xl p-6 border border-border bg-card flex flex-col md:flex-row gap-6 transition-all hover:shadow-md hover:border-primary/20"
                    >
                        <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 rounded-xl font-bold text-xl bg-secondary text-muted-foreground">
                            #{index + 1}
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mã đơn hàng</p>
                                    <p className="text-lg font-semibold text-card-foreground">
                                        {order.orderCode || order._id.slice(-6).toUpperCase()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getOrderStatusStyle(order.status)}`}>
                                        {order.status}
                                    </span>
                                    {trip.status === 'Planning' && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOrder(order._id)}
                                            className="p-1.5 rounded-xl transition-colors bg-secondary text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            title="Gỡ khỏi chuyến xe"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="h-px w-full bg-border" />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 text-muted-foreground">
                                        <MapPin className="w-3 h-3" /> Cửa hàng
                                    </p>
                                    <p className="text-sm font-medium truncate mt-1 text-card-foreground">
                                        {typeof order.storeId === 'object' && order.storeId?.storeName
                                            ? order.storeId.storeName
                                            : typeof order.storeId === 'string'
                                                ? order.storeId.slice(-6).toUpperCase()
                                                : 'N/A'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Giá trị</p>
                                    <p className="text-sm font-bold text-primary mt-1">
                                        {formatCurrency(order.totalAmount || 0)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {tripOrders.length === 0 && (
                    <div className="col-span-full py-16 text-center rounded-2xl border-2 border-dashed border-border bg-card/50">
                        <p className="text-sm font-medium text-muted-foreground">
                            Không có đơn hàng nào trong chuyến xe này.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShipmentDetail;