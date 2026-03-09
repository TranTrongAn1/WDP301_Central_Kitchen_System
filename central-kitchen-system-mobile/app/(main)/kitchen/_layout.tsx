import { Stack } from "expo-router";

export default function KitchenLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="production/recipe" options={{ headerShown: false }} />
      <Stack.Screen name="production/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="ingredient-batches" options={{ headerShown: false }} />
      <Stack.Screen name="batch/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="ingredient-batch-create"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
