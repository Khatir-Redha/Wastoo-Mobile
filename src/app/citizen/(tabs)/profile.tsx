import React from "react";
import { View, Text, SafeAreaView, Platform, StyleSheet, ScrollView } from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { useAuth } from "../../../../context/AuthProvider";
import { Button, Card } from "../../../components/ui";
import { theme } from "../../../theme/tokens";

export default function ProfileScreen() {
  const { logout, user } = useAuth();

  const menuItems = [
    {
      icon: "person",
      title: "Edit Profile",
      subtitle: "Update your personal information",
      onPress: () => {},
    },
    {
      icon: "notifications",
      title: "Notifications",
      subtitle: "Manage notification preferences",
      onPress: () => {},
    },
    {
      icon: "location-on",
      title: "Addresses",
      subtitle: "Manage your saved addresses",
      onPress: () => {},
    },
    {
      icon: "help-outline",
      title: "Help & Support",
      subtitle: "Get help or contact us",
      onPress: () => {},
    },
    {
      icon: "info-outline",
      title: "About",
      subtitle: "App version and information",
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: Platform.OS === "android" ? 40 : 0 }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* User Info Card */}
        <Card variant="elevated" padding="lg" style={styles.userCard}>
          <View style={styles.avatar}>
            <MaterialIcons
              name="person"
              size={40}
              color={theme.colors.green[700]}
            />
          </View>
          <Text style={styles.userName}>{user?.name || "User"}</Text>
          <Text style={styles.userEmail}>{user?.email || "user@example.com"}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {user?.role || "CITIZEN"}
            </Text>
          </View>
        </Card>

        {/* Stats Card */}
        <Card variant="default" padding="lg" style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>8</Text>
              <Text style={styles.statLabel}>Pickups</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>45 kg</Text>
              <Text style={styles.statLabel}>Recycled</Text>
            </View>
          </View>
        </Card>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {menuItems.map((item, index) => (
            <Card
              key={index}
              variant="default"
              padding="md"
              style={styles.menuItem}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.menuIconBadge}>
                  <MaterialIcons
                    name={item.icon as any}
                    size={24}
                    color={theme.colors.green[700]}
                  />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={theme.colors.text.quaternary}
                />
              </View>
            </Card>
          ))}
        </View>

        {/* Logout Button */}
        <Button
          title="Log Out"
          variant="secondary"
          size="lg"
          onPress={logout}
          icon={<MaterialIcons name="logout" size={20} color={theme.colors.error} />}
          iconPosition="left"
          style={styles.logoutButton}
          textStyle={styles.logoutButtonText}
        />

        {/* App Version */}
        <Text style={styles.versionText}>Wasto v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.canvas.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing['4xl'],
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.canvas.secondary,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['3xl'].size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.green[700],
  },
  userCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.status.completed.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  userName: {
    fontSize: theme.typography.fontSize['2xl'].size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  userEmail: {
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.lg,
  },
  roleBadge: {
    backgroundColor: theme.colors.status.completed.bg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
  },
  roleBadgeText: {
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.status.completed.text,
    letterSpacing: 0.5,
  },
  statsCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.fontSize['2xl'].size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.green[700],
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.tertiary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border.default,
  },
  menuSection: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  menuItem: {
    marginBottom: theme.spacing.md,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconBadge: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.status.completed.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
  },
  logoutButton: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderColor: theme.colors.error,
  },
  logoutButtonText: {
    color: theme.colors.error,
  },
  versionText: {
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.disabled,
    textAlign: 'center',
  },
});
