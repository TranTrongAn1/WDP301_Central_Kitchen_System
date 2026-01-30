import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './routes/protectedRoute';
import { useAuthStore } from './shared/zustand/authStore';

import HomePage from '@/features/home/pages/HomePage';
import LoginPage from '@/features/auth/pages/LoginPage';
import SignupPage from '@/features/auth/pages/SignupPage';

import { HomeLayout } from '@/features/home/components/HomeLayout';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { AdminLayout } from '@/features/admin/AdminLayout';
import AdminDashboard from '@/features/admin/pages/AdminDashboard';
import ManagerDashboard from '@/features/manager/pages/ManagerDashboard';
import CategoryPage from '@/features/manager/pages/CategoryPage';
import IngredientPage from '@/features/manager/pages/IngredientPage';
import KitchenDashboard from '@/features/kitchen/pages/KitchenDashboard';
import StoreDashboard from '@/features/store/pages/StoreDashboard';
import CoordinatorDashboard from '@/features/coordinator/pages/CoordinatorDashboard';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';

import './App.css';
import { AccountManagement } from './features/admin/pages/AccountManagment';

const AuthHandler = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user) {
    const roleRoutes: Record<string, string> = {
      Admin: '/admin/dashboard',
      Manager: '/manager/dashboard',
      KitchenStaff: '/kitchen/dashboard',
      StoreStaff: '/store/dashboard',
      Coordinator: '/coordinator/dashboard',
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
          <Route element={<HomeLayout />}>
            <Route path="/" element={<HomePage />} />
          </Route>

          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          <Route 
            path="/auth/callback" 
            element={<AuthHandler />} 
          />

          <Route
            element={
              <ProtectedRoute allowedRoles={['Admin']} />
            }
          >
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/account" element={<AccountManagement />} />
            </Route>
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={['Manager']} />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/manager/dashboard" element={<ManagerDashboard />} />
              <Route path="/manager/categories" element={<CategoryPage />} />
              <Route path="/manager/ingredients" element={<IngredientPage />} />
            </Route>
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={['KitchenStaff']} />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/kitchen/dashboard" element={<KitchenDashboard />} />
            </Route>
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={['StoreStaff']} />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/store/dashboard" element={<StoreDashboard />} />
            </Route>
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={['Coordinator']} />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/coordinator/dashboard" element={<CoordinatorDashboard />} />
            </Route>
          </Route>

          <Route
            element={
              <ProtectedRoute />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
