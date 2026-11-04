import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { isAxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import api from "../lib/api";
import {
  advanceAuthSessionGeneration,
  beginProfileRequest,
  decodeJwtIdentity,
  getAuthSessionGeneration,
  invalidateProfileRequests,
  isCurrentAuthSessionGeneration,
  isCurrentProfileRequest,
  OAuthCallbackDeduplicator,
  OAuthAttemptLifecycle,
  withAuthCredentialWrite,
} from "../lib/auth-session";
import { appEvents, APP_EVENTS } from "../lib/appEvents";
import {
  authStateForProfile,
  parseAuthenticatedUser,
  type AuthState,
  type AuthenticatedUser,
} from "../lib/auth-profile";
import {
  clearGoogleOAuthAttempt,
  exchangeGoogleOAuthCode,
  getGoogleOAuthAttemptId,
  openGoogleOAuth,
} from "../services/google-auth.service";
import { openFacebookOAuth } from "../services/facebook-auth.service";
import { usePushNotifications } from "../src/hooks/usePushNotifications";

export type User = AuthenticatedUser;
export type { AuthState } from "../lib/auth-profile";

type SessionTokens = { accessToken: string; refreshToken: string };
type ProfileFetchOptions = {
  generation?: number;
  provider?: string;
  previousUserId?: number;
};

let nextAuthProviderInstanceId = 0;
const activeProfileRequests = new Map<number, AbortController>();

const cancelProfileRequests = () => {
  invalidateProfileRequests();
  for (const controller of activeProfileRequests.values()) {
    controller.abort();
  }
  activeProfileRequests.clear();
};

class StaleProfileRequestError extends Error {
  constructor() {
    super("Profile response belongs to a stale authentication session.");
    this.name = "StaleProfileRequestError";
  }
}

const sanitizedEmail = (email?: string) => {
  if (!email) return undefined;
  const [name, domain] = email.split("@");
  if (!name || !domain) return "invalid-email";
  return `${name.slice(0, 1)}***@${domain}`;
};

const logAuthDiagnostic = (
  stage: string,
  details: Record<string, unknown> = {},
) => {
  if (__DEV__) console.info("[Auth]", { stage, ...details });
};

export type AuthContextType = {
  user: User | null;
  authState: AuthState;
  loading: boolean;
  retrySessionRestoration: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  facebookLogin: () => Promise<void>;
  logout: () => Promise<void>;
  completeOAuthTokens: (
    accessToken: string,
    refreshToken: string,
  ) => Promise<void>;
  completeGoogleOAuthCode: (code: string, state: string) => Promise<User>;
  completeOnboarding: (data: {
    role: "CITIZEN" | "COLLECTOR" | "RECYCLING_CENTER";
    name?: string;
    phone: string;
  }) => Promise<User>;
  sessionExpired: boolean;
  dismissSessionExpired: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authState, setAuthState] = useState<AuthState>("INITIALIZING");
  const [sessionExpired, setSessionExpired] = useState(false);
  const { initPushNotifications } = usePushNotifications();
  const googleOAuthCallbacks = useRef(new OAuthCallbackDeduplicator<User>());
  const initializationStarted = useRef(false);
  const oauthAttempt = useRef(new OAuthAttemptLifecycle());
  const authProviderInstanceId = useRef<number | null>(null);
  if (authProviderInstanceId.current === null) {
    nextAuthProviderInstanceId += 1;
    authProviderInstanceId.current = nextAuthProviderInstanceId;
  }

  useEffect(() => {
    if (initializationStarted.current) return;
    initializationStarted.current = true;
    void hydrateAuthSession();
  }, []);

  useEffect(() => {
    const instanceId = authProviderInstanceId.current;
    logAuthDiagnostic("AUTH_PROVIDER_MOUNTED", {
      providerInstanceId: instanceId,
    });
    return () => {
      logAuthDiagnostic("AUTH_PROVIDER_UNMOUNTED", {
        providerInstanceId: instanceId,
      });
    };
  }, []);

  useEffect(() => {
    if (user) {
      initPushNotifications();
    }
  }, [user]);

  // Listen for the global "session expired" event fired by the API interceptor
  // when token refresh fails. Clear auth and surface a friendly UI.
  useEffect(() => {
    const onSessionExpired = (expiredGeneration?: number) => {
      if (
        expiredGeneration !== undefined &&
        !isCurrentAuthSessionGeneration(expiredGeneration)
      ) {
        return;
      }
      cancelProfileRequests();
      setUser(null);
      setAuthState("UNAUTHENTICATED");
      setSessionExpired(true);
    };

    appEvents.on(APP_EVENTS.SESSION_EXPIRED, onSessionExpired);
    return () => {
      appEvents.off(APP_EVENTS.SESSION_EXPIRED, onSessionExpired);
    };
  }, []);

  const fetchProfile = async (
    token: string,
    options: ProfileFetchOptions = {},
  ): Promise<User> => {
    const generation = options.generation ?? getAuthSessionGeneration();
    cancelProfileRequests();
    const requestId = beginProfileRequest();
    const controller = new AbortController();
    activeProfileRequests.set(requestId, controller);
    const isCurrentRequest = () =>
      isCurrentAuthSessionGeneration(generation) &&
      isCurrentProfileRequest(requestId);
    const discardStaleRequest = (outcome: "response" | "error") => {
      logAuthDiagnostic("PROFILE_FETCH_DISCARDED_STALE", {
        provider: options.provider ?? "session",
        generation,
        requestId,
        providerInstanceId: authProviderInstanceId.current,
        currentGeneration: getAuthSessionGeneration(),
        outcome,
      });
    };
    logAuthDiagnostic("PROFILE_FETCH_STARTED", {
      provider: options.provider ?? "session",
      generation,
      requestId,
      providerInstanceId: authProviderInstanceId.current,
    });
    try {
      const storedAccessToken = await SecureStore.getItemAsync("access_token");
      if (!isCurrentRequest()) {
        discardStaleRequest("error");
        throw new StaleProfileRequestError();
      }
      logAuthDiagnostic("PROFILE_REQUEST_TOKEN_SELECTED", {
        provider: options.provider ?? "session",
        providerInstanceId: authProviderInstanceId.current,
        generation,
        requestId,
        tokenMatchesSecureStore: storedAccessToken === token,
        jwtIdentity: decodeJwtIdentity(token),
      });
      const res = await api.get("/user", {
        wastooAuthSessionGeneration: generation,
        wastooAuthProvider: options.provider ?? "session",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        params: { _: Date.now() },
        signal: controller.signal,
      });

      logAuthDiagnostic("PROFILE_HTTP_RESPONSE", {
        provider: options.provider ?? "session",
        providerInstanceId: authProviderInstanceId.current,
        generation,
        requestId,
        status: res.status,
      });
      if (!isCurrentRequest()) {
        discardStaleRequest("response");
        throw new StaleProfileRequestError();
      }
      const profile = parseAuthenticatedUser(res.data, res.status);
      if (!isCurrentRequest()) {
        discardStaleRequest("response");
        throw new StaleProfileRequestError();
      }

      setUser(profile);
      setAuthState(authStateForProfile(profile));
      logAuthDiagnostic("PROFILE_FETCH_SUCCEEDED", {
        provider: options.provider ?? "session",
        providerInstanceId: authProviderInstanceId.current,
        userId: profile.id,
        email: sanitizedEmail(profile.email),
        role: profile.role,
        onboardingCompleted: profile.onboardingCompleted,
        oldSessionReplaced:
          options.previousUserId !== undefined &&
          options.previousUserId !== profile.id,
      });
      return profile;
    } catch (error) {
      if (error instanceof StaleProfileRequestError) throw error;
      if (!isCurrentRequest()) {
        discardStaleRequest("error");
        throw new StaleProfileRequestError();
      }
      console.error(
        "Failed to fetch user profile:",
        isAxiosError(error)
          ? { status: error.response?.status ?? "network-or-server-error" }
          : error instanceof Error
            ? error.message
            : "Unknown profile error",
      );
      try {
        const [savedToken, savedRefreshToken] = await Promise.all([
          SecureStore.getItemAsync("access_token"),
          SecureStore.getItemAsync("refresh_token"),
        ]);
        if (!isCurrentRequest()) {
          discardStaleRequest("error");
          throw new StaleProfileRequestError();
        }
        if (savedToken || savedRefreshToken) {
          setAuthState("RESTORATION_ERROR");
        }
      } catch (storageError) {
        if (!isCurrentRequest()) {
          discardStaleRequest("error");
          throw new StaleProfileRequestError();
        }
        console.error("Could not inspect the saved session:", storageError);
        setAuthState("RESTORATION_ERROR");
      }
      throw error;
    } finally {
      activeProfileRequests.delete(requestId);
    }
  };

  const replaceStoredSession = async (
    tokens: SessionTokens,
    provider: string,
    attemptId: string,
  ) => {
    const [previousAccessToken, previousRefreshToken] = await Promise.all([
      SecureStore.getItemAsync("access_token"),
      SecureStore.getItemAsync("refresh_token"),
    ]);
    const previousUserId = user?.id;
    const restorePreviousTokens = async () => {
      if (previousAccessToken) {
        await SecureStore.setItemAsync("access_token", previousAccessToken);
      } else {
        await SecureStore.deleteItemAsync("access_token");
      }
      if (previousRefreshToken) {
        await SecureStore.setItemAsync("refresh_token", previousRefreshToken);
      } else {
        await SecureStore.deleteItemAsync("refresh_token");
      }
    };

    const tokensWritten = await withAuthCredentialWrite(async () => {
      if (!oauthAttempt.current.isCurrent(attemptId)) return false;
      try {
        await SecureStore.setItemAsync("access_token", tokens.accessToken);
        if (!oauthAttempt.current.isCurrent(attemptId)) {
          await restorePreviousTokens();
          return false;
        }
        await SecureStore.setItemAsync("refresh_token", tokens.refreshToken);
        if (!oauthAttempt.current.isCurrent(attemptId)) {
          await restorePreviousTokens();
          return false;
        }
        const [storedAccessToken, storedRefreshToken] = await Promise.all([
          SecureStore.getItemAsync("access_token"),
          SecureStore.getItemAsync("refresh_token"),
        ]);
        if (
          storedAccessToken !== tokens.accessToken ||
          storedRefreshToken !== tokens.refreshToken
        ) {
          throw new Error(
            "The authenticated credentials were not saved as expected.",
          );
        }
        return true;
      } catch (error) {
        try {
          await restorePreviousTokens();
        } catch (restoreError) {
          console.error(
            "Could not restore the previous credentials after a failed session replacement.",
            restoreError,
          );
          throw new Error(
            "Authentication credentials could not be safely replaced. Please retry sign-in.",
          );
        }
        throw error;
      }
    });

    if (!tokensWritten || !oauthAttempt.current.isCurrent(attemptId)) {
      if (tokensWritten) {
        await withAuthCredentialWrite(async () => {
          const currentAccessToken =
            await SecureStore.getItemAsync("access_token");
          if (currentAccessToken === tokens.accessToken) {
            await restorePreviousTokens();
          }
        });
      }
      logAuthDiagnostic("AUTH_ATTEMPT_SUPERSEDED", {
        attemptId,
        operation: "session-token-write",
      });
      throw new Error("A newer sign-in attempt has replaced this one.");
    }

    const generation = advanceAuthSessionGeneration(
      "authenticated-session-replaced",
    );
    cancelProfileRequests();
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
    setAuthState("INITIALIZING");
    logAuthDiagnostic("SESSION_TOKENS_REPLACED", {
      provider,
      attemptId,
      secureStoreWriteCompleted: true,
      savedAccessTokenIdentity: decodeJwtIdentity(tokens.accessToken),
      previousSessionPresent:
        previousAccessToken !== null || previousRefreshToken !== null,
    });
    return { generation, previousUserId };
  };

  const hydrateAuthSession = async () => {
    const generation = getAuthSessionGeneration();
    logAuthDiagnostic("SESSION_RESTORATION_STARTED", {
      providerInstanceId: authProviderInstanceId.current,
      generation,
    });
    if (isCurrentAuthSessionGeneration(generation)) {
      setAuthState("INITIALIZING");
    }
    try {
      const savedToken = await SecureStore.getItemAsync("access_token");
      const savedRefreshToken = await SecureStore.getItemAsync("refresh_token");
      logAuthDiagnostic("SESSION_RESTORATION_CREDENTIALS_READ", {
        providerInstanceId: authProviderInstanceId.current,
        generation,
        accessTokenPresent: Boolean(savedToken),
        refreshTokenPresent: Boolean(savedRefreshToken),
      });

      if (!savedToken && !savedRefreshToken) {
        if (isCurrentAuthSessionGeneration(generation)) {
          setUser(null);
          setAuthState("UNAUTHENTICATED");
        }
        return;
      }

      await fetchProfile(savedToken ?? "", { generation });
    } catch (error) {
      if (error instanceof StaleProfileRequestError) {
        logAuthDiagnostic("SESSION_RESTORATION_DISCARDED_STALE", {
          generation,
          request: "superseded",
        });
        return;
      }
      if (!isCurrentAuthSessionGeneration(generation)) {
        logAuthDiagnostic("SESSION_RESTORATION_DISCARDED_STALE", {
          generation,
          currentGeneration: getAuthSessionGeneration(),
        });
        return;
      }
      console.error(
        "Failed to restore the saved authentication session:",
        isAxiosError(error)
          ? { status: error.response?.status ?? "network-or-server-error" }
          : error instanceof Error
            ? error.message
            : "Unknown restoration error",
      );

      let savedToken: string | null;
      let savedRefreshToken: string | null;
      try {
        [savedToken, savedRefreshToken] = await Promise.all([
          SecureStore.getItemAsync("access_token"),
          SecureStore.getItemAsync("refresh_token"),
        ]);
      } catch (storageError) {
        if (!isCurrentAuthSessionGeneration(generation)) {
          logAuthDiagnostic("SESSION_RESTORATION_DISCARDED_STALE", {
            generation,
            currentGeneration: getAuthSessionGeneration(),
          });
          return;
        }
        console.error("Could not inspect the saved session:", storageError);
        setAuthState("RESTORATION_ERROR");
        return;
      }
      if (!isCurrentAuthSessionGeneration(generation)) {
        logAuthDiagnostic("SESSION_RESTORATION_DISCARDED_STALE", {
          generation,
          currentGeneration: getAuthSessionGeneration(),
        });
        return;
      }

      if (!savedToken && !savedRefreshToken) {
        if (isCurrentAuthSessionGeneration(generation)) {
          setUser(null);
          setAuthState("UNAUTHENTICATED");
        }
      } else if (isAxiosError(error) && error.response?.status === 401) {
        const cleanupGeneration = await cleanupAuth(
          "invalid-session-restoration",
        );
        if (isCurrentAuthSessionGeneration(cleanupGeneration)) {
          setAuthState("UNAUTHENTICATED");
        }
      } else {
        if (isCurrentAuthSessionGeneration(generation)) {
          setAuthState("RESTORATION_ERROR");
        }
      }
    }
  };

  const login = async (email: string, password: string) => {
    const attemptId = oauthAttempt.current.start();
    logAuthDiagnostic("AUTH_ATTEMPT_STARTED", {
      provider: "password",
      attemptId,
    });
    try {
      const res = await api.post("/auth/login", { email, password });

      const accessToken = res.data?.token?.accessToken || res.data?.accessToken;
      const refreshToken =
        res.data?.token?.refreshToken || res.data?.refreshToken;

      if (!accessToken || !refreshToken) {
        throw new Error(
          "The login response did not include both session tokens.",
        );
      }

      if (!oauthAttempt.current.isCurrent(attemptId)) {
        throw new Error("A newer sign-in attempt has replaced this one.");
      }
      const session = await replaceStoredSession(
        { accessToken, refreshToken },
        "password",
        attemptId,
      );
      await fetchProfile(accessToken, {
        ...session,
        provider: "password",
      });
    } catch (error) {
      console.error(
        "Login execution failed:",
        isAxiosError(error)
          ? { status: error.response?.status ?? "network-or-server-error" }
          : error instanceof Error
            ? error.message
            : "Unknown login error",
      );
      throw error;
    }
  };

  const commitOAuthTokens = async (
    tokens: SessionTokens,
    provider: string,
    attemptId: string,
  ) => {
    if (!oauthAttempt.current.isCurrent(attemptId)) {
      throw new Error("A newer sign-in attempt has replaced this one.");
    }
    const session = await replaceStoredSession(tokens, provider, attemptId);
    await fetchProfile(tokens.accessToken, { ...session, provider });
  };

  const completeOAuthTokens = async (
    accessToken: string,
    refreshToken: string,
  ) => {
    const attemptId = oauthAttempt.current.start();
    logAuthDiagnostic("AUTH_ATTEMPT_STARTED", { provider: "oauth", attemptId });
    if (!accessToken || !refreshToken) {
      throw new Error("OAuth response did not include both session tokens.");
    }
    await commitOAuthTokens({ accessToken, refreshToken }, "oauth", attemptId);
  };

  const completeOnboarding = async (data: {
    role: "CITIZEN" | "COLLECTOR" | "RECYCLING_CENTER";
    name?: string;
    phone: string;
  }): Promise<User> => {
    await api.patch("/user/onboarding", data);
    const accessToken = await SecureStore.getItemAsync("access_token");
    if (!accessToken) {
      throw new Error("Your session expired. Please sign in again.");
    }
    return fetchProfile(accessToken);
  };

  const completeGoogleOAuthCode = async (
    code: string,
    state: string,
    suppliedAttemptId?: string,
  ): Promise<User> => {
    const currentAttempt = (attemptId: string) =>
      oauthAttempt.current.isCurrent(attemptId);
    const duplicate = googleOAuthCallbacks.current.find(
      code,
      state,
      currentAttempt,
    );
    if (duplicate) {
      logAuthDiagnostic("CALLBACK_DUPLICATE_DETECTED", {
        source: "in-flight-or-completed-code",
        providerInstanceId: authProviderInstanceId.current,
      });
      return duplicate;
    }

    const attemptId =
      suppliedAttemptId ?? (await getGoogleOAuthAttemptId(state));
    if (!attemptId) {
      throw new Error(
        "This Google sign-in link has expired. Please try again.",
      );
    }
    if (!oauthAttempt.current.adopt(attemptId)) {
      logAuthDiagnostic("AUTH_ATTEMPT_SUPERSEDED", {
        attemptId,
        operation: "callback-adoption",
      });
      throw new Error(
        "A newer sign-in was started. Please complete the latest attempt.",
      );
    }
    logAuthDiagnostic("CALLBACK_RECEIVED", {
      attemptId,
      source: suppliedAttemptId ? "browser-result" : "router-callback",
      providerInstanceId: authProviderInstanceId.current,
    });

    return googleOAuthCallbacks.current.run(
      code,
      state,
      attemptId,
      currentAttempt,
      async () => {
        logAuthDiagnostic("GOOGLE_CALLBACK_TRANSACTION_STARTED", { attemptId });
        const tokens = await exchangeGoogleOAuthCode(code, state, attemptId);
        if (!oauthAttempt.current.isCurrent(attemptId)) {
          throw new Error("A newer sign-in attempt has replaced this one.");
        }
        logAuthDiagnostic("GOOGLE_CODE_EXCHANGE_SUCCEEDED", {
          provider: "google",
          attemptId,
          jwtIdentity: decodeJwtIdentity(tokens.accessToken),
        });
        const session = await replaceStoredSession(tokens, "google", attemptId);
        return fetchProfile(tokens.accessToken, {
          ...session,
          provider: "google",
        });
      },
    );
  };

  /**
   * Completes Google authentication through a single-use backend code.
   */
  const googleLogin = async () => {
    googleOAuthCallbacks.current.clear();
    const attemptId = oauthAttempt.current.start();
    logAuthDiagnostic("GOOGLE_LOGIN_ATTEMPT_STARTED", { attemptId });
    logAuthDiagnostic("OAUTH_ATTEMPT_ID_CREATED", { attemptId });
    try {
      const callback = await openGoogleOAuth(attemptId, () =>
        oauthAttempt.current.isCurrent(attemptId),
      );

      if (!callback) {
        if (oauthAttempt.current.isCurrent(attemptId)) {
          oauthAttempt.current.invalidate();
        }
        throw new Error("Google sign-in was cancelled or failed.");
      }

      if (oauthAttempt.current.isCurrent(attemptId)) {
        await completeGoogleOAuthCode(
          callback.code,
          callback.state,
          callback.attemptId,
        );
        return;
      }
      throw new Error("A newer sign-in attempt has replaced this one.");
    } catch (error) {
      logAuthDiagnostic("GOOGLE_LOGIN_FAILED", {
        attemptId,
        errorType: error instanceof Error ? error.name : typeof error,
      });
      if (oauthAttempt.current.isCurrent(attemptId)) {
        oauthAttempt.current.invalidate();
      }
      await clearGoogleOAuthAttempt(attemptId);
      throw error;
    }
  };

  const facebookLogin = async () => {
    const attemptId = oauthAttempt.current.start();
    const tokens = await openFacebookOAuth();

    if (!tokens) {
      throw new Error("Facebook sign-in was cancelled or failed.");
    }

    await commitOAuthTokens(tokens, "facebook", attemptId);
  };

  const cleanupAuth = async (reason = "logout"): Promise<number> => {
    const cleanupGeneration = advanceAuthSessionGeneration(reason);
    cancelProfileRequests();
    // Unregister push token before clearing auth
    try {
      const pushToken = await SecureStore.getItemAsync("push_device_token");
      if (pushToken) {
        await api
          .delete(`/notification/${pushToken}/device-token`)
          .catch(() => {});
        await SecureStore.deleteItemAsync("push_device_token");
      }
    } catch (e) {
      console.warn("Error unregistering push token:", e);
    }

    await withAuthCredentialWrite(async () => {
      if (!isCurrentAuthSessionGeneration(cleanupGeneration)) return;
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("refresh_token");
      delete api.defaults.headers.common["Authorization"];
    });
    if (isCurrentAuthSessionGeneration(cleanupGeneration)) setUser(null);
    return cleanupGeneration;
  };

  const logout = async () => {
    const invalidatedAttemptId = oauthAttempt.current.invalidate();
    googleOAuthCallbacks.current.clear();
    const cleanupPromise = cleanupAuth();
    const [cleanupGeneration] = await Promise.all([
      cleanupPromise,
      clearGoogleOAuthAttempt(invalidatedAttemptId),
    ]);
    if (isCurrentAuthSessionGeneration(cleanupGeneration)) {
      setAuthState("UNAUTHENTICATED");
    }
  };

  const dismissSessionExpired = () => {
    setSessionExpired(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authState,
        loading: authState === "INITIALIZING",
        retrySessionRestoration: hydrateAuthSession,
        login,
        googleLogin,
        facebookLogin,
        logout,
        completeOAuthTokens,
        completeGoogleOAuthCode,
        completeOnboarding,
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
