import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/shared/zustand/authStore";

export const HomeLayout = () => {
  const { isAuthenticated, user, getRedirectRoute } = useAuthStore();
  if (isAuthenticated && user) {
    return <Navigate to={getRedirectRoute()} replace />;
  }
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
};
