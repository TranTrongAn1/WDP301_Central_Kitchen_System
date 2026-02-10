import { Tabs } from "expo-router";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const role = user?.role;

  const isStore = role === "StoreStaff";
  const isKitchen = role === "KitchenStaff";
  const isLoading = !role;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
          title: "Trang chủ",
        }}
      />
      <Tabs.Screen
        name="store-orders"
        options={{
          title: "Đơn hàng",
          href: isStore ? undefined : null,
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
          href: isStore ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="shippingbox.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="store-inventory"
        options={{
          title: "Tồn kho",
          href: isStore ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="archivebox.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="kitchen-orders"
        options={{
          title: "Đơn cần xử lý",
          href: isKitchen ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="tray.full.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: isKitchen ? "Kho" : "Loading...",
          href: isKitchen || isLoading ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name={isKitchen ? "archivebox.fill" : "hourglass"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="kitchen-batches"
        options={{
          title: "Batch",
          href: isKitchen ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="cube.box.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Cài đặt",
          href: isStore || isKitchen ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="gearshape.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: "Hồ sơ",
        }}
      />
    </Tabs>
  );
}
