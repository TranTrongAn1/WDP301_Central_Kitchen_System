import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { setApiErrorHandlers } from "@/lib/api-error-handler";
import { useAuth } from "@/hooks/use-auth";

const TOAST_DURATION_MS = 3500;

export type ToastType = "success" | "error";

type ToastState = {
  visible: boolean;
  message: string;
  type: ToastType;
};

type NotificationContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setToast({ visible: true, message, type });
    hideTimeoutRef.current = setTimeout(() => {
      hideTimeoutRef.current = null;
      setToast((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    }, TOAST_DURATION_MS);
  }, []);

  useEffect(() => {
    setApiErrorHandlers({
      on401: () => {
        showToast("Phiên đăng nhập đã hết hạn.", "error");
        logout();
      },
      on403: (message) => {
        showToast(
          message && message.length < 80 ? message : "Bạn không có quyền thực hiện hành động này.",
          "error"
        );
      },
      on500: (message) => {
        showToast(
          message && message.length < 80 ? message : "Hệ thống đang gặp sự cố.",
          "error"
        );
      },
    });
    return () => setApiErrorHandlers({});
  }, [showToast, logout]);

  const value: NotificationContextValue = { showToast };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {toast.visible && (
        <View
          style={[
            styles.toast,
            { top: insets.top + 8 },
            toast.type === "error" ? styles.toastError : styles.toastSuccess,
          ]}
        >
          <Text style={styles.toastText} numberOfLines={3}>
            {toast.message}
          </Text>
        </View>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    zIndex: 9999,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 4,
        }),
  },
  toastSuccess: {
    backgroundColor: "#2E7D32",
  },
  toastError: {
    backgroundColor: "#C62828",
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
