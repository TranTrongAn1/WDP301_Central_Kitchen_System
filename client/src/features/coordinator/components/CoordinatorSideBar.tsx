import { Link, useLocation } from 'react-router-dom';
import { useThemeStore } from '@/shared/zustand/themeStore';

const MENU_ITEMS = [
  { 
    icon: 'dashboard', 
    label: 'Dashboard', 
    path: '/coordinator/dashboard' 
  },
  { 
    icon: 'list_alt', 
    label: 'Store Orders', 
    path: '/coordinator/orders' 
  },
  { 
    icon: 'local_shipping', 
    label: 'Shipments', 
    path: '/coordinator/shipments' 
  },
  { 
    icon: 'inventory_2', 
    label: 'Finished Goods', 
    path: '/coordinator/inventory' 
  },
  { 
    icon: 'report_problem', 
    label: 'Issues & Returns', 
    path: '/coordinator/issues' 
  },
];

export const CoordinatorSidebar = () => {
  const { darkMode } = useThemeStore();
  const location = useLocation();

  return (
    <aside
      className={`w-64 min-h-screen flex flex-col transition-all duration-300 border-r ${
        darkMode
          ? 'bg-[#1C1C21] border-gray-800' 
          : 'bg-white border-gray-200'    
      }`}
    >
      {/* --- LOGO SECTION --- */}
      <div className={`h-[73px] flex items-center px-6 border-b ${
          darkMode ? 'border-gray-800' : 'border-gray-100'
      }`}>
        <div className="flex items-center gap-3">
            {/* Đổi background và text icon sang màu Amber */}
            <div className="p-2 bg-amber-500/10 rounded-lg">
                 <span className="material-symbols-outlined text-amber-500">local_shipping</span>
            </div>
            <div>
                <h1 className={`font-bold text-lg ${
                    darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                    Kendo Bakery
                </h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Logistics Portal</p>
            </div>
        </div>
      </div>

      {/* --- MENU ITEMS --- */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {MENU_ITEMS.map((item) => {
          // Kiểm tra active: dùng startsWith để giữ active khi vào trang con
          const isActive = location.pathname.startsWith(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-amber-500/10 text-amber-600' // Active state: Màu Cam/Amber
                  : `${
                      darkMode 
                        ? 'text-gray-400 hover:text-white hover:bg-white/5'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};