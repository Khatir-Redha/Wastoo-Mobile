import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthProvider';

export default function CollectorRootLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth' as any);
    }
  }, [user, loading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="pickup/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="pickup/confirm" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
