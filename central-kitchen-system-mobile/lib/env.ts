const DEFAULT_API_URL = 'http://10.0.2.2:5000';

const rawApiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  DEFAULT_API_URL;

export const API_BASE_URL = rawApiUrl.replace(/\/$/, '');
