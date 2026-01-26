import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './routes/protectedRoute';
import { useAuthStore } from './shared/store/authStore';

// Pages
import HomePage from '@/features/home/pages/HomePage';
import LoginPage from '@/features/auth/pages/LoginPage';
import SignupPage from '@/features/auth/pages/SignupPage';

// Layouts
import { HomeLayout } from '@/features/home/components/HomeLayout';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';

// Dashboard pages (placeholder for now)
import AdminDashboard from '@/features/admin/pages/AdminDashboard';
import ManagerDashboard from '@/features/manager/pages/ManagerDashboard';
import KitchenDashboard from '@/features/kitchen/pages/KitchenDashboard';
import StoreDashboard from '@/features/store/pages/StoreDashboard';
import CoordinatorDashboard from '@/features/coordinator/pages/CoordinatorDashboard';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';

import './App.css';

// Component to handle redirects after login
const AuthHandler = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user) {
    const roleRoutes: Record<string, string> = {
      'Admin': '/admin/dashboard',
      'Manager': '/manager/dashboard',
      'KitchenStaff': '/kitchen/dashboard',
      'StoreStaff': '/store/dashboard',
      'Coordinator': '/coordinator/dashboard',
    };
    const redirectPath = roleRoutes[user.role] || '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <BrowserRouter>
        <Routes>
          {/* Public routes with HomeLayout */}
          <Route element={<HomeLayout />}>
            <Route path="/" element={<HomePage />} />
          </Route>

          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* Auth redirect route */}
          <Route 
            path="/auth/callback" 
            element={<AuthHandler />} 
          />

          {/* Admin routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['Admin']} />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>
          </Route>

          {/* Manager routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['Manager']} />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/manager/dashboard" element={<ManagerDashboard />} />
            </Route>
          </Route>

          {/* Kitchen Staff routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['KitchenStaff']} />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/kitchen/dashboard" element={<KitchenDashboard />} />
            </Route>
          </Route>

          {/* Store Staff routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['StoreStaff']} />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/store/dashboard" element={<StoreDashboard />} />
            </Route>
          </Route>

          {/* Coordinator routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['Coordinator']} />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/coordinator/dashboard" element={<CoordinatorDashboard />} />
            </Route>
          </Route>

          {/* Legacy dashboard route - redirect based on role */}
          <Route
            element={
              <ProtectedRoute />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
          </Route>

          {/* 404 - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
