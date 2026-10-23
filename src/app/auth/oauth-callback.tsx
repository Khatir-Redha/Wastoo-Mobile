import React, { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import api from "../../../lib/api";

export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    accessToken?: string | string[];
    refreshToken?: string | string[];
  }>();
  const router = useRouter();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    WebBrowser.maybeCompleteAuthSession();

    const rawAccessToken = params.accessToken;
    const rawRefreshToken = params.refreshToken;

    const accessToken = Array.isArray(rawAccessToken) ? rawAccessToken[0] : rawAccessToken;
    const refreshToken = Array.isArray(rawRefreshToken) ? rawRefreshToken[0] : rawRefreshToken;

    if (typeof accessToken === "string" && accessToken.length > 0 && typeof refreshToken === "string" && refreshToken.length > 0) {
      try {
        await SecureStore.setItemAsync("access_token", accessToken);
        await SecureStore.setItemAsync("refresh_token", refreshToken);

        api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

        const res = await api.get("/user");
        const user = res.data;
        const userRoleRoute = user?.role
          ? `/${user.role.toLowerCase().replace(/\s+/g, "-")}`
          : "/citizen";
        router.replace(userRoleRoute as any);
      } catch (error) {
        console.error("[OAuthCallback] Failed to save tokens or fetch profile:", error);
        router.replace("/auth" as any);
      }
    } else {
      console.warn("[OAuthCallback] No valid tokens received in callback URL.");
      router.replace("/auth" as any);
    }
  };

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
