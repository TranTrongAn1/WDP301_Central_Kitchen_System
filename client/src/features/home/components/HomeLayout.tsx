import { Outlet } from "react-router-dom";

export const HomeLayout = () => {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
};
