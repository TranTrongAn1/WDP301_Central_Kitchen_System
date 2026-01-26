import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const role = user?.role;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      {role === "StoreStaff" && (
        <>
          <Tabs.Screen
            name="store-orders"
            options={{
              title: "Đơn hàng",
              tabBarIcon: ({ color }) => (
                <IconSymbol
                  size={28}
                  name="list.bullet.rectangle.fill"
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="store-products"
            options={{
              title: "Sản phẩm",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={28} name="shippingbox.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="store-inventory"
            options={{
              title: "Tồn kho",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={28} name="archivebox.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: "Cài đặt",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={28} name="gearshape.fill" color={color} />
              ),
            }}
          />
        </>
      )}

      {role === "KitchenStaff" && (
        <>
          <Tabs.Screen
            name="kitchen-orders"
            options={{
              title: "Đơn cần xử lý",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={28} name="tray.full.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="inventory"
            options={{
              title: "Kho",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={28} name="archivebox.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="kitchen-batches"
            options={{
              title: "Batch",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={28} name="cube.box.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: "Cài đặt",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={28} name="gearshape.fill" color={color} />
              ),
            }}
          />
        </>
      )}

      {!role && (
        <Tabs.Screen
          name="inventory"
          options={{
            title: "Loading...",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="hourglass" color={color} />
            ),
          }}
        />
      )}
    </Tabs>
  );
}
