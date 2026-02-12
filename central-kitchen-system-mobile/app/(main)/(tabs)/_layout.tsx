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
      {/* Store Staff: 4 tabs — Bán hàng | Kho | Đơn hàng | Cài đặt (cart is inside Bán hàng flow, not a tab) */}
      <Tabs.Screen
        name="products"
        options={{
          title: isStore ? "Bán hàng" : "Sản phẩm",
          href: isStore ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="shippingbox.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Giỏ hàng",
          href: null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="cart.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="store-inventory"
        options={{
          title: "Kho",
          href: isStore ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="archivebox.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Đơn hàng",
          href: isStore ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="list.bullet.rectangle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="store-orders"
        options={{
          href: null,
          title: "Đơn (Store)",
        }}
      />
      <Tabs.Screen
        name="store-products"
        options={{
          href: null,
          title: "SP (Store)",
        }}
      />
      {/* Ẩn hoàn toàn nhóm store (mock UI cũ) khỏi tab bar */}
      <Tabs.Screen
        name="store"
        options={{
          href: null,
          title: "Store",
        }}
      />
      <Tabs.Screen
        name="kitchen-orders"
        options={{
          title: isKitchen ? "Đơn sản xuất" : "Đơn cần xử lý",
          href: isKitchen ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="tray.full.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: isKitchen ? "Kho NL" : "Loading...",
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
        name="kitchen-history"
        options={{
          title: "Lịch sử",
          href: isKitchen ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="clock.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="kitchen-batches"
        options={{
          href: null,
          title: "Batch",
        }}
      />
      {/* Ẩn hoàn toàn nhóm kitchen (mock UI cũ) khỏi tab bar */}
      <Tabs.Screen
        name="kitchen"
        options={{
          href: null,
          title: "Kitchen",
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
