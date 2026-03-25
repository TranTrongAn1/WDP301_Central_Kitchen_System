import { useAuthStore, normalizeUserRole } from '@/shared/zustand/authStore';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { UserRole } from '@/shared/types/auth';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user, getRedirectRoute } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user && !allowedRoles) {
    const redirectPath = getRedirectRoute();
    if (location.pathname !== redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
    return <Outlet />;
  }

  if (allowedRoles && allowedRoles.length > 0 && user) {
    const effectiveRole = normalizeUserRole(user.role);
    const hasPermission =
      effectiveRole !== null && allowedRoles.includes(effectiveRole);

    if (!hasPermission) {
      const redirectPath = getRedirectRoute();
      // Tránh vòng lặp: trước đây getRedirectRoute() fallback '/dashboard' khi role lệch → kẹt màn hình
      if (redirectPath === '/login' || redirectPath === location.pathname) {
        return <Navigate to="/login" replace state={{ clearAuth: true }} />;
      }
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <Outlet />;
};

export const RoleGuard = ({
  allowedRoles,
  children,
  fallbackPath = '/login'
}: {
  allowedRoles: UserRole[],
  children: React.ReactNode,
  fallbackPath?: string
}) => {
  const { isAuthenticated, user, getRedirectRoute } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  const er = user ? normalizeUserRole(user.role) : null;
  if (user && (!er || !allowedRoles.includes(er))) {
    const redirectPath = getRedirectRoute();
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};
