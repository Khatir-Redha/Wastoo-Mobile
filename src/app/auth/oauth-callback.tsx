import React, { useEffect, useRef } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../../../context/AuthProvider";

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
        .then(() => router.replace("/" as any))
        .catch((error: unknown) => {
          console.error(
            "[OAuthCallback] Legacy sign-in could not be completed:",
            error,
          );
          router.replace("/auth" as any);
        });
    } else if (user) {
      const route = `/${user.role.toLowerCase().replace(/\s+/g, "-")}`;
      router.replace(route as any);
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

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
        gap: 16,
      }}
    >
      <ActivityIndicator size="large" color="#27AE60" />
      <Text style={{ color: "#6d7a6e", fontSize: 14 }}>
        Completing sign-in…
      </Text>
    </View>
  );
}
