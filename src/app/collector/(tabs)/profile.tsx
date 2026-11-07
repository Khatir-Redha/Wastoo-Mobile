import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '../../../../context/AuthProvider';
import { theme } from '../../../theme/tokens';
import { Button } from '../../../components/ui';
import ScreenHeader from '../../../components/collector/ScreenHeader';
import { MaterialIcons } from '@expo/vector-icons';

export default function CollectorProfileScreen() {
  const { logout, user } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'C';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Profile" subtitle="Your collector account" />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {user?.photo ? (
              <Image
                source={{ uri: user.photo }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            )}
          </View>
          <Text style={styles.name}>{user?.name || 'Collector'}</Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Collector</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          {user?.phone && (
            <View style={styles.infoRow}>
              <MaterialIcons name="phone" size={20} color={theme.colors.text.tertiary} />
              <Text style={styles.infoText}>{user.phone}</Text>
            </View>
          )}

          {user?.email && (
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={20} color={theme.colors.text.tertiary} />
              <Text style={styles.infoText}>{user.email}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>

          <TouchableOpacity style={styles.settingRow}>
            <MaterialIcons name="security" size={20} color={theme.colors.text.tertiary} />
            <Text style={styles.settingText}>Change PIN / Password</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <MaterialIcons name="description" size={20} color={theme.colors.text.tertiary} />
            <Text style={styles.settingText}>Terms & Privacy</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <MaterialIcons name="help-outline" size={20} color={theme.colors.text.tertiary} />
            <Text style={styles.settingText}>Help & Support</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logoutSection}>
          <Button
            title="Log Out"
            variant="secondary"
            size="md"
            onPress={logout}
            icon={<MaterialIcons name="logout" size={20} color={theme.colors.error[500]} />}
            iconPosition="left"
            style={{ width: '100%' }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.canvas.secondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.xl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.emerald[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.emerald[700],
  },
  name: {
    fontSize: theme.typography.fontSize['2xl'].size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  infoSection: {
    paddingHorizontal: theme.spacing.xl,
  },
  roleBadge: {
    backgroundColor: theme.colors.emerald[50],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    marginTop: theme.spacing.md,
  },
  roleText: {
    color: theme.colors.emerald[500],
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  infoText: {
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
  },
  section: {
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  settingText: {
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
  },
  logoutSection: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.xl,
  },
});