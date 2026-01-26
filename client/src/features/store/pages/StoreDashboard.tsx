import { useAuthStore } from '@/shared/zustand/authStore';

const StoreDashboard = () => {
  const { user } = useAuthStore();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Store Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome, {user?.fullName}! Manage your store operations.
      </p>
      {user?.storeName && (
        <p className="text-sm text-primary mt-2">Store: {user.storeName}</p>
      )}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Orders</h3>
          <p className="text-muted-foreground text-sm">Create and manage orders</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Inventory</h3>
          <p className="text-muted-foreground text-sm">Check local inventory</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Pickup Requests</h3>
          <p className="text-muted-foreground text-sm">Manage customer pickups</p>
        </div>
      </div>
    </div>
  );
};

export default StoreDashboard;

