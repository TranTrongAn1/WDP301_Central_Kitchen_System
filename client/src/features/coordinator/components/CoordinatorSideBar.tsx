import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Truck,
  Package,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useThemeStore } from "@/shared/zustand/themeStore";

interface CoordinatorSideBarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  subLabel: string;
  path: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", subLabel: "Tổng quan", path: "/coordinator/dashboard", end: true },
  { icon: ClipboardList, label: "Store Orders", subLabel: "Đơn hàng cửa hàng", path: "/coordinator/orders", end: false },
  { icon: Truck, label: "Shipments", subLabel: "Chuyến giao hàng", path: "/coordinator/shipments", end: false },
  { icon: Package, label: "Finished Goods", subLabel: "Kho thành phẩm", path: "/coordinator/inventory", end: true },
  { icon: AlertCircle, label: "Issues & Returns", subLabel: "Sự cố & Đổi trả", path: "/coordinator/issues", end: true },
];

export const CoordinatorSidebar = ({ isCollapsed, onToggle }: CoordinatorSideBarProps) => {
  const [hoveredItem, setHoveredItem] = useState<{
    label: string;
    subLabel: string;
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
            <div className="text-xs opacity-80">{hoveredItem.subLabel}</div>
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
          <div className={cn("flex items-center gap-3 w-full", isCollapsed ? "justify-center" : "")}>
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-all duration-300",
                darkMode ? "bg-primary/20 group-hover:bg-primary/30" : "bg-primary/10 group-hover:bg-primary/20"
              )}
            >
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100 min-w-0"
              )}
            >
              <div className="whitespace-nowrap">
                <h1 className="text-lg font-bold text-foreground">
                  Central <span className="text-primary">Kitchen</span>
                </h1>
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
                  Logistics
                </p>
              </div>
            </div>
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
                          subLabel: item.subLabel,
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
                        <span className={cn("text-xs", active ? "text-primary-foreground/80" : "")}>
                          {item.subLabel}
                        </span>
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
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
