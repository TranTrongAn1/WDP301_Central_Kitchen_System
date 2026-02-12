import { Redirect } from "expo-router";
import * as React from "react";

import { useAuth } from "@/hooks/use-auth";

export default function TabsIndex() {
  const { user } = useAuth();
  const role = user?.role;

  // KitchenStaff: ưu tiên vào tab xử lý đơn / kho
  if (role === "KitchenStaff") {
    return React.createElement(Redirect, { href: "/(tabs)/kitchen-orders" });
  }

  // Mặc định (StoreStaff hoặc chưa có role): vào tab Bán hàng (products)
  return React.createElement(Redirect, { href: "/(tabs)/products" });
}
