import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthProvider';

export default function CitizenRootLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth' as any);
    }
  }, [user, loading, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Contains the Tab Bar & FAB */}
      <Stack.Screen name="(tabs)" />

      {/* Opens completely full-screen without Tab Bar or FAB */}
      <Stack.Screen
        name="[id]/index"
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Incoming requests screen (full screen, no tabs) */}
      <Stack.Screen
        name="incoming-requests"
        options={{
          animation: 'slide_from_bottom',
        }}
      />

      {/* Badges / gamification */}
      <Stack.Screen
        name="gamification"
        options={{
          animation: 'slide_from_right',
        }}
      />

      <Stack.Screen
        name="create-post"
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}