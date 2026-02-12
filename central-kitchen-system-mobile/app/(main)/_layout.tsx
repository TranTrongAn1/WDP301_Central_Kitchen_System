import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "login",
};

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="modal"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen name="ingredient/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="ingredient/create" options={{ headerShown: false }} />
      <Stack.Screen name="orders/index" options={{ headerShown: false }} />
      <Stack.Screen name="orders/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="orders/create" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="kitchen" options={{ headerShown: false }} />
    </Stack>
  );
}
