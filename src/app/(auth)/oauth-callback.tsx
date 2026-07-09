import React, { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import api from "../../../lib/api";

/**
 * OAuth Callback Screen
 *
 * This screen handles the deep-link redirect from the backend after a successful
 * Google OAuth sign-in. The backend redirects to:
 *   wastoo://auth/oauth-callback?accessToken=TOKEN&refreshToken=RTOKEN
 *
 * This screen:
 *  1. Is rendered briefly when the deep link fires.
 *  2. Picks up the tokens from the URL params.
 *  3. Saves them to SecureStore.
 *  4. Signals expo-web-browser to close the auth session.
 *  5. Navigation is then handled by the root NavigationGuard in _layout.tsx.
 */
export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    accessToken?: string;
    refreshToken?: string;
  }>();
  const router = useRouter();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    // Signal to WebBrowser that the auth session is complete (closes the browser tab)
    WebBrowser.maybeCompleteAuthSession();

    const { accessToken, refreshToken } = params;

    if (accessToken && refreshToken) {
      try {
        // Persist the tokens exactly the same way as the password login flow
        await SecureStore.setItemAsync("access_token", accessToken);
        await SecureStore.setItemAsync("refresh_token", refreshToken);

        // Set Authorization header so the next /user request works
        api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
      } catch (error) {
        console.error("[OAuthCallback] Failed to save tokens:", error);
      }
    } else {
      console.warn("[OAuthCallback] No tokens received in callback URL.");
    }
    // The NavigationGuard in _layout.tsx will redirect once SecureStore is hydrated
    // on the next app render. We can also push manually, but the guard handles it.
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
