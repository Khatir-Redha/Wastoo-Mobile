import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../../context/AuthProvider'; // Double-check if this should be '../' or '../../' depending on your folder layout
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
      // FIX 1: Clean route path without group brackets
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      // FIX 2: If clean '/' fails on your downgraded SDK, explicitly hit the group index
      router.replace('/');
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