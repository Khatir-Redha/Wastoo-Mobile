import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../../context/AuthProvider'; 
import "../global.css";

function NavigationGuard() {
  const { user, loading } = useAuth(); 
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (loading || !navigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // If no user, redirect to auth screen
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      // Dynamic fallback route based on the user's role string
      // Normalizes "Citizen" -> "/citizen" and "Recycling Centre" -> "/recycling-centre"
      const userRoleRoute = user.role 
        ? `/${user.role.toLowerCase().replace(/\s+/g, '-')}` 
        : '/';

      router.replace(userRoleRoute);
    }
  }, [user, loading, segments, navigationState?.key]);

  if (loading || !navigationState?.key) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#27AE60" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigationGuard />
    </AuthProvider>
  );
}