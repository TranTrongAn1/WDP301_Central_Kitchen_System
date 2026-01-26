import { useAuthStore } from '@/shared/store/authStore';

const CoordinatorDashboard = () => {
  const { user } = useAuthStore();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Coordinator Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome, {user?.fullName}! Coordinate operations between stores and kitchen.
      </p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Order Coordination</h3>
          <p className="text-muted-foreground text-sm">Coordinate orders across stores</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Delivery Tracking</h3>
          <p className="text-muted-foreground text-sm">Track deliveries and pickups</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg">Communication</h3>
          <p className="text-muted-foreground text-sm">Messages between teams</p>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorDashboard;

