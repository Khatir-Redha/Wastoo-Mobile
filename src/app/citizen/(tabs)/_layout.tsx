import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Feather, MaterialIcons, Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#2ECC71",
          height: Platform.OS === "ios" ? 85 : 65,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.7)",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginBottom: Platform.OS === "ios" ? 0 : 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="home" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color }) => (
            <Feather name="bar-chart-2" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
