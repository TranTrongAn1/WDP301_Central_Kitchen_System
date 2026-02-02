import { Link, useLocation } from 'react-router-dom';
import { useThemeStore } from '@/shared/zustand/themeStore';

const MENU_ITEMS = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  { icon: 'storefront', label: 'Stores', path: '/admin/store' },
  { icon: 'manage_accounts', label: 'Accounts', path: '/admin/account' },
  { icon: 'settings', label: 'Setting System', path: '/admin/setting' },
  { icon: 'group', label: 'Users', path: '/admin/users' },
];

export const AdminSidebar = () => {
  const { darkMode } = useThemeStore();
  const location = useLocation();

  return (
    <aside
      className={`w-64 min-h-screen flex flex-col transition-all duration-300 border-r ${
        darkMode
          ? 'bg-[#1C1C21] border-gray-800' // Dark Mode: Nền đen, viền tối
          : 'bg-white border-gray-200'     // Light Mode: Nền trắng, viền xám nhạt
      }`}
    >
      {/* --- LOGO SECTION --- */}
      <div className={`h-16 flex items-center px-6 border-b ${
          darkMode ? 'border-gray-800' : 'border-gray-100'
      }`}>
        <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
                 <span className="material-symbols-outlined text-amber-500">bakery_dining</span>
            </div>
            <div>
                <h1 className={`font-bold text-lg ${
                    darkMode ? 'text-white' : 'text-gray-900' // Đổi màu chữ Logo
                }`}>
                    Kendo Bakery
                </h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Admin Portal</p>
            </div>
        </div>
      </div>

      {/* --- MENU ITEMS --- */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {MENU_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-amber-500/10 text-amber-600' // Active State (Giữ màu cam chủ đạo)
                  : `${
                      darkMode 
                        ? 'text-gray-400 hover:text-white hover:bg-white/5' // Dark Item
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100' // Light Item
                    }`
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
};