import { Platform } from "react-native";

/** Centralized API base URL. Android emulator uses 10.0.2.2; web and others use localhost. */
function getDefaultApiBaseUrl(): string {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000";
  }
  return "http://localhost:5000";
}

const DEFAULT_API_URL = getDefaultApiBaseUrl();

const rawEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
let base =
  rawEnv && rawEnv.length > 0 ? rawEnv : DEFAULT_API_URL;
// Trên web luôn dùng localhost (10.0.2.2 chỉ dùng cho Android emulator)
if (Platform.OS === "web" && base.includes("10.0.2.2")) {
  base = "http://localhost:5000";
}
export const API_BASE_URL = base.replace(/\/$/, "");

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log("[env] API_BASE_URL:", API_BASE_URL, "| Platform.OS:", Platform.OS);
}
