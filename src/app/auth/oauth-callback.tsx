import React, { useEffect, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../../../context/AuthProvider";
import { LoadingScreen } from "../../components/ui/LoadingScreen";

export default function LegacyOAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    accessToken?: string | string[];
    refreshToken?: string | string[];
  }>();
  const router = useRouter();
  const { user, completeOAuthTokens } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    WebBrowser.maybeCompleteAuthSession();

    const rawAccessToken = params.accessToken;
    const rawRefreshToken = params.refreshToken;
    const accessToken = Array.isArray(rawAccessToken)
      ? rawAccessToken[0]
      : rawAccessToken;
    const refreshToken = Array.isArray(rawRefreshToken)
      ? rawRefreshToken[0]
      : rawRefreshToken;

    if (accessToken && refreshToken) {
      handledRef.current = true;
      void completeOAuthTokens(accessToken, refreshToken)
        .then(() => undefined)
        .catch(() => {
          console.error("[OAuthCallback] Legacy sign-in could not be completed.");
          router.replace("/auth" as any);
        });
    } else if (user) {
      return;
    } else {
      router.replace("/auth" as any);
    }
  }, [
    params.accessToken,
    params.refreshToken,
    user,
    completeOAuthTokens,
    router,
  ]);

  return <LoadingScreen message="Signing you in…" />;
}