import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import api from "../lib/api";
import { appEvents, APP_EVENTS } from "../lib/appEvents";
import {
  exchangeGoogleOAuthCode,
  openGoogleOAuth,
} from "../services/google-auth.service";
import { openFacebookOAuth } from "../services/facebook-auth.service";
import { usePushNotifications } from "../src/hooks/usePushNotifications";

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
  googleLogin: () => Promise<void>;
  facebookLogin: () => Promise<void>;
  logout: () => Promise<void>;
  completeOAuthTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  completeGoogleOAuthCode: (code: string, state: string) => Promise<User>;
  sessionExpired: boolean;
  dismissSessionExpired: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const { initPushNotifications } = usePushNotifications();
  const googleOAuthExchanges = useRef(new Map<string, Promise<User>>());
  const completedGoogleOAuthCodes = useRef(new Map<string, User>());

  useEffect(() => {
    hydrateAuthSession();
  }, []);

  useEffect(() => {
    if (user) {
      initPushNotifications();
    }
  }, [user]);

  // Listen for the global "session expired" event fired by the API interceptor
  // when token refresh fails. Clear auth and surface a friendly UI.
  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null);
      setSessionExpired(true);
    };

    appEvents.on(APP_EVENTS.SESSION_EXPIRED, onSessionExpired);
    return () => {
      appEvents.off(APP_EVENTS.SESSION_EXPIRED, onSessionExpired);
    };
  }, []);

  const fetchProfile = async (token: string): Promise<User> => {
    try {
      const res = await api.get("/user", {
        headers: { Authorization: `Bearer ${token}` },
      });

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const profile: User = res.data;
      setUser(profile);
      return profile;
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
      const refreshToken =
        res.data?.token?.refreshToken || res.data?.refreshToken;

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

  const completeOAuthTokens = async (accessToken: string, refreshToken: string) => {
    await SecureStore.setItemAsync("access_token", accessToken);
    await SecureStore.setItemAsync("refresh_token", refreshToken);
    await fetchProfile(accessToken);
  };

  const completeGoogleOAuthCode = async (
    code: string,
    state: string,
  ): Promise<User> => {
    const completed = completedGoogleOAuthCodes.current.get(code);
    if (completed) return completed;

    const pending = googleOAuthExchanges.current.get(code);
    if (pending) return pending;

    const exchange = (async () => {
      const tokens = await exchangeGoogleOAuthCode(code, state);
      await SecureStore.setItemAsync("access_token", tokens.accessToken);
      await SecureStore.setItemAsync("refresh_token", tokens.refreshToken);
      return fetchProfile(tokens.accessToken);
    })();

    googleOAuthExchanges.current.set(code, exchange);
    try {
      const profile = await exchange;
      completedGoogleOAuthCodes.current.clear();
      completedGoogleOAuthCodes.current.set(code, profile);
      return profile;
    } finally {
      googleOAuthExchanges.current.delete(code);
    }
  };

  /**
   * Completes Google authentication through a single-use backend code.
   */
  const googleLogin = async () => {
    const callback = await openGoogleOAuth();

    if (!callback) {
      throw new Error("Google sign-in was cancelled or failed.");
    }

    await completeGoogleOAuthCode(callback.code, callback.state);
  };

  const facebookLogin = async () => {
    const tokens = await openFacebookOAuth();

    if (!tokens) {
      throw new Error("Facebook sign-in was cancelled or failed.");
    }

    await completeOAuthTokens(tokens.accessToken, tokens.refreshToken);
  };

  const cleanupAuth = async () => {
    // Unregister push token before clearing auth
    try {
      const pushToken = await SecureStore.getItemAsync("push_device_token");
      if (pushToken) {
        await api.delete(`/notification/${pushToken}/device-token`).catch(() => {});
        await SecureStore.deleteItemAsync("push_device_token");
      }
    } catch (e) {
      console.warn("Error unregistering push token:", e);
    }

    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  };

  const logout = async () => {
    await cleanupAuth();
  };

  const dismissSessionExpired = () => {
    setSessionExpired(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        googleLogin,
        facebookLogin,
        logout,
        completeOAuthTokens,
        completeGoogleOAuthCode,
        sessionExpired,
        dismissSessionExpired,
      }}
    >
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