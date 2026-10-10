import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme/tokens';

type EmptyStateIcon =
  | 'clipboard-text-outline'
  | 'truck-outline'
  | 'magnify'
  | 'alert-circle-outline'
  | 'package-variant-closed';

interface EmptyStateProps {
  icon?: EmptyStateIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export default function EmptyState({
  icon = 'clipboard-text-outline',
  title,
  description,
  action,
  style,
}: EmptyStateProps) {

  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons
        name={icon}
        size={56}
        color={theme.colors.border.default}
      />

      <Text style={styles.title}>{title}</Text>

      {description && (
        <Text style={styles.description}>{description}</Text>
      )}

      {action && (
        <View style={styles.actionContainer}>
          {action}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['5xl'],
    paddingHorizontal: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  description: {
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.disabled,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionContainer: {
    marginTop: theme.spacing.xl,
  },
});
