import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../../context/AuthProvider";
import { getAuthRoute } from "../../lib/auth-profile";
import SessionExpiredModal from "../components/SessionExpiredModal";
import "../global.css";

function NavigationGuard() {
  const {
    user,
    authState,
    retrySessionRestoration,
    sessionExpired,
    dismissSessionExpired,
  } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const lastRedirect = useRef<string | null>(null);
  const inAuthGroup = segments[0] === "(auth)" || segments[0] === "auth";
  const inOnboarding = segments[0] === "onboarding";
  const inSharedAuthenticatedRoute =
    segments[0] === "notifications" || segments[0] === "pickups";

  const expectedRoute = getAuthRoute(authState, user?.role);

  const isAtExpectedRoute =
    authState === "UNAUTHENTICATED"
      ? inAuthGroup
      : authState === "AUTHENTICATED_INCOMPLETE"
        ? inOnboarding
        : authState === "AUTHENTICATED_COMPLETE" && expectedRoute
        ? segments[0] === expectedRoute.slice(1) ||
          inSharedAuthenticatedRoute
        : false;

  useEffect(() => {
    if (
      authState === "INITIALIZING" ||
      authState === "RESTORATION_ERROR" ||
      !expectedRoute
    ) {
      return;
    }

    if (isAtExpectedRoute) {
      lastRedirect.current = null;
      return;
    }

    if (lastRedirect.current === expectedRoute) return;
    lastRedirect.current = expectedRoute;
    if (segments[0] === "notifications") {
      console.warn("[Notifications] REDIRECT_TRIGGERED", {
        from: `/${segments.join("/")}`,
        to: expectedRoute,
        condition:
          authState === "AUTHENTICATED_COMPLETE"
            ? "notification route was not accepted as a shared authenticated route"
            : `auth state ${authState} is not authenticated and complete`,
        authState,
        role: user?.role ?? null,
        stack: new Error().stack,
      });
    }
    if (segments.includes("create-post")) {
      console.warn("[CreatePost] REDIRECT_TRIGGERED", {
        from: `/${segments.join("/")}`,
        to: expectedRoute,
        authState,
        role: user?.role ?? null,
        stack: new Error().stack,
      });
    }
    router.replace(expectedRoute as any);
  }, [authState, expectedRoute, isAtExpectedRoute, router, segments, user?.role]);

  if (authState === "INITIALIZING") {
    return (
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color="#087F5B" />
      </View>
    );
  }

  if (authState === "RESTORATION_ERROR") {
    return (
      <View style={styles.overlay}>
        <Text style={styles.errorTitle}>Could not restore your session</Text>
        <Text style={styles.errorMessage}>
          Check your connection and try again. Your saved sign-in has been kept.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void retrySessionRestoration()}
          style={styles.retryButton}
        >
          <Text style={styles.retryLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      {isAtExpectedRoute ? (
        <Slot />
      ) : (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#087F5B" />
        </View>
      )}
      <SessionExpiredModal
        visible={sessionExpired}
        onLogin={dismissSessionExpired}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <NavigationGuard />
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  errorTitle: {
    color: "#172B2A",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  errorMessage: {
    color: "#64746e",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#087F5B",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
