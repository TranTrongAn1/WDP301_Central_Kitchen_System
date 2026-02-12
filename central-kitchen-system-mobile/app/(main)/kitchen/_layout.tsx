import { Stack } from "expo-router";

export default function KitchenLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="production/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
