import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/zustand/authStore';

/** Route dùng chung /dashboard: luôn chuyển về trang tổng quan đúng vai trò (tránh kẹt trang trống). */
const DashboardPage = () => {
  const getRedirectRoute = useAuthStore((s) => s.getRedirectRoute);
  const target = getRedirectRoute();

  if (target === '/login') {
    return <Navigate to="/login" replace state={{ clearAuth: true }} />;
  }
  if (target !== '/dashboard') {
    return <Navigate to={target} replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4 text-foreground">Dashboard</h1>
      <p className="text-muted-foreground">Không xác định được vai trò. Vui lòng đăng nhập lại.</p>
    </div>
  );
};

export default DashboardPage;
