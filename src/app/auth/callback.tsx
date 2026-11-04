import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthProvider";

const getSingleParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const roleRoute = (role?: string) =>
  role ? `/${role.toLowerCase().replace(/\s+/g, "-")}` : "/citizen";

export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string | string[];
    state?: string | string[];
    error?: string | string[];
  }>();
  const router = useRouter();
  const { user, loading, completeGoogleOAuthCode } = useAuth();
  const handledRef = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (loading || handledRef.current) return;
    handledRef.current = true;

    const code = getSingleParam(params.code);
    const state = getSingleParam(params.state);
    const error = getSingleParam(params.error);

    if (!code || !state || error) {
      if (user) {
        router.replace(roleRoute(user.role) as any);
      } else {
        setFailed(true);
        const timeout = setTimeout(() => router.replace("/auth" as any), 1500);
        return () => clearTimeout(timeout);
      }
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;
    void completeGoogleOAuthCode(code, state)
      .then((profile) => router.replace(roleRoute(profile.role) as any))
      .catch((callbackError: unknown) => {
        console.error(
          "[OAuthCallback] Google sign-in could not be completed:",
          callbackError,
        );
        setFailed(true);
        timeout = setTimeout(() => router.replace("/auth" as any), 1500);
      });

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [
    loading,
    params.code,
    params.error,
    params.state,
    user,
    completeGoogleOAuthCode,
    router,
  ]);

  const message = failed
    ? "Google sign-in could not be completed. Please try again."
    : "Completing sign-in…";

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
      {!failed && <ActivityIndicator size="large" color="#27AE60" />}
      <Text style={{ color: "#6d7a6e", fontSize: 14 }}>{message}</Text>
    </View>
  );
}
