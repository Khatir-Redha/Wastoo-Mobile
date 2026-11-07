import React from "react";
import { Tabs, useRouter } from "expo-router";
import CustomTabBar from "./CustomTabBar";

export default function TabsLayout() {
  const router = useRouter();

  const openCreatePost = () => {
    router.push("/citizen/create-post");
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { height: 0 },
      }}
      tabBar={() => <CustomTabBar />}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home" }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/citizen");
          },
        }}
      />
      <Tabs.Screen
        name="my-posts"
        options={{ title: "My Posts" }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/citizen/my-posts");
          },
        }}
      />
      <Tabs.Screen
        name="create-action"
        options={{ title: "" }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            openCreatePost();
          },
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{ title: "Requests" }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/citizen/requests");
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile" }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/citizen/profile");
          },
        }}
      />
    </Tabs>
  );
}