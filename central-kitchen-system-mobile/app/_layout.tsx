import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { AuthProvider } from "@/context/auth-context";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { isAllowedRole } from "@/lib/auth";

export const unstable_settings = {
  anchor: "login",
};

function AuthGate() {
  const { token, user, isLoading, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const inLoginScreen = segments[0] === "login";
    const hasAllowedRole = Boolean(user && isAllowedRole(user.role));
    const isAuthed = Boolean(token && user && hasAllowedRole);

    if (token && user && !hasAllowedRole) {
      logout();
      return;
    }

    if (!isAuthed && !inLoginScreen) {
      router.replace("/login");
    } else if (isAuthed && inLoginScreen) {
      router.replace("/(tabs)");
    }
  }, [isLoading, logout, router, segments, token, user]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthGate />
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
