import React from 'react';
import { View, Platform, TouchableOpacity } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../../theme/tokens';

export default function CollectorTabsLayout() {
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.canvas.primary,
          height: Platform.OS === 'ios' ? 92 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border.default,
          ...theme.shadows.lg,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
        },
        tabBarActiveTintColor: theme.colors.emerald[500],
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: theme.typography.fontFamily.semiBold,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
        tabBarIcon: ({ color }) => (
          <MaterialCommunityIcons name="map-marker-outline" size={24} color={color} />
        ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Posts',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="format-list-bulleted" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-pickups"
        options={{
          title: 'Collections',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="package-variant-closed" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
