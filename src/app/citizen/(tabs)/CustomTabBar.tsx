import React from "react";
import { View, Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { summary: pendingSummary } = usePendingRequestsSummary();
  const pendingCount = pendingSummary.total;

  // Get state from navigation
  const state = navigation.getState();

  const focusedRoute = state?.routes[state?.index ?? 0]?.name as string;

  const openCreatePost = () => {
    router.push("/citizen/create-post");
  };

  // Render tab slots in order: Home, My Posts, [+], Pickups, Profile
  return (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View style={styles.tabBarInner}>
        {/* Slot 1: Home */}
        <View style={styles.tabSlot}>
          <TabButton
            routeName="index"
            config={TAB_CONFIG["index"]}
            isFocused={focusedRoute === "index"}
            showBadge={false}
          />
        </View>

        {/* Slot 2: My Posts */}
        <View style={styles.tabSlot}>
          <TabButton
            routeName="my-posts"
            config={TAB_CONFIG["my-posts"]}
            isFocused={focusedRoute === "my-posts"}
            showBadge={pendingCount > 0}
            badgeCount={pendingCount}
          />
        </View>

        {/* Slot 3: Plus button (center) */}
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

        {/* Slot 4: Requests */}
        <View style={styles.tabSlot}>
          <TabButton
            routeName="requests"
            config={TAB_CONFIG["requests"]}
            isFocused={focusedRoute === "requests"}
            showBadge={pendingCount > 0}
            badgeCount={pendingCount}
          />
        </View>

        {/* Slot 5: Profile */}
        <View style={styles.tabSlot}>
          <TabButton
            routeName="profile"
            config={TAB_CONFIG["profile"]}
            isFocused={focusedRoute === "profile"}
            showBadge={false}
          />
        </View>
      </View>
    </View>
  );
}

interface TabButtonProps {
  routeName: string;
  config: { label: string; icon: string; iconLib: "Feather" | "MaterialCommunityIcons" };
  isFocused: boolean;
  showBadge: boolean;
  badgeCount?: number;
}

function TabButton({ routeName, config, isFocused, showBadge, badgeCount }: TabButtonProps) {
  const router = useRouter();

  const color = isFocused ? theme.colors.emerald[500] : theme.colors.text.tertiary;
  const IconComponent = config.iconLib === "Feather" ? Feather : MaterialCommunityIcons;

  const handlePress = () => {
    const path = routeName === "index" ? "/citizen" : `/citizen/${routeName}`;
    router.push(path as any);
  };

  const badgeStyle = showBadge
    ? [styles.badge, badgeCount && badgeCount > 9 ? styles.badgeLarge : {}]
    : [];

  const labelStyle = isFocused ? [styles.tabLabel, styles.tabLabelActive] : [styles.tabLabel];

  return (
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
              {badgeCount && badgeCount > 9 ? "9+" : badgeCount ?? 0}
            </Text>
          </View>
        )}
      </View>
      <Text style={labelStyle}>
        {config.label}
      </Text>
    </TouchableOpacity>
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