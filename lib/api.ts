import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { appEvents, APP_EVENTS } from "./appEvents";

import { Platform } from "react-native";
import Constants from "expo-constants";

// Dynamically get the IP address of the machine running the Expo bundler
const hostUri = Constants.expoConfig?.hostUri;
const localIP = hostUri ? hostUri.split(":")[0] : "192.168.96.116";

// Determine the API URL based on the environment
let resolvedApiUrl = `http://${localIP}:5000`;
if (Platform.OS === 'android' && !Constants.isDevice) {
  // We are on an Android Emulator. Using the physical IP often gets blocked by Windows Firewall.
  // 10.0.2.2 bypasses the firewall and securely routes to localhost.
  resolvedApiUrl = "http://10.0.2.2:5000";
} else if (Platform.OS === 'ios' && !Constants.isDevice) {
  resolvedApiUrl = "http://127.0.0.1:5000";
}

// Use an environment variable for production, fallback to dynamic local IP for dev
const API_URL = process.env.EXPO_PUBLIC_API_URL || resolvedApiUrl;

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // Prevents infinite hanging requests
});

// ==========================================
// REQUEST INTERCEPTOR
// Runs before every API request to attach the short-lived Access Token
// ==========================================
api.interceptors.request.use(
  async (config) => {
    try {
      const accessToken = await SecureStore.getItemAsync("access_token");
      
      if (accessToken) {
        // Use .set() for modern Axios TypeScript compatibility
        config.headers.set("Authorization", `Bearer ${accessToken}`);
      }
      return config;
    } catch (error) {
      console.error("Error fetching access token from SecureStore", error);
      return config; 
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==========================================
// RESPONSE INTERCEPTOR
// Runs after every API request. Catches 401 errors and silently refreshes the token.
// ==========================================
api.interceptors.response.use(
  (response) => {
    // Any status code that lies within the range of 2xx causes this function to trigger
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 (Unauthorized) and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark this request so we don't get stuck in a loop

      try {
        // 1. Get the refresh token from secure storage
        const refreshToken = await SecureStore.getItemAsync("refresh_token");
        
        if (!refreshToken) {
          throw new Error("No refresh token available in SecureStore");
        }

        // 2. Ask the backend for a new access token
        // Use standard 'axios' here, NOT 'api', to avoid triggering our interceptors again!
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken: refreshToken,
        });

        const newAccessToken = response.data.accessToken;

        // 3. Save the new Access Token to the phone
        await SecureStore.setItemAsync("accessToken", newAccessToken);

        // 4. Update the failed original request with the new token
        originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
        
        // 5. Try the original request again
        return api(originalRequest);

      } catch (refreshError: any) {
        // Refresh failed: the session is no longer valid. Clear the bad tokens
        // and notify the app (via a global event) so it can show a "Session expired" UI.
        console.warn("Session expired: token refresh failed.", refreshError?.response?.data || refreshError?.message);
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");
        if (api.defaults.headers.common["Authorization"]) {
          delete api.defaults.headers.common["Authorization"];
        }

        // Notify the app (via the shared event bus) so it can show a
        // "Session expired" UI instead of bubbling the error to Expo.
        appEvents.emit(APP_EVENTS.SESSION_EXPIRED);

        return Promise.reject(refreshError);
      }
    }

    // If it's not a 401 error (e.g., 404 Not Found, 500 Server Error), just reject it normally
    return Promise.reject(error);
  }
);

export default api;