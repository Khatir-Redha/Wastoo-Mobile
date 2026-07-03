import axios from "axios";
import * as SecureStore from "expo-secure-store";

// Use an environment variable for production, fallback to your local IP for dev
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.9:5000";

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
      const accessToken = await SecureStore.getItemAsync("accessToken");
      
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
        const refreshToken = await SecureStore.getItemAsync("refreshToken");
        
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
        // ---> DEBUGGING CATCH BLOCK <---
        // This will tell you EXACTLY why your backend is rejecting the refresh request
        console.error("🚨 REFRESH TOKEN FAILED! 🚨");
        console.error("Backend Error Response:", refreshError.response?.data || refreshError.message);
        
        // Clear the bad tokens because they are no longer valid
        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");
        
        return Promise.reject(refreshError);
      }
    }

    // If it's not a 401 error (e.g., 404 Not Found, 500 Server Error), just reject it normally
    return Promise.reject(error);
  }
);

export default api;