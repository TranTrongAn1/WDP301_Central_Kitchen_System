import { Stack } from "expo-router";

export default function StoreInventoryLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="[productId]"
                options={{
                    headerShown: false,
                }}
            />
        </Stack>
    );
}
