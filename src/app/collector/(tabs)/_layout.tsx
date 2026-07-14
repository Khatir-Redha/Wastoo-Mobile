import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function CollectorTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1E5631',
          height: Platform.OS === 'ios' ? 96 : 76,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.55)',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Available',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="truck-delivery-outline" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="map-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-pickups"
        options={{
          title: 'My Pickups',
          tabBarIcon: ({ color }) => (
            <Feather name="list" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
