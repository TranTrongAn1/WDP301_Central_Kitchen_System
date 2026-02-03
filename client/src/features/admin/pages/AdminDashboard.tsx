import { useAuthStore } from '@/shared/zustand/authStore';
import { useThemeStore } from '@/shared/zustand/themeStore';

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const { darkMode } = useThemeStore();

  const cardClass = darkMode 
    ? "bg-card border-border shadow-sm"
    : "bg-white border-gray-100 shadow-sm";
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome, {user?.fullName}! You have full system access.
      </p>
      <div className={`p-6 rounded-lg ${cardClass}`}>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 ">
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">System Management</h3>
          <p className="text-muted-foreground text-sm">Manage users, roles, and permissions</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Analytics</h3>
          <p className="text-muted-foreground text-sm">View system-wide analytics and reports</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Settings</h3>
          <p className="text-muted-foreground text-sm">Configure system settings</p>
        </div>
      </div>
    </div>
    </div>
  );
};

export default AdminDashboard;

