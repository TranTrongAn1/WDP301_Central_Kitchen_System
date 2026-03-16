import { Link, useLocation } from 'react-router-dom';
import { useThemeStore } from '@/shared/zustand/themeStore';
import { AppLogo } from '@/shared/components/AppLogo';

const MENU_ITEMS = [
  { icon: 'dashboard', label: 'Tổng quan', path: '/admin/dashboard' },
  { icon: 'storefront', label: 'Cửa hàng', path: '/admin/stores' },
  { icon: 'manage_accounts', label: 'Tài khoản', path: '/admin/account' },
  { icon: 'group', label: 'Người dùng', path: '/admin/users' },
  { icon: 'inventory_2', label: 'Kho & Lô hàng', path: '/admin/inventory' },
  { icon: 'restaurant_menu', label: 'Sản phẩm & Công thức', path: '/admin/products' },
  { icon: 'category', label: 'Danh mục', path: '/admin/categories' },
  { icon: 'science', label: 'Nguyên liệu', path: '/admin/ingredients' },
  { icon: 'local_shipping', label: 'Nhà cung cấp', path: '/admin/suppliers' },
  { icon: 'directions_car', label: 'Loại xe', path: '/admin/vehicle-types' },
  // Luồng Transfer cũ đã bỏ, ẩn khỏi menu Admin
  // { icon: 'swap_horiz', label: 'Transfers', path: '/admin/transfers' },
  { icon: 'account_balance_wallet', label: 'Thanh toán & Ví', path: '/admin/payment' },
  { icon: 'rate_review', label: 'Phản hồi', path: '/admin/feedback' },
  { icon: 'settings', label: 'Cài đặt hệ thống', path: '/admin/settings' },
];

export const AdminSidebar = () => {
  const { darkMode } = useThemeStore();
  const location = useLocation();

  return (
    <aside
      className={`w-64 min-h-screen flex flex-col transition-all duration-300 border-r ${darkMode
          ? 'bg-[#1C1C21] border-gray-800'
          : 'bg-white border-gray-200'
        }`}
    >
      {/* Logo Section */}
      <div
        className={`h-16 flex items-center px-6 border-b ${
          darkMode ? 'border-gray-800' : 'border-gray-100'
        }`}
      >
        <AppLogo textClassName="text-xs" />
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {MENU_ITEMS.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path + item.label}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                  ? 'bg-amber-500/10 text-amber-600'
                  : `${darkMode
                    ? 'text-gray-400 hover:text-white hover:bg-white/5'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
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