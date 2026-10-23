import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
});
axiosInstance.interceptors.request.use((req) => {
  if (typeof window !== "undefined") {
    let token = null;
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const parsed = JSON.parse(user);
        token = parsed?.token || parsed?.token_id;
      } catch (e) {}
    }
    if (!token) {
      token = localStorage.getItem("token");
    }
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    const trustedToken = localStorage.getItem("trusted_device_token");
    if (trustedToken) {
      req.headers["x-trusted-device-token"] = trustedToken;
    }
  }
  return req;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("user");
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
