import { Stack } from "expo-router";

export default function KitchenLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="orders" />
      <Stack.Screen name="batches" />
      <Stack.Screen name="inventory" />
    </Stack>
  );
}
