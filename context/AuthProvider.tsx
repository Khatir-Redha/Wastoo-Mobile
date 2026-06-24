import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import  api  from "../lib/api";

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  role: string;
  photo: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hydrateAuthSession();
  }, []);

  const fetchProfile = async (token: string) => {
    try {
      const res = await api.get("/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(res.data);
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      await cleanupAuth();
      throw error;
    }
  };

  const hydrateAuthSession = async () => {
    setLoading(true);
    try {
      const savedToken = await SecureStore.getItemAsync("access_token");

      if (savedToken) {
        await fetchProfile(savedToken);
      } else {
        await cleanupAuth();
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post("/auth/login", { email, password });

      const accessToken = res.data?.token?.accessToken || res.data?.accessToken;
      const refreshToken = res.data?.token?.refreshToken || res.data?.refreshToken;

      if (accessToken) {
        await SecureStore.setItemAsync("access_token", accessToken);
        if (refreshToken) {
          await SecureStore.setItemAsync("refresh_token", refreshToken);
        }

        await fetchProfile(accessToken);
      }
    } catch (error) {
      console.error("Login execution failed:", error);
      throw error;
    }
  };

  const cleanupAuth = async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  };

  const logout = async () => {
    await cleanupAuth();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};