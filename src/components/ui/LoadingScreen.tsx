import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme/tokens';

interface LoadingScreenProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
}

/**
 * Full-screen loading component
 * Use for blocking screens while data loads
 */
export function LoadingScreen({ size = 'large', color = theme.colors.emerald[500], message }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}
    </View>
  );
}

/**
 * Inline loading indicator
 * Use for small in-place loading (buttons, sections, etc.)
 */
export function InlineLoader({ size = 'small', color = theme.colors.emerald[500] }: LoadingScreenProps) {
  return (
    <ActivityIndicator size={size} color={color} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md.size,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.medium,
  },
});

export default LoadingScreen;