import { useState, useEffect } from 'react';
import {
    Plus,
    Truck,
    CheckCircle,
    X,
    Inbox,
    PenSquare,
    Send,
    ChevronLeft,
    ChevronRight,
    AlertTriangle
} from 'lucide-react';
import DeliveryTripApi, { type ITrip } from '@/api/DeliveryTripApi';
import { OrderApi, type Order } from '@/api/OrderApi';
import toast from 'react-hot-toast';
import { useThemeStore } from '@/shared/zustand/themeStore';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';

const ITEMS_PER_PAGE = 6; 

const Shipments = () => {
    const { darkMode } = useThemeStore();
    const navigate = useNavigate();
    
    const [trips, setTrips] = useState<ITrip[]>([]);
    const [allOrders, setAllOrders] = useState<Order[]>([]);

    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
    const [tripNotes, setTripNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editingTrip, setEditingTrip] = useState<ITrip | null>(null);
    const [tripToFinalize, setTripToFinalize] = useState<string | null>(null);

    // State Phân trang
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [tripRes, ordersData] = await Promise.all([
                DeliveryTripApi.getAllDeliveryTrips(),
                OrderApi.getAllOrders()
            ]);

            const tripList = Array.isArray(tripRes?.data) ? tripRes.data : [];
            setTrips(tripList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setAllOrders(Array.isArray(ordersData) ? ordersData : []);

        } catch (err) {
            console.error(err);
            toast.error('Lỗi đồng bộ dữ liệu vận chuyển');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- LOGIC: PHÂN TRANG (PAGINATION) ---
    const totalPages = Math.ceil(trips.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentTrips = trips.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

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

    // --- LOGIC: LỌC ĐƠN HÀNG KHẢ DỤNG ---
    const availableOrders = allOrders.filter(order => {
        const isApproved = order.status === 'Approved';
        
        const notInAnyTrip = !trips.some(trip => 
            trip.orders.some((tripOrder: any) => {
                const tripOrderId = typeof tripOrder === 'string' ? tripOrder : tripOrder._id;
                return tripOrderId === order._id;
            })
        );
        
        if (editingTrip) {
            const isInCurrentEditingTrip = editingTrip.orders.some((tripOrder: any) => {
                const tripOrderId = typeof tripOrder === 'string' ? tripOrder : tripOrder._id;
                return tripOrderId === order._id;
            });
            return isApproved && (notInAnyTrip || isInCurrentEditingTrip);
        }
        
        return isApproved && notInAnyTrip;
    });

    const openCreateModal = () => {
        setEditingTrip(null);
        setSelectedOrderIds([]);
        setTripNotes('');
        setShowModal(true);
    };

    const openEditModal = (trip: ITrip) => {
        setEditingTrip(trip);
        const mappedOrderIds = (trip.orders || []).map((o: any) => typeof o === 'string' ? o : o._id);
        setSelectedOrderIds(mappedOrderIds);
        setShowModal(true);
    };

    const handleSaveTrip = async () => {
        if (selectedOrderIds.length === 0) return toast.error('Vui lòng chọn ít nhất 1 đơn hàng');

        try {
            setIsCreating(true);

            if (editingTrip) {
                const initialOrderIds = (editingTrip.orders || []).map((o: any) => typeof o === 'string' ? o : o._id);
                const addedOrders = selectedOrderIds.filter(id => !initialOrderIds.includes(id));
                const removedOrders = initialOrderIds.filter(id => !selectedOrderIds.includes(id));

                if (addedOrders.length > 0) {
                    await DeliveryTripApi.addOrdersToDeliveryTrip(editingTrip._id, addedOrders);
                }
                if (removedOrders.length > 0) {
                    await DeliveryTripApi.removeOrdersFromDeliveryTrip(editingTrip._id, removedOrders);
                }
                toast.success('Cập nhật chuyến hàng thành công!');

            } else {
                const res = await DeliveryTripApi.createDeliveryTrip(selectedOrderIds, tripNotes || undefined);
                if (res?.success) toast.success(res?.message ?? 'Tạo chuyến hàng thành công!');
            }

            setShowModal(false);
            setSelectedOrderIds([]);
            setEditingTrip(null);
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error('Đã xảy ra lỗi khi lưu chuyến hàng');
        } finally {
            setIsCreating(false);
        }
    };

    // --- LOGIC: KHỞI HÀNH THỰC TẾ ---
    const executeFinalizeTrip = async () => {
        if (!tripToFinalize) return;

        try {
            await DeliveryTripApi.finalizeTrip(tripToFinalize);
            toast.success('Chuyến hàng đã bắt đầu khởi hành!');
            setTripToFinalize(null); // Đóng modal
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi khởi hành chuyến hàng');
        }
    };

    if (loading) return (
        <div className={`flex items-center justify-center h-64 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <span className="material-symbols-outlined animate-spin text-3xl mr-2">progress_activity</span>
            Đang tải dữ liệu Logistics...
        </div>
    );

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            <div className="flex justify-end mb-6">
                <button
                    onClick={openCreateModal}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-all active:scale-95 shadow-lg",
                        "bg-primary text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    )}
                >
                    <Plus className="w-5 h-5" /> New Trip
                </button>
            </div>

            {/* GRID LIST CHUYẾN ĐI */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentTrips.length === 0 ? (
                    <div className="col-span-full py-24 rounded-2xl border-2 border-dashed border-border bg-card/50 flex flex-col items-center justify-center">
                        <Inbox className="w-16 h-16 mb-4 text-muted-foreground" />
                        <p className="font-bold uppercase text-sm tracking-widest text-muted-foreground">
                            Chưa có chuyến hàng nào được tạo
                        </p>
                    </div>
                ) : (
                    currentTrips.map((trip) => (
                        <div
                            key={trip._id}
                            className={cn(
                                "rounded-xl border border-border bg-card p-5 flex flex-col transition-all group relative overflow-hidden",
                                "hover:shadow-md hover:border-primary/20"
                            )}
                        >
                            <div className="flex justify-between items-start mb-5">
                                <div className="p-3 rounded-xl border border-primary/20 bg-primary/10 flex items-center justify-center">
                                    <Truck className="w-6 h-6 text-primary" />
                                </div>
                                <span
                                    className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                        trip.status === "Planning" && "bg-muted text-muted-foreground border-border",
                                        trip.status === "In_Transit" && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                                        trip.status === "Completed" && "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
                                        !["Planning", "In_Transit", "Completed"].includes(trip.status) && "bg-muted text-muted-foreground border-border"
                                    )}
                                >
                                    {trip.status === "Planning" ? "Planning" : trip.status.replace("_", " ")}
                                </span>
                            </div>

                            <button
                                onClick={() => navigate(`/coordinator/shipments/${trip._id}`)}
                                className="w-full py-2.5 mb-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                            >
                                Xem chi tiết
                            </button>

                            <div className="space-y-1 mb-5 flex-1">
                                <h3 className="text-lg font-bold tracking-tight text-card-foreground">
                                    {trip.tripCode ?? `TRIP-${trip._id.slice(-6).toUpperCase()}`}
                                </h3>
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Số lượng: {trip.orders?.length || 0} đơn hàng
                                </p>
                            </div>

                            <div className="pt-4 border-t border-border flex justify-between items-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                <span>Khởi tạo:</span>
                                <span className="font-semibold text-card-foreground">
                                    {new Date(trip.createdAt).toLocaleDateString("vi-VN")}
                                </span>
                            </div>

                            {trip.status === "Planning" && (
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => openEditModal(trip)}
                                        className="flex-1 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors flex justify-center items-center gap-1.5 bg-secondary text-secondary-foreground hover:opacity-90"
                                        title="Chỉnh sửa chuyến xe"
                                    >
                                        <PenSquare className="w-4 h-4" /> Edit
                                    </button>
                                    <button
                                        onClick={() => setTripToFinalize(trip._id)}
                                        className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-wider hover:opacity-90 transition-colors flex justify-center items-center gap-1.5"
                                        title="Bắt đầu vận chuyển"
                                    >
                                        <Send className="w-4 h-4" /> Complete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* --- GIAO DIỆN PHÂN TRANG --- */}
            {totalPages > 1 && (
                <div className="flex justify-end items-center gap-2 mt-8 select-none">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <div className="flex items-center gap-1.5">
                        {getPageNumbers().map((page, index) => {
                            if (page === "...") {
                                return <span key={`dots-${index}`} className="px-2 text-muted-foreground">...</span>;
                            }
                            const isActive = currentPage === page;
                            return (
                                <button
                                    key={index}
                                    onClick={() => handlePageChange(page as number)}
                                    className={cn(
                                        "min-w-[36px] h-9 px-3 rounded-lg text-sm font-bold transition-all",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-md"
                                            : "bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-foreground"
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
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* --- 3. MODAL TẠO MỚI / CHỈNH SỬA TRIP --- */}
            {showModal && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm ${darkMode ? 'bg-black/60' : 'bg-black/40'}`}>
                    <div className={`w-full max-w-2xl rounded-[32px] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col ${darkMode ? 'bg-[#25252A] border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-gray-700/50 bg-[#2A2A30]' : 'border-gray-100 bg-gray-50'}`}>
                            <div>
                                <h2 className={`text-xl font-black uppercase italic ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {editingTrip ? 'Edit Delivery Trip' : 'Plan Delivery'}
                                </h2>
                                <p className={`text-[11px] font-bold uppercase mt-1 tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Chọn các đơn hàng đã duyệt ({availableOrders.length})
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {!editingTrip && (
                            <div className={`px-6 pb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">Ghi chú chuyến (tùy chọn, tối đa 500 ký tự)</label>
                                <input
                                    type="text"
                                    maxLength={500}
                                    placeholder="VD: Giao trước 10h sáng"
                                    value={tripNotes}
                                    onChange={(e) => setTripNotes(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${
                                        darkMode ? 'bg-[#1C1C21] border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                                    }`}
                                />
                            </div>
                        )}
                        <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar max-h-[50vh]">
                            {availableOrders.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className={`font-bold italic text-sm uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Không có đơn hàng nào chờ vận chuyển.
                                    </p>
                                </div>
                            ) : (
                                availableOrders.map((order) => (
                                    <label key={order._id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                        selectedOrderIds.includes(order._id)
                                            ? 'border-orange-500 bg-orange-500/10'
                                            : darkMode
                                                ? 'border-gray-700/50 bg-[#2A2A30] hover:border-gray-600'
                                                : 'border-gray-100 bg-white hover:border-orange-300 shadow-sm'
                                    }`}>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={selectedOrderIds.includes(order._id)}
                                                onChange={() => {
                                                    setSelectedOrderIds(prev =>
                                                        prev.includes(order._id) ? prev.filter(id => id !== order._id) : [...prev, order._id]
                                                    );
                                                }}
                                            />
                                            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                                                selectedOrderIds.includes(order._id)
                                                    ? 'bg-orange-500 border-orange-500'
                                                    : darkMode ? 'border-gray-500' : 'border-gray-300'
                                            }`}>
                                                {selectedOrderIds.includes(order._id) && <CheckCircle className="w-4 h-4 text-white" />}
                                            </div>
                                            <div>
                                                <p className={`font-black text-sm uppercase ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {order.orderCode || order._id.slice(-6)}
                                                </p>
                                                <p className={`text-[10px] font-bold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                                                    Requested: {new Date(order.requestedDeliveryDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-orange-500">
                                                {(order.totalAmount || 0).toLocaleString()}đ
                                            </p>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>

                        <div className={`p-6 border-t flex gap-4 ${darkMode ? 'bg-[#2A2A30] border-gray-700/50' : 'bg-gray-50 border-gray-100'}`}>
                            <button
                                onClick={() => setShowModal(false)}
                                className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors ${
                                    darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                disabled={selectedOrderIds.length === 0 || isCreating}
                                onClick={handleSaveTrip}
                                className="flex-[2] py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-all disabled:opacity-30 disabled:grayscale shadow-lg shadow-orange-500/20 active:scale-95"
                            >
                                {isCreating ? 'Saving...' : (editingTrip ? `Update Trip (${selectedOrderIds.length})` : `Create Trip (${selectedOrderIds.length})`)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 4. MODAL XÁC NHẬN KHỞI HÀNH (CONFIRM FINALIZE) --- */}
            {tripToFinalize && (
                <div className={`fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200 ${darkMode ? 'bg-black/70' : 'bg-black/40'}`}>
                    <div className={`w-full max-w-sm rounded-[32px] border shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200 ${
                        darkMode ? 'bg-[#25252A] border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${darkMode ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-50 text-orange-600'}`}>
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        
                        <h3 className={`text-xl font-black uppercase tracking-tight mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Xác nhận complete?
                        </h3>
                        <p className={`text-sm mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Chuyến xe này sẽ chuyển sang trạng thái <strong className={darkMode ? 'text-white' : 'text-black'}>In Transit</strong>. Các đơn hàng sẽ bắt đầu được giao. Bạn không thể thay đổi danh sách đơn hàng sau khi khởi hành.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setTripToFinalize(null)}
                                className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors ${
                                    darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={executeFinalizeTrip}
                                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Send className="w-4 h-4" /> Khởi hành
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { 
                    background: ${darkMode ? '#4b5563' : '#cbd5e1'}; 
                    border-radius: 10px; 
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
                    background: ${darkMode ? '#6b7280' : '#94a3b8'}; 
                }
            `}} />
        </div>
    );
};

export default Shipments;