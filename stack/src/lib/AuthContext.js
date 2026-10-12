import { useState } from "react";
import { createContext } from "react";
import axiosInstance from "./axiosinstance";
import { toast } from "react-toastify";
import { useContext } from "react";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });
  const [loading, setloading] = useState(false);
  const [error, seterror] = useState(null);

  const Signup = async ({ name, email, password }) => {
    setloading(true);
    seterror(null);
    try {
      const res = await axiosInstance.post("/user/signup", {
        name,
        email,
        password,
      });
      const { data, token } = res.data;
      localStorage.setItem("user", JSON.stringify({ ...data, token }));
      setUser(data);
      toast.success("Signup Successful");
    } catch (error) {
      const msg = error.response?.data.message || "Signup failed";
      seterror(msg);
      toast.error(msg);
    }
  };
  const Login = async ({ email, password }) => {
    setloading(true);
    seterror(null);
    try {
      const trustedDeviceToken = typeof window !== "undefined" ? localStorage.getItem("trusted_device_token") : null;
      const res = await axiosInstance.post("/user/login", {
        email,
        password,
        trustedDeviceToken,
      });

      if (res.data.requiresOtp) {
        setloading(false);
        return res.data; // { requiresOtp: true, userId, maskedContact }
      }

      const { data, token } = res.data;
      localStorage.setItem("user", JSON.stringify({ ...data, token }));
      setUser(data);
      toast.success("Login Successful");
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || "Login failed";
      seterror(msg);
      toast.error(msg);
      throw error;
    } finally {
      setloading(false);
    }
  };

  const verifyLoginOtp = async ({ userId, otp, trustDevice }) => {
    setloading(true);
    seterror(null);
    try {
      const res = await axiosInstance.post("/user/verify-login-otp", {
        userId,
        otp,
        trustDevice,
      });
      const { data, token, trustedDeviceToken } = res.data;
      if (trustedDeviceToken && typeof window !== "undefined") {
        localStorage.setItem("trusted_device_token", trustedDeviceToken);
      }
      localStorage.setItem("user", JSON.stringify({ ...data, token }));
      setUser(data);
      toast.success("Login Successful");
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || "Verification failed";
      seterror(msg);
      toast.error(msg);
      throw error;
    } finally {
      setloading(false);
    }
  };

  const Logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    toast.info("Logged out");
  };

  const updateUser = (updatedFields) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      const newUser = { ...prevUser, ...updatedFields };
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(newUser));
      }
      return newUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, Signup, Login, verifyLoginOtp, Logout, updateUser, loading, error }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);
