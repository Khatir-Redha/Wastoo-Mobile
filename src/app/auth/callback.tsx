import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthProvider";

const getSingleParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string | string[];
    state?: string | string[];
    error?: string | string[];
  }>();
  const router = useRouter();
  const { authState, loading, completeGoogleOAuthCode } = useAuth();
  const handledRef = useRef(false);
  const [failed, setFailed] = useState(false);
  const [failureMessage, setFailureMessage] = useState(
    "Google sign-in could not be completed. Please try again.",
  );

  useEffect(() => {
    if (loading || handledRef.current) return;
    handledRef.current = true;

    const code = getSingleParam(params.code);
    const state = getSingleParam(params.state);
    const error = getSingleParam(params.error);

    if (!code || !state || error) {
      if (
        authState === "AUTHENTICATED_COMPLETE" ||
        authState === "AUTHENTICATED_INCOMPLETE"
      ) {
        return;
      }
      setFailed(true);
      const timeout = setTimeout(() => router.replace("/auth" as any), 1500);
      return () => clearTimeout(timeout);
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;
    void completeGoogleOAuthCode(code, state).catch((error: unknown) => {
      const superseded =
        error instanceof Error &&
        (error.message.includes("newer sign-in") ||
          error.message.includes("superseded"));
      setFailureMessage(
        superseded
          ? "A newer sign-in was started. Please try the latest attempt."
          : "This Google sign-in link expired or could not be completed. Please try again.",
      );
      console.error("[OAuthCallback] Google sign-in could not be completed.", {
        errorType: error instanceof Error ? error.name : typeof error,
      });
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
    authState,
    completeGoogleOAuthCode,
    router,
  ]);

  const message = failed ? failureMessage : "Completing sign-in…";

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
