import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import toast from "react-hot-toast";

import { useAuthStore } from "@/shared/zustand/authStore";
import { authApi } from "@/api/AuthApi";
import { useThemeStore } from "@/shared/zustand/themeStore";
import { cn } from "@/shared/lib/utils";
import {
  Sun,
  Moon,
  Menu,
  ChevronDown,
  User,
  LogOut,
  Settings,
  HelpCircle,
} from "lucide-react";

interface DashboardHeaderProps {
  isSidebarCollapsed?: boolean;
  onMenuClick?: () => void;
}

const PAGE_NAME: Record<string, { name: string; title: string }> = {
  // Manager
  "/manager/dashboard": { name: "Dashboard", title: "Tổng quan hệ thống" },
  "/manager/orders": { name: "Orders & Shipments", title: "Quản lý đơn hàng & giao hàng" },
  "/manager/production": { name: "Production Plans", title: "Kế hoạch sản xuất" },
  "/manager/production/batches": { name: "Finished Batches", title: "Lô thành phẩm" },
  "/manager/production/:id": { name: "Production Plan Detail", title: "Chi tiết kế hoạch sản xuất" },
  "/manager/inventory": { name: "Inventory & Batches", title: "Kho & Lô hàng" },
  "/manager/products": { name: "Products & Recipes", title: "Sản phẩm & Công thức" },
  "/manager/products/:id": { name: "Product Detail", title: "Chi tiết sản phẩm" },
  "/manager/stores": { name: "Stores", title: "Quản lý cửa hàng" },
  "/manager/ingredients": { name: "Ingredients", title: "Quản lý nguyên liệu" },
  "/manager/categories": { name: "Categories", title: "Quản lý danh mục" },
  "/manager/reports": { name: "Reports & Analytics", title: "Báo cáo & Phân tích" },
  "/manager/users": { name: "Users & Roles", title: "Quản lý người dùng" },
  "/manager/settings": { name: "Settings", title: "Cài đặt hệ thống" },
  "/manager/feedback": { name: "Feedback", title: "Danh sách phản hồi" },
  "/manager/suppliers": { name: "Suppliers", title: "Quản lý nhà cung cấp" },
  "/manager/vehicle-types": { name: "Vehicle Types", title: "Quản lý loại xe" },
  // Admin
  "/admin/dashboard": { name: "Admin Dashboard", title: "Tổng quan hệ thống" },
  "/admin/account": { name: "Accounts", title: "Quản lý tài khoản" },
  "/admin/stores": { name: "Stores", title: "Quản lý danh sách cửa hàng" },
  "/admin/orders": { name: "Orders & Shipments", title: "Quản lý đơn hàng & chuyến giao" },
  "/admin/production": { name: "Production Plans", title: "Kế hoạch sản xuất" },
  "/admin/production/batches": { name: "Finished Batches", title: "Lô thành phẩm" },
  "/admin/inventory": { name: "Inventory & Batches", title: "Kho & Lô hàng" },
  "/admin/products": { name: "Products & Recipes", title: "Sản phẩm & Công thức" },
  "/admin/categories": { name: "Categories", title: "Danh mục sản phẩm" },
  "/admin/ingredients": { name: "Ingredients", title: "Nguyên liệu" },
  "/admin/suppliers": { name: "Suppliers", title: "Nhà cung cấp" },
  "/admin/vehicle-types": { name: "Vehicle Types", title: "Loại xe vận chuyển" },
  "/admin/payment": { name: "Payment & Wallet", title: "Thanh toán & Ví cửa hàng" },
  "/admin/feedback": { name: "Feedback", title: "Danh sách phản hồi" },
  "/admin/settings": { name: "Settings", title: "Cài đặt hệ thống" },
  "/coordinator/dashboard": { name: "Logistics Dashboard", title: "Tổng quan vận chuyển & điều phối" },
  "/coordinator/orders": { name: "Store Orders", title: "Đơn hàng từ cửa hàng" },
  "/coordinator/orders/:id": { name: "Order Detail", title: "Chi tiết đơn hàng" },
  "/coordinator/shipments": { name: "Shipments", title: "Lập lịch & theo dõi chuyến giao hàng" },
  "/coordinator/shipments/:id": { name: "Shipment Detail", title: "Chi tiết chuyến giao hàng" },
  "/coordinator/inventory": { name: "Finished Goods", title: "Kho thành phẩm sẵn sàng giao" },
  "/coordinator/issues": { name: "Issues & Returns", title: "Xử lý sự cố & đổi trả" },
  "/store/dashboard": { name: "Store Dashboard", title: "Tổng quan hoạt động cửa hàng" },
  "/store/orders": { name: "Store Orders", title: "Đơn nội bộ & phản hồi" },
  "/store/orders/new": { name: "Create Store Order", title: "Tạo đơn nội bộ từ catalog sản phẩm" },
  "/store/inventory": { name: "Store Inventory", title: "Tồn kho thành phẩm tại cửa hàng" },
  "/kitchen/dashboard": { name: "Kitchen Dashboard", title: "Tổng quan bếp & sản xuất" },
  "/kitchen/production": { name: "Kitchen Production", title: "Kế hoạch sản xuất của bếp" },
  "/kitchen/production/queue": { name: "Production Queue", title: "Ưu tiên sản xuất trong ngày" },
  "/kitchen/production/batches": { name: "Kitchen Batches", title: "Lô thành phẩm do bếp sản xuất" },
  "/kitchen/trips": { name: "Kitchen Trips", title: "Chuyến giao cần bếp chuẩn bị & đánh dấu Ready" },
  "/profile": { name: "Hồ sơ cá nhân", title: "Thông tin tài khoản và vai trò của bạn" },
  "/settings": { name: "Cài đặt", title: "Giao diện, thông báo và cấu hình hệ thống" },
  "/help": { name: "Trợ giúp", title: "Hướng dẫn sử dụng và kênh hỗ trợ" },
};

