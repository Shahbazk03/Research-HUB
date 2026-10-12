import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "../api/client";
import { User } from "../api/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    phone?: string;
    institution?: string;
    department?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Clear legacy global localStorage auth tokens to prevent multi-tab session pollution
  try {
    localStorage.removeItem("rh_token");
    localStorage.removeItem("rh_user");
  } catch {}

  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = sessionStorage.getItem("rh_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(sessionStorage.getItem("rh_token"));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMe = async () => {
    try {
      const storedToken = sessionStorage.getItem("rh_token");
      if (!storedToken) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const res = await apiClient.get("/auth/me");
      if (res.data.success && res.data.data.user) {
        setUser(res.data.data.user);
        sessionStorage.setItem("rh_user", JSON.stringify(res.data.data.user));
      } else {
        logout();
      }
    } catch (err) {
      console.warn("Auth check failed:", err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      if (res.data.success) {
        const receivedToken = res.data.data.token || res.data.data.accessToken;
        const receivedUser = res.data.data.user;
        sessionStorage.setItem("rh_token", receivedToken);
        sessionStorage.setItem("rh_user", JSON.stringify(receivedUser));
        setToken(receivedToken);
        setUser(receivedUser);
        return { success: true };
      }
      return { success: false, message: res.data.message || "Login failed" };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Failed to connect to authentication server",
      };
    }
  };

  const register = async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    phone?: string;
    institution?: string;
    department?: string;
  }) => {
    try {
      const res = await apiClient.post("/auth/register", payload);
      if (res.data.success) {
        const receivedToken = res.data.data.token || res.data.data.accessToken;
        const receivedUser = res.data.data.user;
        sessionStorage.setItem("rh_token", receivedToken);
        sessionStorage.setItem("rh_user", JSON.stringify(receivedUser));
        setToken(receivedToken);
        setUser(receivedUser);
        return { success: true };
      }
      return { success: false, message: res.data.message || "Registration failed" };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Registration failed",
      };
    }
  };

  const logout = () => {
    sessionStorage.removeItem("rh_token");
    sessionStorage.removeItem("rh_user");
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const res = await apiClient.put("/auth/profile", data);
      if (res.data.success && res.data.data.user) {
        setUser(res.data.data.user);
        sessionStorage.setItem("rh_user", JSON.stringify(res.data.data.user));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const isAuthenticated = Boolean(user && token);
  const isAdmin = user?.role === "ADMIN";
  const isStaff = user?.role === "ADMIN" || user?.role === "TEAM_MEMBER";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isAdmin,
        isStaff,
        login,
        register,
        logout,
        updateProfile,
        refreshUser: fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
