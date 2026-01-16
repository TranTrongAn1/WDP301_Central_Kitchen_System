import axios, {
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from "axios";

const instance = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") + "/api/" ||
    "http://localhost:5000/api/",
  timeout: 10000,
});

// Request interceptor
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default instance;
