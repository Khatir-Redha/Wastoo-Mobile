import React from "react";
import { View, Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { theme } from "../../../theme/tokens";
import { usePendingRequestsSummary } from "@/hooks/usePendingRequestsSummary";

// Configuration keyed by route name
const TAB_CONFIG: Record<string, { label: string; icon: string; iconLib: "Feather" | "MaterialCommunityIcons" }> = {
  index: { label: "Home", icon: "home-variant-outline", iconLib: "MaterialCommunityIcons" },
  "my-posts": { label: "My Posts", icon: "bar-chart-2", iconLib: "Feather" },
  requests: { label: "Requests", icon: "package-variant-closed", iconLib: "MaterialCommunityIcons" },
  profile: { label: "Profile", icon: "user", iconLib: "Feather" },
};

export default function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { summary: pendingSummary } = usePendingRequestsSummary();
  const pendingCount = pendingSummary.total;

  // Determine focused tab from current pathname
  const getCurrentRouteName = (path: string): string => {
    if (path === '/citizen' || path === '/citizen/') return 'index';
    if (path.startsWith('/citizen/my-posts')) return 'my-posts';
    if (path.startsWith('/citizen/requests')) return 'requests';
    if (path.startsWith('/citizen/profile')) return 'profile';
    return 'index';
  };

  const focusedRoute = getCurrentRouteName(pathname);

  const openCreatePost = () => {
    router.push("/citizen/create-post");
  };

  // Render slots: [Home, MyPosts, (+), Requests, Profile]
  return (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View style={styles.tabBarInner}>
        {/* Slot 0: Home */}
        <TabSlot
          routeName="index"
          isFocused={focusedRoute === "index"}
          showBadge={false}
        />

        {/* Slot 1: My Posts */}
        <TabSlot
          routeName="my-posts"
          isFocused={focusedRoute === "my-posts"}
          showBadge={pendingCount > 0}
          badgeCount={pendingCount}
        />

        {/* Slot 2: Plus button (center, not a tab) */}
        <View style={styles.plusSlot}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Create new post"
            onPress={openCreatePost}
            style={styles.plusButton}
          >
            <Feather name="plus" size={28} color={theme.colors.text.inverse} />
          </TouchableOpacity>
        </View>

        {/* Slot 3: Requests */}
        <TabSlot
          routeName="requests"
          isFocused={focusedRoute === "requests"}
          showBadge={pendingCount > 0}
          badgeCount={pendingCount}
        />

        {/* Slot 4: Profile */}
        <TabSlot
          routeName="profile"
          isFocused={focusedRoute === "profile"}
          showBadge={false}
        />
      </View>
    </View>
  );
}

interface TabSlotProps {
  routeName: string;
  isFocused: boolean;
  showBadge?: boolean;
  badgeCount?: number;
}

function TabSlot({ routeName, isFocused, showBadge = false, badgeCount = 0 }: TabSlotProps) {
  const router = useRouter();
  const config = TAB_CONFIG[routeName];

  if (!config) return null;

  const color = isFocused ? theme.colors.emerald[500] : theme.colors.text.tertiary;
  const IconComponent = config.iconLib === "Feather" ? Feather : MaterialCommunityIcons;

  const handlePress = () => {
    if (isFocused) return;
    const path = routeName === "index" ? "/citizen" : `/citizen/${routeName}`;
    router.push(path as any);
  };

  const badgeStyle = showBadge
    ? [styles.badge, badgeCount > 9 ? styles.badgeLarge : {}]
    : [];

  const labelStyle = isFocused ? [styles.tabLabel, styles.tabLabelActive] : [styles.tabLabel];

  return (
    <View style={styles.tabSlot}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={config.label}
        accessibilityState={{ selected: isFocused }}
        onPress={handlePress}
        style={styles.tabButton}
      >
        <View style={styles.iconWrapper}>
          <IconComponent name={config.icon as any} size={24} color={color} />
          {showBadge && (
            <View style={badgeStyle}>
              <Text style={styles.badgeText}>
                {badgeCount > 9 ? "9+" : badgeCount}
              </Text>
            </View>
          )}
        </View>
        <Text style={labelStyle}>
          {config.label}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.canvas.primary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.default,
    ...theme.shadows.lg,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: 4,
  },
  tabBarInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  tabSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  plusSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButton: {
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 4,
    minHeight: 56,
    justifyContent: "flex-end",
  },
  iconWrapper: {
    position: "relative",
    marginBottom: 2,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    backgroundColor: theme.colors.error,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.colors.canvas.primary,
  },
  badgeLarge: {
    minWidth: 24,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: theme.colors.text.inverse,
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.bold,
    lineHeight: 12,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.tertiary,
    textAlign: "center",
  },
  tabLabelActive: {
    color: theme.colors.emerald[500],
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  plusButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.emerald[500],
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadows.md,
    marginBottom: Platform.OS === "ios" ? 6 : 2,
  },
});