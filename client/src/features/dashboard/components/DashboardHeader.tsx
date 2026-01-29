import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/shared/zustand/authStore";
import { useThemeStore } from "@/shared/zustand/themeStore";
import { cn } from "@/shared/lib/utils";
import {
  Bell,
  Search,
  Sun,
  Moon,
  Menu,
  ChevronDown,
  User,
  LogOut,
  Settings,
  HelpCircle,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

interface DashboardHeaderProps {
  isSidebarCollapsed: boolean;
  onMenuClick?: () => void;
}

const PAGE_NAME: Record<string, { name: string; title: string }> = {
  "/manager/dashboard": { name: "Dashboard", title: "Tổng quan hệ thống" },
  "/manager/orders": { name: "Orders & Shipments", title: "Quản lý đơn hàng & giao hàng" },
  "/manager/production": { name: "Production Plans", title: "Kế hoạch sản xuất" },
  "/manager/inventory": { name: "Inventory & Batches", title: "Kho & Lô hàng" },
  "/manager/products": { name: "Products & Recipes", title: "Sản phẩm & Công thức" },
  "/manager/stores": { name: "Stores", title: "Quản lý cửa hàng" },
  "/manager/reports": { name: "Reports & Analytics", title: "Báo cáo & Phân tích" },
  "/manager/users": { name: "Users & Roles", title: "Quản lý người dùng" },
  "/manager/settings": { name: "Settings", title: "Cài đặt hệ thống" },
};

export const DashboardHeader = ({
  isSidebarCollapsed,
  onMenuClick,
}: DashboardHeaderProps) => {
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const pageName = PAGE_NAME[location.pathname] || {
    name: "Dashboard",
    title: "Tổng quan",
  };

  const notifications = [
    {
      id: 1,
      title: "Đơn hàng mới #1234",
      message: "Có đơn hàng mới từ cửa hàng A",
      time: "5 phút trước",
      unread: true,
    },
    {
      id: 2,
      title: "Cảnh báo tồn kho",
      message: "Nguyên liệu gạo sắp hết",
      time: "1 giờ trước",
      unread: true,
    },
    {
      id: 3,
      title: "Xác nhận sản xuất",
      message: "Kế hoạch sản xuất đã được duyệt",
      time: "2 giờ trước",
      unread: false,
    },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleLogout = () => {
    logout();
    toast.success("Đăng xuất thành công!");
    navigate("/login");
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
          <h1 className="text-xl font-bold text-foreground">
            {pageName?.name}
          </h1>
          <h2 className="text-sm text-muted-foreground">
            {pageName?.title}
          </h2>
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className={cn(
              "w-full pl-10 pr-4 py-2.5 rounded-full border transition-all duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20",
              darkMode
                ? "bg-secondary border-secondary hover:bg-secondary/80"
                : "bg-orange-50 border-orange-200 hover:bg-orange-100"
            )}
          />
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
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className={cn(
              "relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
              darkMode
                ? "hover:bg-secondary text-muted-foreground"
                : "hover:bg-orange-100 text-muted-foreground"
            )}
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              className={cn(
                "absolute right-0 mt-2 w-80 rounded-2xl shadow-xl border overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150",
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
                <h3
                  className={cn(
                    "font-semibold",
                    darkMode ? "text-foreground" : "text-foreground"
                  )}
                >
                  Thông báo
                </h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 border-b transition-colors cursor-pointer",
                      darkMode
                        ? "border-border hover:bg-secondary/50"
                        : "border-orange-50 hover:bg-orange-50/50",
                      notification.unread &&
                        (darkMode ? "bg-primary/5" : "bg-orange-50/30")
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                          notification.unread ? "bg-primary" : "bg-transparent"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            darkMode ? "text-foreground" : "text-foreground"
                          )}
                        >
                          {notification.title}
                        </p>
                        <p
                          className={cn(
                            "text-sm truncate",
                            darkMode
                              ? "text-muted-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {notification.message}
                        </p>
                        <p
                          className={cn(
                            "text-xs mt-1",
                            darkMode
                              ? "text-muted-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className={cn(
                  "p-3 border-t",
                  darkMode ? "border-border" : "border-orange-100"
                )}
              >
                <button
                  className={cn(
                    "w-full text-center text-sm font-medium transition-colors",
                    darkMode
                      ? "text-primary hover:text-primary/80"
                      : "text-primary hover:text-primary/80"
                  )}
                >
                  Xem tất cả thông báo
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
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
