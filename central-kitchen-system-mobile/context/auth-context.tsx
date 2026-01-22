import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { authApi } from "@/lib/api";
import type { User } from "@/lib/auth";
import { isAllowedRole } from "@/lib/auth";

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

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);

        if (storedToken) {
          setToken(storedToken);
        }
        if (storedUser) {
          setUser(JSON.parse(storedUser) as User);
        }
      } finally {
        setIsLoading(false);
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
    await Promise.all([
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
      AsyncStorage.removeItem(AUTH_USER_KEY),
    ]);
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
