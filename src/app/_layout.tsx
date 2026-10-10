import React, { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../../context/AuthProvider";
import SessionExpiredModal from "../components/SessionExpiredModal";
import "../global.css";

function NavigationGuard() {
  const { user, loading, sessionExpired, dismissSessionExpired } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/auth" as any);
    } else if (user && inAuthGroup) {
      const userRoleRoute = user.role
        ? `/${user.role.toLowerCase().replace(/\s+/g, "-")}`
        : "/";
      router.replace(userRoleRoute as any);
    }
  }, [user, loading, segments]);

  return (
    <>
      <Slot />
      <SessionExpiredModal
        visible={sessionExpired}
        onLogin={() => {
          dismissSessionExpired();
          router.replace("/auth" as any);
        }}
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
  },
});
