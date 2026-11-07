import React from 'react';
import { Tabs } from 'expo-router';
import CollectorTabBarButton from '../../../components/collector/CollectorTabBarButton';

export default function CollectorTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // We use custom tab bar
      }}
      tabBar={() => <CollectorTabBarButton />}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
        }}
      />
      <Tabs.Screen
        name="my-pickups"
        options={{
          title: 'Pickups',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}