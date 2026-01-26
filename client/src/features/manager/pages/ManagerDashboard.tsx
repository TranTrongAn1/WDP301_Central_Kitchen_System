import { useAuthStore } from '@/shared/zustand/authStore';

const ManagerDashboard = () => {
  const { user } = useAuthStore();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Manager Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome, {user?.fullName}! Manage your central kitchen operations.
      </p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Orders</h3>
          <p className="text-muted-foreground text-sm">Manage and track orders</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Inventory</h3>
          <p className="text-muted-foreground text-sm">Monitor inventory levels</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Reports</h3>
          <p className="text-muted-foreground text-sm">View operational reports</p>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;

