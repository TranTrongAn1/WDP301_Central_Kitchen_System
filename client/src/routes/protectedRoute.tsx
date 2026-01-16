import { useAuthStore } from "@/shared/store/authStore";
import { Navigate, Outlet } from "react-router-dom";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && user) {
    const normalizedAllowedRoles = allowedRoles.map((role) =>
      role.toLowerCase()
    );
    if (!normalizedAllowedRoles.includes(user.role.toLowerCase())) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
};
