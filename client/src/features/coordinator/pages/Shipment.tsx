import React, { useState, useEffect } from 'react';
import { 
    PlusIcon, 
    TruckIcon, 
    CheckCircleIcon, 
    XMarkIcon, 
    InboxStackIcon
} from '@heroicons/react/24/outline';
import DeliveryTripApi, { type ITrip } from '../../../api/DeliveryTripApi';
import { OrderApi, type Order } from '../../../api/OrderApi';
import { toast } from 'react-toastify';
import { useThemeStore } from '@/shared/zustand/themeStore';

const Shipments = () => {
    const { darkMode } = useThemeStore();
    
    const [trips, setTrips] = useState<ITrip[]>([]); 
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [tripRes, ordersData] = await Promise.all([
                DeliveryTripApi.getAllDeliveryTrips(),
                OrderApi.getAllOrders()
            ]);

            if (tripRes.success) setTrips(tripRes.data);
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

    const availableOrders = allOrders.filter(order => {
        const isApproved = order.status === 'Approved';
        const notInTrip = !trips.some(trip => trip.orders.includes(order._id));
        return isApproved && notInTrip;
    });

    const handleCreateTrip = async () => {
        if (selectedOrderIds.length === 0) return toast.warn("Vui lòng chọn ít nhất 1 đơn hàng");
        
        try {
            setIsCreating(true);
            const res = await DeliveryTripApi.createDeliveryTrip(selectedOrderIds);
            if (res.success) {
                toast.success("Tạo chuyến hàng thành công!");
                setShowModal(false);
                setSelectedOrderIds([]);
                fetchData(); 
            }
        } catch (err) {
            toast.error("Không thể tạo chuyến hàng");
        } finally {
            setIsCreating(false);
        }
    };

    if (loading) return (
        <div className={`flex items-center justify-center h-64 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <span className="material-symbols-outlined animate-spin text-3xl mr-2">progress_activity</span>
            Đang tải dữ liệu Logistics...
        </div>
    );

    return (
        // Đã xóa bg-[#121212] và min-h-screen để component tự hòa vào nền của Layout cha
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
                    onClick={() => setShowModal(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-orange-500/20"
                >
                    <PlusIcon className="w-5 h-5" /> New Trip
                </button>
            </div>

            {/* 2. GRID LIST CHUYẾN ĐI */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {trips.length === 0 ? (
                    <div className={`col-span-full py-24 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center transition-colors ${
                        darkMode ? 'border-gray-700/50 bg-[#25252A]/30' : 'bg-gray-50/50 border-gray-300'
                    }`}>
                        <InboxStackIcon className={`w-16 h-16 mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                        <p className={`font-bold uppercase text-sm tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Chưa có chuyến hàng nào được tạo
                        </p>
                    </div>
                ) : (
                    trips.map((trip) => (
                        <div key={trip._id} className={`rounded-[24px] p-6 transition-all group relative overflow-hidden border ${
                            // Đổi thẻ Card sang màu #25252A giống trang Order cho đồng bộ
                            darkMode 
                                ? 'bg-[#25252A] border-gray-700/50 hover:border-orange-500/50' 
                                : 'bg-white border-gray-200 shadow-sm hover:border-orange-400 hover:shadow-md'
                        }`}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-orange-500/20 transition-colors"></div>
                            
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className={`p-3 rounded-xl text-orange-500 ${darkMode ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
                                    <TruckIcon className="w-7 h-7" />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    trip.status === 'In_Transit' ? 'bg-blue-500/20 text-blue-500' : 
                                    trip.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-500' : 
                                    darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {trip.status.replace('_', ' ')}
                                </span>
                            </div>

                            <div className="space-y-1 mb-6 relative z-10">
                                <h3 className={`text-lg font-black tracking-tight uppercase ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Trip ID: {trip._id.slice(-6)}
                                </h3>
                                <p className={`text-[11px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Số lượng: {trip.orders?.length || 0} đơn hàng
                                </p>
                            </div>

                            <div className={`pt-4 border-t flex justify-between items-center text-[11px] font-bold uppercase tracking-wider relative z-10 ${darkMode ? 'border-gray-700/50 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                                <span>Khởi tạo:</span>
                                <span className={darkMode ? 'text-gray-300' : 'text-gray-800'}>
                                    {new Date(trip.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 3. MODAL CREATE TRIP */}
            {showModal && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm ${darkMode ? 'bg-black/60' : 'bg-black/40'}`}>
                    <div className={`w-full max-w-2xl rounded-[32px] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col ${
                        darkMode ? 'bg-[#25252A] border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                        
                        {/* Modal Header */}
                        <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-gray-700/50 bg-[#2A2A30]' : 'border-gray-100 bg-gray-50'}`}>
                            <div>
                                <h2 className={`text-xl font-black uppercase italic ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Plan Delivery
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

                        {/* Modal Body */}
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
                                                    {order.orderCode}
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

                        {/* Modal Footer */}
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
                                onClick={handleCreateTrip}
                                className="flex-[2] py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-all disabled:opacity-30 disabled:grayscale shadow-lg shadow-orange-500/20 active:scale-95"
                            >
                                {isCreating ? 'Creating...' : `Create Trip (${selectedOrderIds.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style dangerouslySetInnerHTML={{ __html: `
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