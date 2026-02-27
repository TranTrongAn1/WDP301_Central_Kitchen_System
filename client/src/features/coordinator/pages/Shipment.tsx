import { useState, useEffect } from 'react';
import {
    PlusIcon,
    TruckIcon,
    CheckCircleIcon,
    XMarkIcon,
    InboxStackIcon,
    PencilSquareIcon,
    PaperAirplaneIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ExclamationTriangleIcon // Icon cảnh báo cho Modal Confirm
} from '@heroicons/react/24/outline';
import DeliveryTripApi, { type ITrip } from '../../../api/DeliveryTripApi';
import { OrderApi, type Order } from '../../../api/OrderApi';
import { toast } from 'react-toastify';
import { useThemeStore } from '@/shared/zustand/themeStore';
import { useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE = 6; 

const Shipments = () => {
    const { darkMode } = useThemeStore();
    const navigate = useNavigate();
    
    const [trips, setTrips] = useState<ITrip[]>([]);
    const [allOrders, setAllOrders] = useState<Order[]>([]);

    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editingTrip, setEditingTrip] = useState<ITrip | null>(null);

    // State cho Modal Xác nhận Khởi hành (Lưu ID của chuyến xe đang chuẩn bị khởi hành)
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

            if (tripRes.success) {
                const sortedTrips = tripRes.data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setTrips(sortedTrips);
            }
            setAllOrders(ordersData || []);

        } catch (err) {
            console.error(err);
            toast.error("Lỗi đồng bộ dữ liệu vận chuyển");
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
        setShowModal(true);
    };

    const openEditModal = (trip: ITrip) => {
        setEditingTrip(trip);
        const mappedOrderIds = (trip.orders || []).map((o: any) => typeof o === 'string' ? o : o._id);
        setSelectedOrderIds(mappedOrderIds);
        setShowModal(true);
    };

    const handleSaveTrip = async () => {
        if (selectedOrderIds.length === 0) return toast.warn("Vui lòng chọn ít nhất 1 đơn hàng");

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
                toast.success("Cập nhật chuyến hàng thành công!");

            } else {
                const res = await DeliveryTripApi.createDeliveryTrip(selectedOrderIds);
                if (res.success) toast.success("Tạo chuyến hàng thành công!");
            }

            setShowModal(false);
            setSelectedOrderIds([]);
            setEditingTrip(null);
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Đã xảy ra lỗi khi lưu chuyến hàng");
        } finally {
            setIsCreating(false);
        }
    };

    // --- LOGIC: KHỞI HÀNH THỰC TẾ ---
    const executeFinalizeTrip = async () => {
        if (!tripToFinalize) return;

        try {
            await DeliveryTripApi.finalizeTrip(tripToFinalize);
            toast.success("Chuyến hàng đã bắt đầu khởi hành!");
            setTripToFinalize(null); // Đóng modal
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi khởi hành chuyến hàng");
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

            {/* 1. HEADER SECTION */}
            <div className={`flex justify-between items-end border-b pb-6 mb-8 ${darkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
                <div>
                    <h1 className={`text-3xl font-black uppercase italic tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Delivery <span className="text-orange-500">Trips</span>
                    </h1>
                    <p className={`text-xs font-bold uppercase mt-1 tracking-widest ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Hệ thống quản lý chuyến giao hàng
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-orange-500/20"
                >
                    <PlusIcon className="w-5 h-5" /> New Trip
                </button>
            </div>

            {/* 2. GRID LIST CHUYẾN ĐI */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentTrips.length === 0 ? (
                    <div className={`col-span-full py-24 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center transition-colors ${darkMode ? 'border-gray-700/50 bg-[#25252A]/30' : 'bg-gray-50/50 border-gray-300'}`}>
                        <InboxStackIcon className={`w-16 h-16 mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                        <p className={`font-bold uppercase text-sm tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Chưa có chuyến hàng nào được tạo
                        </p>
                    </div>
                ) : (
                    currentTrips.map((trip) => (
                        <div
                            key={trip._id}
                            className={`rounded-3xl p-5 flex flex-col transition-all group relative overflow-hidden border ${
                                darkMode
                                    ? 'bg-[#1e1e24] border-orange-500/30 hover:border-orange-500 shadow-md shadow-black/50'
                                    : 'bg-white border-orange-200 shadow-sm hover:border-orange-400 hover:shadow-md'
                            }`}
                        >
                            <div className="absolute top-0 left-0 w-32 h-32 bg-orange-500/5 rounded-full -ml-10 -mt-10 blur-2xl pointer-events-none"></div>

                            <div className="flex justify-between items-start mb-5 relative z-10">
                                <div className={`p-3 rounded-xl border border-orange-500/20 text-orange-500 flex items-center justify-center ${darkMode ? 'bg-[#2a2a30]' : 'bg-orange-50'}`}>
                                    <TruckIcon className="w-6 h-6" />
                                </div>

                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                    trip.status === 'Planning' ? (darkMode ? 'bg-gray-800 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-600 border-gray-300') :
                                    trip.status === 'In_Transit' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                    trip.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                    darkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-200'
                                }`}>
                                    {trip.status === 'Planning' ? 'Planning' : trip.status.replace('_', ' ')}
                                </span>
                            </div>

                            <button
                                onClick={() => navigate(`/shipments/${trip._id}`)}
                                className={`w-full py-2.5 mb-5 rounded-xl font-black text-[11px] uppercase tracking-[0.15em] transition-all relative z-10 ${
                                    darkMode
                                        ? 'bg-[#2a2a30] text-orange-500 hover:bg-[#323238] hover:text-orange-400'
                                        : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                }`}
                            >
                                Xem chi tiết
                            </button>

                            <div className="space-y-1 mb-5 relative z-10 flex-1">
                                <h3 className={`text-xl font-black tracking-tighter uppercase flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Trip ID: {trip._id.slice(-6).toUpperCase()}
                                </h3>
                                <p className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Số lượng: {trip.orders?.length || 0} đơn hàng
                                </p>
                            </div>

                            <div className={`pt-4 border-t flex justify-between items-center text-xs font-bold uppercase tracking-widest relative z-10 ${darkMode ? 'border-gray-700/50 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                                <span>Khởi tạo:</span>
                                <span className={darkMode ? 'text-white font-black' : 'text-gray-900 font-black'}>
                                    {new Date(trip.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                            </div>

                            {trip.status === 'Planning' && (
                                <div className="flex gap-2 mt-4 relative z-10">
                                    <button
                                        onClick={() => openEditModal(trip)}
                                        className={`flex-1 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors flex justify-center items-center gap-1.5 ${darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                        title="Chỉnh sửa chuyến xe"
                                    >
                                        <PencilSquareIcon className="w-4 h-4" /> Edit
                                    </button>

                                    <button
                                        onClick={() => setTripToFinalize(trip._id)} // Mở Modal Confirm thay vì gọi API ngay
                                        className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-bold text-[10px] uppercase tracking-wider hover:bg-orange-600 transition-colors flex justify-center items-center gap-1.5 shadow-md shadow-orange-500/20"
                                        title="Bắt đầu vận chuyển"
                                    >
                                        <PaperAirplaneIcon className="w-4 h-4" /> Complete
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
                        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors rounded-lg disabled:opacity-30 disabled:hover:bg-transparent ${
                            darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-white/5' : 'text-indigo-600 hover:bg-indigo-50'
                        }`}
                    >
                        <ChevronLeftIcon className="w-4 h-4" />
                        Back
                    </button>

                    <div className="flex items-center gap-1.5">
                        {getPageNumbers().map((page, index) => {
                            if (page === '...') {
                                return <span key={`dots-${index}`} className={`px-2 font-bold ${darkMode ? 'text-indigo-500/50' : 'text-indigo-300'}`}>...</span>;
                            }

                            const isActive = currentPage === page;
                            return (
                                <button
                                    key={index}
                                    onClick={() => handlePageChange(page as number)}
                                    className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-bold transition-all ${
                                        isActive
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                            : darkMode
                                                ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                                                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                    }`}
                                >
                                    {page}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors rounded-lg disabled:opacity-30 disabled:hover:bg-transparent ${
                            darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-white/5' : 'text-indigo-600 hover:bg-indigo-50'
                        }`}
                    >
                        Next
                        <ChevronRightIcon className="w-4 h-4" />
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
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

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
                                                {selectedOrderIds.includes(order._id) && <CheckCircleIcon className="w-4 h-4 text-white" />}
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
                            <ExclamationTriangleIcon className="w-8 h-8" />
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
                                <PaperAirplaneIcon className="w-4 h-4" /> Khởi hành
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