export const DashboardHeader = ({ onMenuClick }: DashboardHeaderProps) => {
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const path = location.pathname;
  const pageName =
    PAGE_NAME[path] ??
    (path.startsWith("/coordinator/orders/")
      ? { name: "Order Detail", title: "Chi tiết đơn hàng" }
      : path.startsWith("/coordinator/shipments/")
        ? { name: "Shipment Detail", title: "Chi tiết chuyến giao hàng" }
        : path.startsWith("/store/orders/")
          ? { name: "Order Detail", title: "Chi tiết đơn hàng cửa hàng" }
          : { name: "Dashboard", title: "Tổng quan" });

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Nếu BE không hỗ trợ logout hoặc lỗi mạng, vẫn cho đăng xuất FE.
    } finally {
      logout();
      toast.success("Đăng xuất thành công!");
      navigate("/login");
    }
  };

  return (
    <header
      className={cn(
        "h-[73px] flex items-center justify-between sticky top-0 z-40 transition-all duration-300 border-b",
        darkMode
          ? "bg-card border-border"
          : "bg-white border-orange-100"
      )}
    >
      <div className="flex items-center gap-4 px-4">
        <button
          onClick={onMenuClick}
          className={cn(
            "lg:hidden p-2.5 rounded-full transition-all duration-200",
            darkMode
              ? "hover:bg-secondary text-muted-foreground"
              : "hover:bg-orange-100 text-muted-foreground"
          )}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-foreground">
            {pageName?.name}
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
            {pageName?.title}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4">
        <button
          onClick={toggleDarkMode}
          className={cn(
            "relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
            darkMode
              ? "bg-secondary hover:bg-secondary/80 text-amber-400"
              : "bg-secondary hover:bg-secondary/80 text-amber-600"
          )}
          aria-label="Toggle theme"
        >
          {darkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              "flex items-center gap-2 p-1.5 pr-3 rounded-full transition-all duration-200",
              darkMode
                ? "hover:bg-secondary"
                : "hover:bg-orange-100"
            )}
          >
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center shadow-md",
                darkMode
                  ? "bg-primary/20"
                  : "bg-primary/10"
              )}
            >
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-foreground">
                {user?.fullName || "User"}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.role?.replace(/([A-Z])/g, " $1").trim() || "Manager"}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                showUserMenu && "rotate-180"
              )}
            />
          </button>

          {showUserMenu && (
            <div
              className={cn(
                "absolute right-0 mt-2 w-56 rounded-2xl shadow-xl border overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150",
                darkMode
                  ? "bg-card border-border"
                  : "bg-white border-orange-100"
              )}
            >
              <div
                className={cn(
                  "p-4 border-b",
                  darkMode ? "border-border" : "border-orange-100"
                )}
              >
                <p className="font-semibold text-foreground">
                  {user?.fullName || "User"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user?.email || "user@example.com"}
                </p>
              </div>
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/profile');
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors",
                    darkMode
                      ? "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      : "text-muted-foreground hover:text-foreground hover:bg-orange-50"
                  )}
                >
                  <User className="h-4 w-4" />
                  <span className="text-sm">Hồ sơ cá nhân</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/settings');
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors",
                    darkMode
                      ? "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      : "text-muted-foreground hover:text-foreground hover:bg-orange-50"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">Cài đặt</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/help');
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors",
                    darkMode
                      ? "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      : "text-muted-foreground hover:text-foreground hover:bg-orange-50"
                  )}
                >
                  <HelpCircle className="h-4 w-4" />
                  <span className="text-sm">Trợ giúp</span>
                </button>
              </div>
              <div
                className={cn(
                  "p-2 border-t",
                  darkMode ? "border-border" : "border-orange-100"
                )}
              >
                <button
                  onClick={handleLogout}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors",
                    darkMode
                      ? "text-red-400 hover:text-red-400 hover:bg-red-900/20"
                      : "text-red-600 hover:text-red-600 hover:bg-red-50"
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm font-medium">Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
