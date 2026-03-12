import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import DeliveryTripApi, { type ITrip } from '@/api/DeliveryTripApi';
import { OrderApi, type Order } from '@/api/OrderApi';
import { systemSettingApi } from '@/api/SystemSettingApi';
import { productApi, type Product } from '@/api/ProductApi';
import { ingredientApi, type Ingredient } from '@/api/IngredientApi';
import { useThemeStore } from '@/shared/zustand/themeStore';
import { useAuthStore } from '@/shared/zustand/authStore';
import {
    ArrowLeft,
    Truck,
    MapPin,
    DollarSign,
    Trash2,
    Plus,
    X,
    CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ShipmentDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { darkMode } = useThemeStore();
    const { user } = useAuthStore();

    const [trip, setTrip] = useState<ITrip | null>(null);
    const [tripOrders, setTripOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isStartingShipping, setIsStartingShipping] = useState(false);
    const [confirmAction, setConfirmAction] = useState<null | { type: 'startShipping' | 'removeOrder'; orderId?: string }>(null);

    // Add orders modal state
    const [addOrdersModalOpen, setAddOrdersModalOpen] = useState(false);
    const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
    const [isAddingOrders, setIsAddingOrders] = useState(false);
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [minOrdersPerTrip, setMinOrdersPerTrip] = useState<number | null>(null);
    const [ingredientSummary, setIngredientSummary] = useState<{ name: string; unit: string; totalQty: number }[]>([]);
    const [totalWeightKg, setTotalWeightKg] = useState(0);

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

    useEffect(() => {
        const fetchLimits = async () => {
            try {
                const res = await systemSettingApi.getByKey('MIN_ORDERS_PER_TRIP');
                const raw = res?.data?.value;
                const num = raw != null ? Number(raw) : NaN;
                if (!Number.isNaN(num) && num > 0) setMinOrdersPerTrip(num);
            } catch {
                setMinOrdersPerTrip(null);
            }
        };
        void fetchLimits();
    }, []);

    useEffect(() => {
        if (tripOrders.length === 0) {
            setIngredientSummary([]);
            setTotalWeightKg(0);
            return;
        }
        let cancelled = false;
        const run = async () => {
            try {
                const [productsRes, ingredientsRes] = await Promise.all([
                    productApi.getAll(),
                    ingredientApi.getAll(),
                ]);
                const products: Product[] = (productsRes as any)?.data ?? (Array.isArray(productsRes) ? productsRes : []);
                const ingredients: Ingredient[] = (ingredientsRes as any)?.data ?? (Array.isArray(ingredientsRes) ? ingredientsRes : []);
                const ingMap: Record<string, { name: string; unit: string; totalQty: number }> = {};
                let totalWeight = 0;
                for (const order of tripOrders) {
                    if (!order.items) continue;
                    for (const item of order.items) {
                        const pid = typeof item.productId === 'object' ? (item.productId as any)?._id : item.productId;
                        const product = products.find((p: Product) => p._id === pid);
                        const qty = item.quantity ?? (item as any).approvedQuantity ?? 0;

                        // Cộng khối lượng (dùng weight từ product, mặc định 0.5kg nếu thiếu)
                        const weightPerUnit = (product as Product | undefined)?.weight ?? 0.5;
                        totalWeight += weightPerUnit * qty;
                        if (!product?.recipe) continue;
                        for (const rec of product.recipe) {
                            const ingId = typeof rec.ingredientId === 'object' ? (rec.ingredientId as any)?._id : rec.ingredientId;
                            const need = (rec.quantity ?? 0) * qty;
                            const ing = ingredients.find((i: Ingredient) => i._id === ingId);
                            if (!ingMap[ingId]) {
                                ingMap[ingId] = { name: ing?.ingredientName ?? ingId, unit: ing?.unit ?? '', totalQty: 0 };
                            }
                            ingMap[ingId].totalQty += need;
                        }
                    }
                }
                if (!cancelled) {
                    setIngredientSummary(Object.values(ingMap));
                    setTotalWeightKg(totalWeight);
                }
            } catch {
                if (!cancelled) {
                    setIngredientSummary([]);
                    setTotalWeightKg(0);
                }
            }
        };
        run();
        return () => { cancelled = true; };
    }, [tripOrders]);

    // --- LOGIC THÊM ĐƠN HÀNG ---
    const handleOpenAddOrders = async () => {
        if (!trip) return;
        setLoadingAvailable(true);
        setSelectedOrderIds([]);
        setAddOrdersModalOpen(true);
        try {
            const allOrders = await OrderApi.getAllOrders();
            const tripOrderIds = new Set(
                trip.orders.map((o: unknown) => {
                    if (typeof o === 'string') return o;
                    return (o as { _id?: string })?._id ?? '';
                })
            );
            // Show các đơn đã sẵn sàng giao (Ready_For_Shipping) và chưa nằm trong trip hiện tại
            const available = allOrders.filter(
                (o) => (o.status as string) === 'Ready_For_Shipping' && !tripOrderIds.has(o._id)
            );
            setAvailableOrders(available);
        } catch {
            toast.error('Không thể tải danh sách đơn hàng.');
        } finally {
            setLoadingAvailable(false);
        }
    };

    const toggleOrderSelection = (orderId: string) => {
        setSelectedOrderIds((prev) =>
            prev.includes(orderId)
                ? prev.filter((id) => id !== orderId)
                : [...prev, orderId]
        );
    };

    const handleAddOrdersToTrip = async () => {
        if (!id || selectedOrderIds.length === 0) return;
        try {
            setIsAddingOrders(true);
            const res = await DeliveryTripApi.addOrdersToDeliveryTrip(id, selectedOrderIds);
            if ((res as { success?: boolean })?.success) {
                toast.success(`Đã thêm ${selectedOrderIds.length} đơn hàng vào chuyến xe!`);
                setAddOrdersModalOpen(false);
                setRefreshTrigger((prev) => prev + 1);
            } else {
                toast.error('Lỗi khi thêm đơn hàng!');
            }
        } catch {
            toast.error('Đã xảy ra lỗi khi thêm đơn hàng.');
        } finally {
            setIsAddingOrders(false);
        }
    };

    // --- LOGIC XÓA ĐƠN HÀNG ---
    // Backend không có bước finalize-trip riêng; trip sẽ được chốt bằng start-shipping
    // và tự Completed khi tất cả đơn đã Received, nên không cần handler finalize ở đây.

    const handleStartShipping = async () => {
        if (!id) return;
        try {
            setIsStartingShipping(true);
            await DeliveryTripApi.startShipping(id);
            toast.success('Chuyến hàng đã bắt đầu giao (In Transit).');
            setRefreshTrigger((prev) => prev + 1);
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                'Không thể bắt đầu giao hàng.';
            toast.error(message);
        } finally {
            setIsStartingShipping(false);
            setConfirmAction(null);
        }
    };

    const handleRemoveOrder = async (orderId: string) => {
        if (!trip || !id) return;

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
        } finally {
            setConfirmAction(null);
        }
    };

    const getTripStatusStyle = (status: string) => {
        const s = (status || '').trim();
        if (s === 'Planning') return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
        if (s === 'Pending' || s === 'Transferred_To_Kitchen') return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
        if (s === 'ReadyForShipping' || s === 'Ready_For_Shipping' || s === 'Ready for shipping') return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
        if (s === 'In_Transit' || s === 'In Transit') return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
        if (s === 'Completed') return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
        if (s === 'Cancelled') return 'bg-red-500/20 text-red-500 border-red-500/30';
        return darkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-200';
    };

    const getTripStatusLabel = (status: string) => {
        const s = (status || '').trim();
        const map: Record<string, string> = {
            Planning: 'Đang chờ giao',
            Pending: 'Đang xử lý',
            Transferred_To_Kitchen: 'Bếp đang chuẩn bị',
            ReadyForShipping: 'Sẵn sàng giao',
            Ready_For_Shipping: 'Sẵn sàng giao',
            'Ready for shipping': 'Sẵn sàng giao',
            In_Transit: 'Đang giao cho cửa hàng',
            'In Transit': 'Đang giao cho cửa hàng',
            Completed: 'Đã giao xong',
            Cancelled: 'Đã hủy chuyến',
        };
        return map[s] ?? map[s.replace(/\s+/g, '_')] ?? 'Trạng thái hệ thống khác';
    };

    const getOrderStatusLabel = (status: string) => {
        const s = (status || '').trim();
        const map: Record<string, string> = {
            Pending: 'Chờ duyệt',
            Approved: 'Đã duyệt',
            Transferred_To_Kitchen: 'Đã chuyển bếp',
            Ready_For_Shipping: 'Sẵn sàng giao',
            In_Transit: 'Đang giao',
            'In Transit': 'Đang giao',
            Received: 'Đã nhận',
            Cancelled: 'Đã hủy',
            Shipped: 'Đã giao',
        };
        return map[s] ?? map[s.replace(/\s+/g, '_')] ?? 'Trạng thái hệ thống khác';
    };

    const getOrderStatusStyle = (status: string) => {
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

    const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const vehicleType = (trip ? (trip as any).vehicleType : undefined) as
        | { name?: string; capacity?: number; unit?: 'kg' | 'ton' | 'box' }
        | undefined;

    const getVehicleCapacityText = () => {
        if (!vehicleType || !vehicleType.capacity || !vehicleType.unit) return 'Chưa gán';
        const { capacity, unit } = vehicleType;
        if (unit === 'kg') return `${capacity} kg`;
        if (unit === 'ton') return `${capacity} tấn (~${capacity * 1000} kg)`;
        if (unit === 'box') return `${capacity} boxes (giới hạn theo số lượng items)`;
        return `${capacity} ${unit}`;
    };

    const totalItems = useMemo(() => {
        return tripOrders.reduce((sum, order) => {
            if (!order.items || order.items.length === 0) return sum;
            const orderQty = order.items.reduce((s, item: any) => {
                const qty = item.quantity ?? item.approvedQuantity ?? 0;
                return s + qty;
            }, 0);
            return sum + orderQty;
        }, 0);
    }, [tripOrders]);

    const getWeightTextClass = () => {
        if (!vehicleType || !vehicleType.capacity || !vehicleType.unit) return '';
        if (vehicleType.unit === 'box') {
            if (!totalItems) return '';
            const ratio = totalItems / vehicleType.capacity;
            if (ratio > 1) return 'text-red-600';
            if (ratio > 0.8) return 'text-amber-600';
            return 'text-emerald-600';
        }
        const capacityKg = vehicleType.unit === 'kg'
            ? vehicleType.capacity
            : vehicleType.capacity * 1000;
        if (!capacityKg) return '';
        const ratio = totalWeightKg / capacityKg;
        if (ratio > 1) return 'text-red-600';
        if (ratio > 0.8) return 'text-amber-600';
        return 'text-emerald-600';
    };

    const handleBack = () => {
        // Ưu tiên theo path hiện tại để giữ đúng module
        if (location.pathname.startsWith('/manager')) {
            navigate('/manager/orders');
            return;
        }
        if (location.pathname.startsWith('/admin')) {
            navigate('/admin/orders');
            return;
        }
        if (location.pathname.startsWith('/kitchen')) {
            navigate('/kitchen/trips');
            return;
        }
        if (location.pathname.startsWith('/coordinator')) {
            navigate('/coordinator/shipments');
            return;
        }

        // Fallback theo role nếu path không khớp
        const role = user?.role;
        if (role === 'Manager') {
            navigate('/manager/orders');
        } else if (role === 'Admin') {
            navigate('/admin/orders');
        } else if (role === 'KitchenStaff') {
            navigate('/kitchen/trips');
        } else if (role === 'Coordinator') {
            navigate('/coordinator/shipments');
        } else {
            navigate(-1);
        }
    };

    if (loading && !trip) {
        return (
            <div className={`flex items-center justify-center h-screen ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className="material-symbols-outlined animate-spin text-4xl mr-3">progress_activity</span>
                <span className="font-bold tracking-widest uppercase">Đang tải chi tiết chuyến xe...</span>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <p className="text-red-500 font-bold text-xl">Không tìm thấy chuyến hàng!</p>
                <button
                    type="button"
                    onClick={handleBack}
                    className="text-orange-500 hover:underline flex items-center gap-2"
                >
                    <ArrowLeft className="w-5 h-5" /> Quay lại
                </button>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="p-3 rounded-xl transition-colors bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-lg font-semibold text-card-foreground font-mono">
                            {trip.tripCode ?? `TRIP-${trip._id.slice(-6).toUpperCase()}`}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getTripStatusStyle(trip.status)}`}>
                            {getTripStatusLabel(trip.status)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            Khởi tạo: {new Date(trip.createdAt).toLocaleString('vi-VN')}
                        </span>
                    </div>
                </div>

                <div className="flex gap-2">
                    {trip.status === 'Planning' && user?.role !== 'KitchenStaff' && (
                        <button
                            type="button"
                            onClick={handleOpenAddOrders}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold tracking-wide hover:bg-emerald-700 flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Thêm đơn hàng
                        </button>
                    )}
                    {(
                        trip.status === 'ReadyForShipping' ||
                        trip.status === 'Ready_For_Shipping' ||
                        trip.status === 'Ready for shipping' ||
                        trip.status === 'Planning' ||
                        trip.status === 'Pending' ||
                        trip.status === 'Transferred_To_Kitchen'
                    ) && user?.role !== 'KitchenStaff' && (
                            <button
                                type="button"
                                onClick={() => setConfirmAction({ type: 'startShipping' })}
                                disabled={isStartingShipping}
                                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold tracking-wide hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isStartingShipping ? 'Đang bắt đầu...' : 'Bắt đầu giao'}
                            </button>
                        )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                        <Truck className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Khối lượng vs Sức chở
                        </p>
                        <p className={`text-sm font-bold ${getWeightTextClass()}`}>
                            {totalWeightKg.toFixed(2)} kg
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                            Sức chở xe: <span className="font-semibold">{getVehicleCapacityText()}</span>
                            {totalItems > 0 && (
                                <>
                                    {' '}• Tổng số lượng: <span className="font-semibold">{totalItems}</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>
                {minOrdersPerTrip && (
                    <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 text-[11px] text-amber-800">
                        Cần tối thiểu <span className="font-bold">{minOrdersPerTrip} đơn</span> trong một chuyến để bắt đầu giao hàng (MIN_ORDERS_PER_TRIP).
                    </div>
                )}
            </div>

            <div className="mb-8 rounded-xl border border-border bg-card p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Thông tin chuyến
                    </p>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground text-xs">Mã chuyến</span>
                        <span className="font-mono font-semibold text-card-foreground">
                            {trip.tripCode ?? `TRIP-${trip._id.slice(-6).toUpperCase()}`}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground text-xs">Trạng thái</span>
                        <span className="text-xs font-semibold">
                            {getTripStatusLabel(trip.status)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground text-xs">Ghi chú</span>
                        <span className="text-xs text-card-foreground truncate max-w-[220px]">
                            {trip.notes || 'Không có'}
                        </span>
                    </div>
                </div>
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Phương tiện & thời gian
                    </p>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground text-xs">Loại xe</span>
                        <span className="text-xs font-semibold text-card-foreground">
                            {(trip as any).vehicleType?.name || 'Chưa gán'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground text-xs">Dự kiến giao</span>
                        <span className="text-xs text-card-foreground">
                            {(trip as any).plannedShipDate
                                ? new Date((trip as any).plannedShipDate as string).toLocaleString('vi-VN')
                                : 'Chưa đặt'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground text-xs">Khởi hành</span>
                        <span className="text-xs text-card-foreground">
                            {trip.departureTime
                                ? new Date(trip.departureTime).toLocaleString('vi-VN')
                                : 'Chưa khởi hành'}
                        </span>
                    </div>
                </div>
            </div>

            {ingredientSummary.length > 0 && (
                <div className="mb-6 rounded-xl border border-border bg-card p-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Nguyên liệu cần cho chuyến (ước tính)</h3>
                    <div className="flex flex-wrap gap-3">
                        {ingredientSummary.map((ing, idx) => (
                            <span
                                key={idx}
                                className="px-3 py-1.5 rounded-lg bg-secondary text-sm font-medium text-card-foreground border border-border"
                            >
                                {ing.name}: <span className="text-primary font-bold">{ing.totalQty.toFixed(1)} {ing.unit}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

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
                                        {getOrderStatusLabel(order.status)}
                                    </span>
                                    {trip.status === 'Planning' && user?.role !== 'KitchenStaff' && (
                                        <button
                                            type="button"
                                            onClick={() => setConfirmAction({ type: 'removeOrder', orderId: order._id })}
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
                                    <p className="text-[11px] text-muted-foreground mt-1 truncate">
                                        {typeof order.storeId === 'object' && (order.storeId as any)?.address
                                            ? (order.storeId as any).address
                                            : ''}
                                    </p>
                                </div>
                                <div className="text-right space-y-1">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Giá trị</p>
                                        <p className="text-sm font-bold text-primary mt-1">
                                            {formatCurrency(order.totalAmount || 0)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                            Người nhận
                                        </p>
                                        <p className="text-xs font-medium text-card-foreground">
                                            {order.recipientName || '—'}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {order.recipientPhone || ''}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {order.notes && (
                                <div className="mt-2 pt-2 border-t border-border text-[11px] text-muted-foreground">
                                    <span className="font-semibold">Ghi chú đơn hàng: </span>
                                    <span>{order.notes}</span>
                                </div>
                            )}
                            {order.items && order.items.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Sản phẩm trong đơn</p>
                                    <ul className="space-y-1.5 text-xs">
                                        {order.items.map((item: any, idx: number) => {
                                            const name = typeof item.productId === 'object' && item.productId?.name
                                                ? item.productId.name
                                                : `Sản phẩm #${idx + 1}`;
                                            const qty = item.quantity ?? item.approvedQuantity ?? 0;
                                            return (
                                                <li key={idx} className="flex justify-between gap-2">
                                                    <span className="text-card-foreground truncate">{name}</span>
                                                    <span className="font-semibold text-primary shrink-0">× {qty}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
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

            {/* Add Orders Modal */}
            {addOrdersModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-2xl bg-card border border-border text-card-foreground p-5 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Thêm đơn hàng vào chuyến xe</h2>
                            <button
                                type="button"
                                onClick={() => setAddOrdersModalOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                            Chọn các đơn hàng <strong>đã sẵn sàng giao (Ready_For_Shipping)</strong> để thêm vào chuyến xe.
                        </p>

                        {loadingAvailable ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                Đang tải đơn hàng...
                            </div>
                        ) : availableOrders.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                Không có đơn hàng nào đã sẵn sàng giao để thêm.
                            </div>
                        ) : (
                            <div className="max-h-72 overflow-y-auto space-y-2">
                                {availableOrders.map((order) => (
                                    <label
                                        key={order._id}
                                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors text-xs ${selectedOrderIds.includes(order._id)
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border/60 bg-background/60 hover:border-primary/30'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedOrderIds.includes(order._id)}
                                            onChange={() => toggleOrderSelection(order._id)}
                                            className="w-4 h-4 accent-primary"
                                        />
                                        <div className="flex-1">
                                            <span className="font-mono font-semibold">
                                                {order.orderCode || order._id.slice(-6).toUpperCase()}
                                            </span>
                                            <span className="ml-2 text-muted-foreground">
                                                {typeof order.storeId === 'object' && order.storeId?.storeName
                                                    ? order.storeId.storeName
                                                    : ''}
                                            </span>
                                        </div>
                                        <span className="font-semibold text-primary">
                                            {formatCurrency(order.totalAmount || 0)}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-border">
                            <span className="text-xs text-muted-foreground">
                                Đã chọn: <span className="font-bold text-foreground">{selectedOrderIds.length}</span> đơn
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAddOrdersModalOpen(false)}
                                    className="h-9 rounded-lg px-4 text-xs font-medium text-muted-foreground hover:bg-secondary"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddOrdersToTrip}
                                    disabled={isAddingOrders || selectedOrderIds.length === 0}
                                    className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {isAddingOrders ? 'Đang thêm...' : `Thêm ${selectedOrderIds.length} đơn hàng`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {confirmAction && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 backdrop-blur-sm bg-black/50">
                    <div className="w-full max-w-sm rounded-[28px] border border-border shadow-2xl p-6 text-center animate-in zoom-in-95 bg-card text-card-foreground">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-black uppercase mb-2 text-foreground">
                            {confirmAction.type === 'startShipping' && 'Bắt đầu giao chuyến hàng?'}
                            {confirmAction.type === 'removeOrder' && 'Gỡ đơn khỏi chuyến xe?'}
                        </h3>
                        <p className="text-sm mb-6 text-muted-foreground">
                            {confirmAction.type === 'startShipping' &&
                                'Chuyến hàng sẽ được chuyển sang trạng thái đang giao (In Transit).'}
                            {confirmAction.type === 'removeOrder' &&
                                'Đơn hàng này sẽ được gỡ ra khỏi chuyến xe hiện tại và có thể được gom vào chuyến khác.'}
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmAction(null)}
                                className="flex-1 py-2.5 rounded-xl font-bold uppercase text-xs bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirmAction.type === 'startShipping') handleStartShipping();
                                    else if (confirmAction.type === 'removeOrder' && confirmAction.orderId) {
                                        handleRemoveOrder(confirmAction.orderId);
                                    }
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase text-xs transition-all flex items-center justify-center gap-2"
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShipmentDetail;