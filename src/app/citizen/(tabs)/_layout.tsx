import React from "react";
import { View, Platform, TouchableOpacity } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../../theme/tokens";

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.canvas.primary,
          height: Platform.OS === "ios" ? 92 : 70,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
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
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-variant-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => (
            <Feather name="bar-chart-2" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create-action"
        options={{
          title: "",
          tabBarIcon: () => (
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: theme.colors.emerald[500],
                justifyContent: "center",
                alignItems: "center",
                marginBottom: Platform.OS === "ios" ? 20 : 12,
                ...theme.shadows.md,
              }}
            >
              <Feather name="plus" size={26} color={theme.colors.text.inverse} />
            </View>
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={() => router.push("/create-post")}
              activeOpacity={0.8}
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/create-post");
          },
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => (
            <Feather name="map" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
