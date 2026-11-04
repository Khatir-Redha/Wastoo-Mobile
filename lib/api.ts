import axios, { create, isAxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import { appEvents, APP_EVENTS } from "./appEvents";
import {
  advanceAuthSessionGeneration,
  decodeJwtIdentity,
  getAuthSessionGeneration,
  isCurrentAuthSessionGeneration,
  withAuthCredentialWrite,
} from "./auth-session";

declare module "axios" {
  interface AxiosRequestConfig {
    wastooAuthSessionGeneration?: number;
    wastooAuthProvider?: string;
  }

  interface InternalAxiosRequestConfig {
    wastooAuthSessionGeneration?: number;
    wastooAuthProvider?: string;
  }
}

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!configuredApiUrl) {
  throw new Error(
    "EXPO_PUBLIC_API_URL must be set to the HTTPS Wastoo API URL.",
  );
}

const parsedApiUrl = new URL(configuredApiUrl);
if (
  parsedApiUrl.protocol !== "https:" ||
  ["localhost", "127.0.0.1", "::1", "10.0.2.2"].includes(
    parsedApiUrl.hostname.toLowerCase(),
  )
) {
  throw new Error(
    "EXPO_PUBLIC_API_URL must use a public HTTPS host, not a localhost or emulator address.",
  );
}

