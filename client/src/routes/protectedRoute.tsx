import { useEffect } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { UserRole } from '@/shared/types/auth';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user, getRedirectRoute } = useAuthStore();
  const location = useLocation();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If user exists but no role info yet, redirect to their dashboard based on role
  if (user && !allowedRoles) {
    const redirectPath = getRedirectRoute();
    // Only redirect if we're not already on the correct page
    if (location.pathname !== redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
    return <Outlet />;
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0 && user) {
    const hasPermission = allowedRoles.includes(user.role as UserRole);
    
    if (!hasPermission) {
      // User doesn't have permission, redirect to their dashboard
      const redirectPath = getRedirectRoute();
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <Outlet />;
};

// HOC for checking specific role access
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

  if (user && !allowedRoles.includes(user.role as UserRole)) {
    const redirectPath = getRedirectRoute();
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};
