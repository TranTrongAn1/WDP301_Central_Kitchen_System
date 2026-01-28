import { Link, useLocation } from 'react-router-dom';
import { useThemeStore } from '@/shared/zustand/themeStore';

const MENU_ITEMS = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  { icon: 'shopping_bag', label: 'Orders', path: '/admin/orders' },
  { icon: 'sell', label: 'Products', path: '/admin/products' },
  { icon: 'inventory_2', label: 'Inventory', path: '/admin/inventory' },
  { icon: 'group', label: 'Users', path: '/admin/users' },
  { icon: 'settings', label: 'Settings', path: '/admin/settings' },
];

export const AdminSidebar = () => {
  const { darkMode } = useThemeStore();
  const location = useLocation();

  return (
    <aside
      className={`w-64 min-h-screen flex flex-col transition-all duration-300 border-r ${
        darkMode
          ? 'bg-background border-border' // Dark Mode Colors
          : 'bg-[#1C1C21] border-gray-800' // Giữ màu tối cho Sidebar giống design gốc dù là Light Mode (hoặc đổi thành bg-white nếu muốn)
      }`}
    >
      {/* --- LOGO SECTION --- */}
      <div className="h-20 flex items-center px-6 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
                 <span className="material-symbols-outlined text-amber-500">bakery_dining</span>
            </div>
            <div>
                <h1 className={`font-bold text-lg ${darkMode ? 'text-foreground' : 'text-white'}`}>
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
                  ? 'bg-primary/20 text-primary' // Active State
                  : `${darkMode ? 'text-muted-foreground hover:text-foreground hover:bg-secondary' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* --- USER PROFILE (BOTTOM) --- */}
      <div className={`p-4 border-t ${darkMode ? 'border-border' : 'border-gray-700/50'}`}>
        <div className="flex items-center gap-3">
            <img 
                src="https://ui-avatars.com/api/?name=Jane+Cooper&background=random" 
                alt="User" 
                className="w-10 h-10 rounded-full"
            />
            <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-foreground' : 'text-white'}`}>Jane Cooper</p>
                <p className="text-xs text-gray-500">jane@kendobakery.com</p>
            </div>
        </div>
      </div>
    </aside>
  );
};