import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme/tokens';

interface TabConfig {
  name: string;
  label: string;
  icon: string;
  iconLib: 'Feather' | 'MaterialCommunityIcons';
  href: string;
}

const TABS: TabConfig[] = [
  { name: 'map', label: 'Map', icon: 'map-marker-outline', iconLib: 'MaterialCommunityIcons', href: '/collector/map' },
  { name: 'requests', label: 'Requests', icon: 'clipboard-outline', iconLib: 'MaterialCommunityIcons', href: '/collector/requests' },
  { name: 'pickups', label: 'Pickups', icon: 'package-variant-closed', iconLib: 'MaterialCommunityIcons', href: '/collector/my-pickups' },
  { name: 'profile', label: 'Profile', icon: 'user', iconLib: 'Feather', href: '/collector/profile' },
];

export default function CollectorTabBarButton() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const getCurrentRoute = (): string => {
    if (pathname.startsWith('/collector/map')) return 'map';
    if (pathname.startsWith('/collector/requests')) return 'requests';
    if (pathname.startsWith('/collector/my-pickups') || pathname.startsWith('/collector/pickup')) return 'pickups';
    if (pathname.startsWith('/collector/profile')) return 'profile';
    return 'map';
  };

  const currentRoute = getCurrentRoute();

  const handlePress = (href: string) => {
    if (pathname !== href) {
      router.push(href);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const isFocused = currentRoute === tab.name;
        const IconComponent = tab.iconLib === 'Feather' ? Feather : MaterialCommunityIcons;
        const color = isFocused ? theme.colors.emerald[500] : theme.colors.text.tertiary;

        return (
          <TouchableOpacity
            key={tab.name}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isFocused }}
            onPress={() => handlePress(tab.href)}
            style={styles.tabButton}
          >
            <IconComponent name={tab.icon as any} size={24} color={color} />
            <Text
              style={[
                styles.tabLabel,
                isFocused && styles.tabLabelFocused,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.canvas.primary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.default,
    ...theme.shadows.lg,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    minHeight: 46,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  tabLabelFocused: {
    color: theme.colors.emerald[500],
    fontFamily: theme.typography.fontFamily.semiBold,
  },
});