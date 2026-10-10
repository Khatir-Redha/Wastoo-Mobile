import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme/tokens';

export type StatusType =
  | 'pending'
  | 'assigned'
  | 'inTransit'
  | 'completed'
  | 'canceled';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export default function StatusBadge({
  status,
  label,
  size = 'md',
  style,
}: StatusBadgeProps) {

  const statusColors = theme.colors.status[status];

  const defaultLabels: Record<StatusType, string> = {
    pending: 'PENDING',
    assigned: 'ASSIGNED',
    inTransit: 'IN TRANSIT',
    completed: 'COMPLETED',
    canceled: 'CANCELED',
  };

  const sizeStyles = {
    sm: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      fontSize: theme.typography.fontSize.xs.size - 1,
    },
    md: {
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: theme.spacing.xs,
      fontSize: theme.typography.fontSize.xs.size,
    },
    lg: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      fontSize: theme.typography.fontSize.xs.size + 1,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: statusColors.bg,
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: statusColors.text,
            fontSize: currentSize.fontSize,
          },
        ]}
      >
        {label || defaultLabels[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
