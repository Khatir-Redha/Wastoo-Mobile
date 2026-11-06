import React, { useState, useEffect } from "react";
import { View, Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { theme } from "../../../theme/tokens";
import { useAuth } from "../../../../context/AuthProvider";
import RequestService, { RequestStatus } from "../../../../services/request.service";
import PostService from "../../../../services/post.service";
import { useRouter } from "expo-router";

export default function CustomTabBar() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();

  const [pendingCount, setPendingCount] = useState(0);

  const tabs = [
    { name: "index", label: "Home", icon: "home-variant-outline", iconLib: "MaterialCommunityIcons" as const },
    { name: "my-posts", label: "My Posts", icon: "bar-chart-2", iconLib: "Feather" as const },
    { name: "create-action", label: "", icon: "", iconLib: "Feather" as const, isPlus: true },
    { name: "pickups", label: "Pickups", icon: "package-variant-closed", iconLib: "MaterialCommunityIcons" as const },
    { name: "profile", label: "Profile", icon: "user", iconLib: "Feather" as const },
  ];

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      try {
        const myPosts = await PostService.getMyPosts();
        const postIds = myPosts.map((p) => p.id);
        let total = 0;
        for (const postId of postIds) {
          const reqs = await RequestService.getRequestsForPost(postId);
          total += reqs.filter((r) => r.status === RequestStatus.PENDING).length;
        }
        if (mounted) setPendingCount(total);
      } catch (e) {
        console.log("Failed to load pending count for tab badge:", e);
      }
    };
    load();
    const unsub = navigation.addListener("focus", load);
    return () => {
      mounted = false;
      unsub();
    };
  }, [user, navigation]);

  const focusedRoute = route.name;

  return (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View style={styles.tabBarInner}>
        {tabs.map((tab) => {
          const isFocused = focusedRoute === tab.name;
          const color = isFocused ? theme.colors.emerald[500] : theme.colors.text.tertiary;

          if (tab.isPlus) {
            return (
              <View
                key={tab.name}
                style={[
                  styles.tabSlot,
                  styles.plusSlot,
                  { width: "20%" },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.plusButton,
                    isFocused && styles.plusButtonFocused,
                  ]}
                  onPress={() => router.push("/citizen/create-post")}
                  accessibilityLabel="Create new post"
                  accessibilityRole="button"
                >
                  <Feather name="plus" size={28} color={theme.colors.text.inverse} />
                </TouchableOpacity>
              </View>
            );
          }

          const IconComponent = tab.iconLib === "Feather" ? Feather : MaterialCommunityIcons;
          const showBadge = tab.name === "my-posts" && pendingCount > 0;

          return (
            <View key={tab.name} style={[styles.tabSlot, { width: "20%" }]}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: isFocused }}
                onPress={() => (navigation as any).navigate(tab.name)}
                style={styles.tabButton}
              >
                <View style={styles.iconWrapper}>
                  <IconComponent name={tab.icon as any} size={24} color={color} />
                  {showBadge && (
                    <View style={[styles.badge, pendingCount > 9 && styles.badgeLarge]}>
                      <Text style={styles.badgeText}>
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused && styles.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
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
  plusButtonFocused: {
    backgroundColor: theme.colors.emerald[600],
  },
});