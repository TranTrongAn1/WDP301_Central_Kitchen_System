import { useState } from "react";
import { Outlet } from "react-router-dom";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardSideBar } from "./DashboardSideBar";
import { useThemeStore } from "@/shared/zustand/themeStore";
import { cn } from "@/shared/lib/utils";

export const DashboardLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { darkMode } = useThemeStore();

  return (
    <div
      className={cn(
        "flex h-screen transition-colors duration-300",
        darkMode ? "bg-background-dark text-gray-200" : "bg-background-light text-text-main"
      )}
    >
      <div className="hidden lg:block">
        <DashboardSideBar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <DashboardSideBar
              isCollapsed={false}
              onToggle={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader
          isSidebarCollapsed={isSidebarCollapsed}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        <main
          className={cn(
            "flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 transition-colors duration-300",
            darkMode ? "bg-background-dark" : "bg-background-light"
          )}
        >
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
