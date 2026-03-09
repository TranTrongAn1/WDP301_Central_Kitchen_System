import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './routes/protectedRoute';
import { useAuthStore } from './shared/zustand/authStore';

import HomePage from '@/features/home/pages/HomePage';
import LoginPage from '@/features/auth/pages/LoginPage';
// import SignupPage from '@/features/auth/pages/SignupPage';

import { HomeLayout } from '@/features/home/components/HomeLayout';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import AdminDashboard from '@/features/admin/pages/AdminDashboard';
import ManagerDashboard from '@/features/manager/pages/ManagerDashboard';
import CategoryPage from '@/features/manager/pages/CategoryPage';
import IngredientPage from '@/features/manager/pages/IngredientPage';
import ProductionPlansPage from '@/features/manager/pages/ProductionPlansPage';
import ProductionPlanDetailPage from '@/features/manager/pages/ProductionPlanDetailPage';
import BatchesPage from '@/features/manager/pages/BatchesPage';
import BatchDetailPage from '@/features/manager/pages/BatchDetailPage';
import InventoryReportsPage from '@/features/manager/pages/InventoryReportsPage';
import OrdersShipmentsPage from '@/features/manager/pages/OrdersShipmentsPage';
import ProductsRecipesPage from '@/features/manager/pages/ProductsRecipesPage';
import ProductDetailPage from '@/features/manager/pages/ProductDetailPage';
import StoresPage from '@/features/manager/pages/StoresPage';
import SettingsPage from '@/features/manager/pages/SettingsPage';
import FeedbackListPage from '@/features/manager/pages/FeedbackListPage';
import UsersRolesPage from '@/features/manager/pages/UsersRolesPage';
import SuppliersPage from '@/features/manager/pages/SuppliersPage';
import VehicleTypesPage from '@/features/manager/pages/VehicleTypesPage';
import ReportsAnalyticsPage from '@/features/manager/pages/ReportsAnalyticsPage';
import KitchenDashboard from '@/features/kitchen/pages/KitchenDashboard';
import KitchenProductionQueuePage from '@/features/kitchen/pages/KitchenProductionQueuePage';
import KitchenTripsPage from '@/features/kitchen/pages/KitchenTripsPage';
import StoreDashboard from '@/features/store/pages/StoreDashboard';
import StoreOrdersPage from '@/features/store/pages/StoreOrdersPage';
import CreateStoreOrderPage from '@/features/store/pages/CreateStoreOrderPage';
import StoreInventoryPage from '@/features/store/pages/StoreInventoryPage';
import StoreOrderDetailPage from '@/features/store/pages/StoreOrderDetailPage';
import StoreWalletPage from '@/features/store/pages/StoreWalletPage';
import CoordinatorDashboard from '@/features/coordinator/pages/CoordinatorDashboard';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import ProfilePage from '@/features/dashboard/pages/ProfilePage';
import DashboardSettingsPage from '@/features/dashboard/pages/SettingsPage';
import HelpPage from '@/features/dashboard/pages/HelpPage';

