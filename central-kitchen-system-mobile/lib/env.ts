import { Platform } from "react-native";

const getDefaultApiUrl = () => {
  // Web dùng localhost, Native (Android/iOS) dùng 10.0.2.2
  if (Platform.OS === "web") {
    return "http://localhost:5000";
  }
  return "http://10.0.2.2:5000";
};

const DEFAULT_API_URL = getDefaultApiUrl();

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;

export const API_BASE_URL = rawApiUrl.replace(/\/$/, "");
