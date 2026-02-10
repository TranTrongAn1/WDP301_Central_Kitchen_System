import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { RootErrorBoundary } from "@/components/error-boundary";
import { AuthProvider } from "@/context/auth-context";
import { useAuth as useAuthHook } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { isAllowedRole } from "@/lib/auth";

export const unstable_settings = {
  initialRouteName: "(main)",
};

const SPLASH_HIDE_DELAY_MS = Platform.OS === "android" ? 0 : 50;
const SPLASH_HIDE_MAX_WAIT_MS = 1500;

function ensureSplashHidden() {
  SplashScreen.hideAsync().catch(() => {});
}

function SplashHideController() {
  const { isLoading } = useAuthHook();
  const hasHidden = useRef(false);

  useEffect(() => {
    if (hasHidden.current) return;
    if (!isLoading) {
      hasHidden.current = true;
      if (__DEV__) console.log("[app] Splash hide (auth ready)");
      ensureSplashHidden();
    }
  }, [isLoading]);

  return null;
}

function AuthGate() {
  const { token, user, isLoading, logout } = useAuthHook();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inLoginScreen =
      segments[0] === "login" ||
      (segments[0] === "(main)" && segments[1] === "login");
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
  const splashGuardDone = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "android") {
      SplashScreen.preventAutoHideAsync().catch(() => {});
    }
    if (__DEV__) console.log("[app] RootLayout mounted", Platform.OS);
  }, []);

  useEffect(() => {
    const earlyId = setTimeout(() => {
      if (__DEV__) console.log("[app] Splash hide (early)");
      ensureSplashHidden();
    }, SPLASH_HIDE_DELAY_MS);
    return () => clearTimeout(earlyId);
  }, []);

  useEffect(() => {
    if (splashGuardDone.current) return;
    const id = setTimeout(() => {
      splashGuardDone.current = true;
      if (__DEV__) console.log("[app] Splash hide (max wait)");
      ensureSplashHidden();
    }, SPLASH_HIDE_MAX_WAIT_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <RootErrorBoundary>
      <AuthProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <SplashHideController />
          <AuthGate />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(main)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </RootErrorBoundary>
  );
}
