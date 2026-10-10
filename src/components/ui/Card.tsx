import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme/tokens';

type CardVariant = 'default' | 'elevated' | 'bordered' | 'flat';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  style?: ViewStyle;
  onPress?: () => void;
}

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  style,
}: CardProps) {

  const paddingStyles = {
    none: 0,
    sm: theme.spacing.md,
    md: theme.spacing.lg,
    lg: theme.spacing.xl,
  };

  const variantStyles = {
    default: {
      backgroundColor: theme.colors.canvas.primary,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      ...theme.shadows.sm,
    },
    elevated: {
      backgroundColor: theme.colors.canvas.primary,
      borderWidth: 0,
      ...theme.shadows.md,
    },
    bordered: {
      backgroundColor: theme.colors.canvas.primary,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
    },
    flat: {
      backgroundColor: theme.colors.canvas.tertiary,
      borderWidth: 0,
    },
  };

  return (
    <View
      style={[
        styles.card,
        variantStyles[variant],
        { padding: paddingStyles[padding] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
  },
});
