import React from 'react';
import { Stack } from 'expo-router';

export default function CitizenRootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Contains the Tab Bar & FAB */}
      <Stack.Screen name="(tabs)" /> 
      
      {/* Opens completely full-screen without Tab Bar or FAB */}
      <Stack.Screen 
        name="[id]/index" 
        options={{ 
          animation: 'slide_from_right' // Clean native transition
        }} 
      />
    </Stack>
  );
}