export const API_URL = configuredApiUrl.replace(/\/+$/, "");
const apiClientInstanceId = `api-${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;

const api = create({
  baseURL: API_URL,
  timeout: 10000, // Prevents infinite hanging requests
});

const clearInvalidSession = async (expectedGeneration?: number) => {
  const clearedGeneration = await withAuthCredentialWrite<number | null>(
    async () => {
      if (
        expectedGeneration !== undefined &&
        !isCurrentAuthSessionGeneration(expectedGeneration)
      ) {
        return null;
      }
      const generation = advanceAuthSessionGeneration("refresh-token-invalid");
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("refresh_token");
      delete api.defaults.headers.common["Authorization"];
      return generation;
    },
  );
  if (clearedGeneration !== null) {
    appEvents.emit(APP_EVENTS.SESSION_EXPIRED, clearedGeneration);
  }
};

// ==========================================
// REQUEST INTERCEPTOR
// Runs before every API request to attach the short-lived Access Token
// ==========================================
api.interceptors.request.use(
  async (config) => {
    const requestGeneration =
      config.wastooAuthSessionGeneration ?? getAuthSessionGeneration();
    config.wastooAuthSessionGeneration = requestGeneration;
    if (!isCurrentAuthSessionGeneration(requestGeneration)) {
      return Promise.reject(
        new Error("Request belongs to a previous authentication session."),
      );
    }
    try {
      if (__DEV__ && config.url?.split("?")[0] === "/user") {
        const authorization = config.headers.get("Authorization");
        const bearerToken =
          typeof authorization === "string" &&
          authorization.startsWith("Bearer ")
            ? authorization.slice("Bearer ".length)
            : "";
        let endpoint: URL | null = null;
        try {
          endpoint = new URL(config.url, config.baseURL ?? API_URL);
        } catch {
          endpoint = null;
        }
        console.info("[API]", {
          stage: "AUTHENTICATED_PROFILE_REQUEST",
          apiClientInstanceId,
          provider: config.wastooAuthProvider ?? "unknown",
          host: endpoint?.host ?? "invalid-url",
          path: endpoint?.pathname ?? config.url,
          sessionGeneration: requestGeneration,
          authorizationHeaderPresent: Boolean(authorization),
          bearerTokenPresent: Boolean(bearerToken),
          jwtIdentity: bearerToken ? decodeJwtIdentity(bearerToken) : null,
        });
      }
      if (config.headers.has("Authorization")) return config;
      const accessToken = await SecureStore.getItemAsync("access_token");
      if (!isCurrentAuthSessionGeneration(requestGeneration)) {
        throw new Error("Authentication session changed before request.");
      }

      if (accessToken) {
        // Use .set() for modern Axios TypeScript compatibility
        config.headers.set("Authorization", `Bearer ${accessToken}`);
      }
      return config;
    } catch (error) {
      if (!isCurrentAuthSessionGeneration(requestGeneration)) {
        return Promise.reject(error);
      }
      console.error("Error fetching access token from SecureStore", error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ==========================================
// RESPONSE INTERCEPTOR
// Runs after every API request. Catches 401 errors and silently refreshes the token.
// ==========================================
api.interceptors.response.use(
  (response) => {
    if (
      response.config.wastooAuthSessionGeneration !== undefined &&
      !isCurrentAuthSessionGeneration(
        response.config.wastooAuthSessionGeneration,
      )
    ) {
      return Promise.reject(
        new Error("Response belongs to a previous authentication session."),
      );
    }
    // Any status code that lies within the range of 2xx causes this function to trigger
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const requestGeneration = originalRequest?.wastooAuthSessionGeneration;
    if (
      requestGeneration !== undefined &&
      !isCurrentAuthSessionGeneration(requestGeneration)
    ) {
      return Promise.reject(error);
    }

    // If the error is 401 (Unauthorized) and we haven't already tried to refresh
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true; // Mark this request so we don't get stuck in a loop

      try {
        // 1. Get the refresh token from secure storage
        const refreshToken = await SecureStore.getItemAsync("refresh_token");
        if (
          requestGeneration !== undefined &&
          !isCurrentAuthSessionGeneration(requestGeneration)
        ) {
          throw new Error(
            "Authentication session changed during token refresh.",
          );
        }

        if (!refreshToken) {
          throw new Error("No refresh token available in SecureStore");
        }

        // 2. Ask the backend for a new access token
        // Use standard 'axios' here, NOT 'api', to avoid triggering our interceptors again!
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken: refreshToken,
        });
        if (
          requestGeneration !== undefined &&
          !isCurrentAuthSessionGeneration(requestGeneration)
        ) {
          throw new Error(
            "Authentication session changed during token refresh.",
          );
        }

        const newAccessToken: unknown = response.data?.accessToken;
        if (typeof newAccessToken !== "string" || !newAccessToken) {
          throw new Error("Refresh response did not contain an access token.");
        }

        // 3. Save the new Access Token to the phone
        await withAuthCredentialWrite(async () => {
          if (
            requestGeneration !== undefined &&
            !isCurrentAuthSessionGeneration(requestGeneration)
          ) {
            throw new Error(
              "Authentication session changed during token refresh.",
            );
          }
          const currentRefreshToken =
            await SecureStore.getItemAsync("refresh_token");
          if (currentRefreshToken !== refreshToken) {
            throw new Error(
              "Authentication session changed during token refresh.",
            );
          }
          await SecureStore.setItemAsync("access_token", newAccessToken);
        });

        // 4. Update the failed original request with the new token
        originalRequest.headers.set(
          "Authorization",
          `Bearer ${newAccessToken}`,
        );

        // 5. Try the original request again
        return api(originalRequest);
      } catch (refreshError: unknown) {
        const invalidSession =
          (isAxiosError(refreshError) &&
            (refreshError.response?.status === 401 ||
              refreshError.response?.status === 403)) ||
          (refreshError instanceof Error &&
            refreshError.message ===
              "No refresh token available in SecureStore");

        if (
          invalidSession &&
          (requestGeneration === undefined ||
            isCurrentAuthSessionGeneration(requestGeneration))
        ) {
          await clearInvalidSession(requestGeneration);
        } else {
          console.warn(
            "Token refresh did not complete; retaining saved credentials.",
            isAxiosError(refreshError)
              ? { status: refreshError.response?.status ?? "network-error" }
              : "unexpected-refresh-response",
          );
        }

        return Promise.reject(refreshError);
      }
    }

    // If it's not a 401 error (e.g., 404 Not Found, 500 Server Error), just reject it normally
    return Promise.reject(error);
  },
);

export default api;