import './App.css';
import { AccountManagement } from './features/admin/pages/AccountManagment';
import StoreManagment from './features/admin/pages/StoreManagment';
import Order from './features/coordinator/pages/Order';
import Shipment from './features/coordinator/pages/Shipment';
import Inventory from './features/coordinator/pages/Inventory';
import IssuseReport from './features/coordinator/pages/IssuseReport';
import OrderDetail from './features/coordinator/pages/OrderDetail';
import ShipmentDetail from './features/coordinator/pages/ShipmentDetail';
import IngredientRequestListPage from './features/ingredient-request/pages/IngredientRequestListPage';
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
          {/* <Route path="/signup" element={<SignupPage />} /> */}

          <Route
            path="/auth/callback"
            element={<AuthHandler />}
          />

          <Route
            element={
              <ProtectedRoute allowedRoles={['Admin']} />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/account" element={<AccountManagement />} />
              <Route path="/admin/stores" element={<StoreManagment />} />
              <Route path="/admin/feedback" element={<FeedbackListPage />} />
              <Route path="/admin/suppliers" element={<SuppliersPage />} />
              <Route path="/admin/vehicle-types" element={<VehicleTypesPage />} />

              {/* Products & Categories */}
              <Route path="/admin/products" element={<ProductsRecipesPage />} />
              <Route path="/admin/products/:id" element={<ProductDetailPage />} />
              <Route path="/admin/categories" element={<CategoryPage />} />

              {/* Ingredients */}
              <Route path="/admin/ingredients" element={<IngredientPage />} />
              <Route path="/admin/ingredient-requests" element={<IngredientRequestListPage />} />

              {/* Production */}
              <Route path="/admin/production" element={<ProductionPlansPage />} />
              <Route path="/admin/production/:id" element={<ProductionPlanDetailPage />} />
              <Route path="/admin/production/batches" element={<BatchesPage />} />
              <Route path="/admin/production/batches/:id" element={<BatchDetailPage />} />

              {/* Inventory */}
              <Route path="/admin/inventory" element={<InventoryReportsPage />} />

              {/* Orders & Shipments */}
              <Route path="/admin/orders" element={<OrdersShipmentsPage />} />
              <Route path="/admin/orders/:id" element={<OrderDetail />} />
              <Route path="/admin/shipments/:id" element={<ShipmentDetail />} />

              {/* Transfers */}
              <Route path="/admin/transfers" element={<OrdersShipmentsPage />} />

              {/* System Settings */}
              <Route path="/admin/settings" element={<SettingsPage />} />

              {/* Payment & Wallet */}
              <Route path="/admin/payment" element={<StoresPage />} />
            </Route>
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={['Manager']} />
            }
          >
            <Route element={<DashboardLayout />}>
              {/* Dashboard */}
              <Route path="/manager/dashboard" element={<ManagerDashboard />} />

              {/* Products & Categories */}
              <Route path="/manager/products" element={<ProductsRecipesPage />} />
              <Route path="/manager/products/:id" element={<ProductDetailPage />} />
              <Route path="/manager/categories" element={<CategoryPage />} />

              {/* Ingredients */}
              <Route path="/manager/ingredients" element={<IngredientPage />} />

              {/* Production */}
              <Route path="/manager/production" element={<ProductionPlansPage />} />
              <Route path="/manager/production/:id" element={<ProductionPlanDetailPage />} />
              <Route path="/manager/production/batches" element={<BatchesPage />} />
              <Route path="/manager/production/batches/:id" element={<BatchDetailPage />} />

              {/* Inventory */}
              <Route path="/manager/inventory" element={<InventoryReportsPage />} />

              {/* Stores */}
              <Route path="/manager/stores" element={<StoresPage />} />

              {/* Transfers/Orders */}
              <Route path="/manager/orders" element={<OrdersShipmentsPage />} />
              <Route path="/manager/orders/:id" element={<OrderDetail />} />
              <Route path="/manager/shipments/:id" element={<ShipmentDetail />} />

              {/* Admin settings */}
              <Route path="/manager/settings" element={<SettingsPage />} />
              <Route path="/manager/feedback" element={<FeedbackListPage />} />
              <Route path="/manager/users" element={<UsersRolesPage />} />
              <Route path="/manager/suppliers" element={<SuppliersPage />} />
              <Route path="/manager/vehicle-types" element={<VehicleTypesPage />} />
              <Route path="/manager/reports" element={<ReportsAnalyticsPage />} />
            </Route>
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={['KitchenStaff']} />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/kitchen/dashboard" element={<KitchenDashboard />} />
              {/* Kitchen production & batches (chia sẻ UI với Manager nhưng route riêng) */}
              <Route path="/kitchen/production/queue" element={<KitchenProductionQueuePage />} />
              <Route path="/kitchen/production" element={<ProductionPlansPage />} />
              <Route path="/kitchen/production/:id" element={<ProductionPlanDetailPage />} />
              <Route path="/kitchen/production/batches" element={<BatchesPage />} />
              <Route path="/kitchen/production/batches/:id" element={<BatchDetailPage />} />
              <Route path="/kitchen/trips" element={<KitchenTripsPage />} />
              <Route path="/kitchen/trips/:id" element={<ShipmentDetail />} />
              {/* View-only: ingredients & suppliers */}
              <Route path="/kitchen/ingredients" element={<IngredientPage />} />
              <Route path="/kitchen/ingredient-requests" element={<IngredientRequestListPage />} />
              <Route path="/kitchen/suppliers" element={<SuppliersPage />} />
            </Route>
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={['StoreStaff']} />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/store/dashboard" element={<StoreDashboard />} />
              <Route path="/store/orders" element={<StoreOrdersPage />} />
              <Route path="/store/orders/new" element={<CreateStoreOrderPage />} />
              <Route path="/store/orders/:id" element={<StoreOrderDetailPage />} />
              <Route path="/store/inventory" element={<StoreInventoryPage />} />
              <Route path="/store/wallet" element={<StoreWalletPage />} />
            </Route>
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={['Coordinator', 'Manager', 'Admin']} />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/coordinator/dashboard" element={<CoordinatorDashboard />} />
              <Route path="/coordinator/orders" element={<Order />} />
              <Route path="/coordinator/orders/:id" element={<OrderDetail />} />
              <Route path="/coordinator/shipments" element={<Shipment />} />
              <Route path="/coordinator/shipments/:id" element={<ShipmentDetail />} />
              <Route path="/coordinator/inventory" element={<Inventory />} />
              <Route path="/coordinator/ingredient-requests" element={<IngredientRequestListPage />} />
              <Route path="/coordinator/issues" element={<IssuseReport />} />
            </Route>
          </Route>

          <Route
            element={
              <ProtectedRoute
                allowedRoles={[
                  'Admin',
                  'Manager',
                  'KitchenStaff',
                  'StoreStaff',
                  'Coordinator',
                ]}
              />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<DashboardSettingsPage />} />
              <Route path="/help" element={<HelpPage />} />
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
