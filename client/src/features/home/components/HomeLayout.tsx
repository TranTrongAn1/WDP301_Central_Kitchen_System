import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/shared/zustand/authStore";

export const HomeLayout = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user) {
    const roleRoutes: Record<string, string> = {
      Admin: "/admin/dashboard",
      Manager: "/manager/dashboard",
      KitchenStaff: "/kitchen/dashboard",
      StoreStaff: "/store/dashboard",
      Coordinator: "/coordinator/dashboard",
    };
    const redirectPath = roleRoutes[user.role] || "/dashboard";
    return <Navigate to={redirectPath} replace />;
  }
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
};
