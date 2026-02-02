import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AdminSidebar } from './components/AdminSidebar';
import { useThemeStore } from '@/shared/zustand/themeStore';
import { useAuthStore } from '@/shared/zustand/authStore'; 

const PAGE_TITLE: Record<string, { name: string; desc: string }> = {
    "/admin": { name: "Dashboard", desc: "Tổng quan hệ thống" },
    "/admin/users": { name: "User Management", desc: "Quản lý người dùng & phân quyền" },
    "/admin/stores": { name: "Store Management", desc: "Quản lý danh sách cửa hàng" },
    "/admin/settings": { name: "Settings", desc: "Cài đặt hệ thống" },
};

export const AdminLayout = () => {
    const { darkMode, toggleDarkMode } = useThemeStore();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get user from Store
    const { user, logout } = useAuthStore(); 
    
    // Use optional chaining to prevent null errors
    const roleName = user?.role || 'Admin';

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotiOpen, setIsNotiOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const notiRef = useRef<HTMLDivElement>(null);

    const currentPage = PAGE_TITLE[location.pathname] || { name: "Admin Portal", desc: "Quản trị viên" };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
            if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
                setIsNotiOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
            logout(); 
            navigate('/login');
        }
    };

    const dropdownItemClass = `w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
        darkMode ? 'hover:bg-gray-700/50 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
    }`;

    return (
        <div className={`flex h-screen w-full transition-colors duration-300 ${
            darkMode ? 'bg-[#1C1C21] text-foreground' : 'bg-gray-50 text-gray-900'
        }`}>
            <AdminSidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className={`h-[73px] flex items-center justify-between px-6 border-b z-40 sticky top-0 transition-all duration-300 ${
                    darkMode ? 'bg-[#1C1C21] border-gray-800' : 'bg-white border-orange-100'
                }`}>
                    
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold">{currentPage.name}</h1>
                        <h2 className="text-sm text-gray-500">{currentPage.desc}</h2>
                    </div>

                    <div className="hidden md:flex flex-1 max-w-md mx-8">
                        <div className="relative w-full">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">search</span>
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm..." 
                                className={`w-full pl-10 pr-4 py-2.5 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all duration-200 ${
                                    darkMode ? 'bg-[#25252A] border-gray-700 hover:bg-gray-800' : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                                }`}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={toggleDarkMode} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                            darkMode ? 'bg-gray-800 text-amber-400 hover:bg-gray-700' : 'bg-orange-50 text-amber-600 hover:bg-orange-100'
                        }`}>
                            <span className="material-symbols-outlined text-[20px]">{darkMode ? 'light_mode' : 'dark_mode'}</span>
                        </button>

                        <div className="relative" ref={notiRef}>
                            <button onClick={() => setIsNotiOpen(!isNotiOpen)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                                darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-orange-100 text-gray-600'
                            }`}>
                                <span className="material-symbols-outlined text-[22px]">notifications</span>
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#1C1C21]"></span>
                            </button>
                            {isNotiOpen && (
                                <div className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right ${
                                    darkMode ? 'bg-[#25252A] border-gray-700' : 'bg-white border-orange-100'
                                }`}>
                                    <div className={`p-4 border-b font-semibold ${darkMode ? 'border-gray-700' : 'border-orange-100'}`}>Thông báo</div>
                                    <div className="p-4 text-sm text-center text-gray-500">Chưa có thông báo mới</div>
                                </div>
                            )}
                        </div>

                        <div className="relative" ref={profileRef}>
                            <button onClick={() => setIsProfileOpen(!isProfileOpen)} className={`flex items-center gap-2 p-1.5 pr-3 rounded-full transition-all duration-200 ${
                                darkMode ? 'hover:bg-gray-800' : 'hover:bg-orange-100'
                            }`}>
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm font-bold text-white bg-amber-600`}>
                                    {/* Use optional chaining */}
                                    {user?.username?.charAt(0).toUpperCase() || 'A'}
                                </div>
                                <div className="hidden sm:block text-left">
                                    {/* Use optional chaining */}
                                    <p className="text-sm font-medium leading-none">{user?.username || 'Admin'}</p>
                                    <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{roleName}</p>
                                </div>
                                <span className={`material-symbols-outlined text-gray-400 text-[18px] transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>

                            {isProfileOpen && (
                                <div className={`absolute right-0 top-full mt-2 w-64 rounded-2xl shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right p-1 ${
                                    darkMode ? 'bg-[#25252A] border-gray-700' : 'bg-white border-orange-100'
                                }`}>
                                    <div className={`px-4 py-3 mb-1 border-b ${darkMode ? 'border-gray-700/50' : 'border-orange-100'}`}>
                                        {/* Use optional chaining */}
                                        <p className="font-semibold text-sm">{user?.username}</p>
                                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                    </div>
                                    
                                    <button className={dropdownItemClass}><span className="material-symbols-outlined text-[20px]">person</span> Hồ sơ cá nhân</button>
                                    <button className={dropdownItemClass}><span className="material-symbols-outlined text-[20px]">settings</span> Cài đặt</button>
                                    <button className={dropdownItemClass}><span className="material-symbols-outlined text-[20px]">help</span> Trợ giúp</button>

                                    <div className={`mt-1 pt-1 border-t ${darkMode ? 'border-gray-700/50' : 'border-orange-100'}`}>
                                        <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-red-500 ${darkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}>
                                            <span className="material-symbols-outlined text-[20px]">logout</span> Đăng xuất
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-6 scroll-smooth bg-transparent">
                    <Outlet /> 
                </div>
            </main>
        </div>
    );
};