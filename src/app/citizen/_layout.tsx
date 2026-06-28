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
  }, [user, loading]);

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
    </Stack>
  );
}