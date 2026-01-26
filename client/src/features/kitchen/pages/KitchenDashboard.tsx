import { useAuthStore } from '@/shared/zustand/authStore';

const KitchenDashboard = () => {
  const { user } = useAuthStore();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Kitchen Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome, {user?.fullName}! Manage kitchen production.
      </p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Production Queue</h3>
          <p className="text-muted-foreground text-sm">View pending production orders</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Recipes</h3>
          <p className="text-muted-foreground text-sm">Access recipe database</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Quality Control</h3>
          <p className="text-muted-foreground text-sm">Quality checks and reports</p>
        </div>
      </div>
    </div>
  );
};

export default KitchenDashboard;

