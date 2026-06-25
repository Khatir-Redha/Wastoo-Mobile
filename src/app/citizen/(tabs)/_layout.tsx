import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#2ECC71',
            height: Platform.OS === 'ios' ? 85 : 65,
            borderTopWidth: 0,
            elevation: 0,
          },
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.7)',
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
            title: 'Home',
            tabBarIcon: ({ color }) => <MaterialIcons name="home" size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: 'Activity',
            tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
          }}
        />
      </Tabs>

      {/* The FAB will now ONLY appear on Home, Activity, and Profile! */}
      <TouchableOpacity
        activeOpacity={0.8}
        className="absolute bottom-[80px] right-6 w-14 h-14 bg-[#4ADE80] rounded-full items-center justify-center"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <Feather name="plus" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
}