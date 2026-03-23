import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Truck,
  Package,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useThemeStore } from "@/shared/zustand/themeStore";
import { AppLogo } from "@/shared/components/AppLogo";

interface CoordinatorSideBarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Tổng quan", path: "/coordinator/dashboard", end: true },
  { icon: ClipboardList, label: "Đơn cửa hàng", path: "/coordinator/orders", end: false },
  { icon: Truck, label: "Chuyến giao", path: "/coordinator/shipments", end: false },
  { icon: Package, label: "Kế hoạch sản xuất", path: "/coordinator/production", end: false },
  { icon: ShoppingCart, label: "Phiếu xin mua", path: "/coordinator/ingredient-requests", end: true },
];

export const CoordinatorSidebar = ({ isCollapsed, onToggle }: CoordinatorSideBarProps) => {
  const [hoveredItem, setHoveredItem] = useState<{
    label: string;
    x: number;
    y: number;
  } | null>(null);

  const { darkMode } = useThemeStore();
  const location = useLocation();

  const isItemActive = (path: string, end?: boolean) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {isCollapsed && hoveredItem && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: `${hoveredItem.x}px`,
            top: `${hoveredItem.y}px`,
            transform: "translateY(-50%)",
          }}
        >
          <div className="px-3 py-2 bg-slate-900 dark:bg-slate-800 text-white text-sm rounded-lg shadow-xl whitespace-nowrap animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="font-medium">{hoveredItem.label}</div>
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-slate-800" />
          </div>
        </div>
      )}

      <aside
        className={cn(
          "relative flex flex-col h-screen transition-all duration-300 ease-in-out border-r",
          darkMode ? "bg-card border-border" : "bg-white border-orange-100",
          isCollapsed ? "w-24" : "w-64"
        )}
      >
        <div
          className={cn(
            "h-[73px] flex items-center flex-shrink-0 border-b transition-all duration-300",
            darkMode ? "border-border" : "border-orange-100",
            isCollapsed ? "justify-center px-3" : "px-5"
          )}
        >
          <div
            className={cn(
              "w-full",
              isCollapsed ? "flex justify-center" : ""
            )}
          >
            <AppLogo showText={!isCollapsed} />
          </div>
        </div>

        <nav
          className={cn(
            "flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-orange-200 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent",
            isCollapsed ? "scrollbar-hide" : ""
          )}
        >
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isItemActive(item.path, item.end);
              return (
                <li key={item.path} className="relative">
                  <NavLink
                    to={item.path}
                    end={item.end}
                    onMouseEnter={(e) => {
                      if (isCollapsed) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredItem({
                          label: item.label,
                          x: rect.right + 8,
                          y: rect.top + rect.height / 2,
                        });
                      }
                    }}
                    onMouseLeave={() => isCollapsed && setHoveredItem(null)}
                    className={cn(
                      "flex items-center rounded-xl transition-all duration-200",
                      isCollapsed ? "justify-center px-3 py-3" : "gap-3 px-4 py-3",
                      active
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : darkMode
                          ? "text-muted-foreground hover:text-foreground hover:bg-secondary"
                          : "text-muted-foreground hover:text-foreground hover:bg-orange-50"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300 ease-in-out",
                        isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                      )}
                    >
                      <div className="flex flex-col whitespace-nowrap">
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    </div>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={cn("flex-shrink-0 transition-all duration-300", darkMode ? "border-border" : "border-orange-100")}>
          <div className="relative h-12 flex items-center justify-end pr-3">
            <button
              onClick={onToggle}
              className={cn(
                "group flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200",
                darkMode
                  ? "hover:bg-slate-700/50 text-muted-foreground hover:text-foreground"
                  : "hover:bg-orange-100 text-muted-foreground hover:text-foreground"
              )}
              aria-label={isCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
