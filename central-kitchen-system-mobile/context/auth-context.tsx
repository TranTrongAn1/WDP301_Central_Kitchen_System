import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { authApi } from "@/lib/api";
import type { User } from "@/lib/auth";
import { isAllowedRole } from "@/lib/auth";

const AUTH_RESTORE_TIMEOUT_MS = 2000;

type AuthState = {
  token: string | null;
  user: User | null;
  isLoading: boolean;
};

type AuthContextValue = AuthState & {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const restoreDone = useRef(false);

  useEffect(() => {
    if (restoreDone.current) return;
    restoreDone.current = true;

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[auth] restoreSession start");
    }

    const timeoutId = setTimeout(() => {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("[auth] restoreSession timeout – forcing isLoading false");
      }
      setIsLoading(false);
    }, AUTH_RESTORE_TIMEOUT_MS);

    const restoreSession = async () => {
      try {
        const [storedToken, storedUserJson] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);

        if (storedToken) setToken(storedToken);
        if (storedUserJson) {
          try {
            const parsed = JSON.parse(storedUserJson) as User;
            if (parsed && typeof parsed === "object") setUser(parsed);
          } catch (parseErr) {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.warn("[auth] restoreSession invalid stored user JSON", parseErr);
            }
            await AsyncStorage.removeItem(AUTH_USER_KEY);
          }
        }
      } catch (err) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn("[auth] restoreSession error", err);
        }
        // Do not block: clear storage and continue so Login can render
        try {
          await Promise.all([
            AsyncStorage.removeItem(AUTH_TOKEN_KEY),
            AsyncStorage.removeItem(AUTH_USER_KEY),
          ]);
        } catch {
          // ignore
        }
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[auth] restoreSession end – isLoading false");
        }
      }
    };

    restoreSession();
  }, []);

  const persistSession = useCallback(
    async (nextToken: string, nextUser: User) => {
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, nextToken),
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser)),
      ]);
      setToken(nextToken);
      setUser(nextUser);
    },
    [],
  );

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await authApi.login({ username, password });

      if (!response.success) {
        throw new Error(response.message || "Login failed");
      }

      if (!isAllowedRole(response.user.role)) {
        throw new Error("Role không được phép đăng nhập ở mobile.");
      }

      await persistSession(response.token, response.user);
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(AUTH_USER_KEY),
      ]);
    } catch {
      // ignore
    }
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isLoading,
      login,
      logout,
    }),
    [token, user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
