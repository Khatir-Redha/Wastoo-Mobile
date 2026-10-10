import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { theme } from '../../theme/tokens';
import { haptics } from '../../utils/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  hapticFeedback?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  hapticFeedback = true,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);

  // Press animation
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!isDisabled) {
      scale.value = withSpring(0.95, {
        damping: 15,
        stiffness: 150,
      });
    }
  };

  const handlePressOut = () => {
    if (!isDisabled) {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
    }
  };

  const handlePress = () => {
    if (hapticFeedback && !isDisabled) {
      // Primary/danger buttons get medium haptic, others get light
      if (variant === 'primary' || variant === 'danger') {
        haptics.medium();
      } else {
        haptics.light();
      }
    }
    onPress();
  };

  // Size configuration
  const sizeStyles = {
    sm: {
      height: theme.componentSizes.button.sm.height,
      paddingHorizontal: theme.componentSizes.button.sm.paddingHorizontal,
      fontSize: theme.typography.fontSize.base.size,
    },
    md: {
      height: theme.componentSizes.button.md.height,
      paddingHorizontal: theme.componentSizes.button.md.paddingHorizontal,
      fontSize: theme.typography.fontSize.md.size,
    },
    lg: {
      height: theme.componentSizes.button.lg.height,
      paddingHorizontal: theme.componentSizes.button.lg.paddingHorizontal,
      fontSize: theme.typography.fontSize.lg.size,
    },
  };

  const currentSize = sizeStyles[size];

  // Variant configuration
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          useGradient: true,
          gradientColors: isDisabled
            ? theme.gradients.disabled.colors
            : theme.gradients.greenPrimary.colors,
          textColor: theme.colors.text.inverse,
          shadow: theme.shadows.md,
        };
      case 'secondary':
        return {
          useGradient: false,
          backgroundColor: isDisabled
            ? theme.colors.canvas.tertiary
            : theme.colors.canvas.primary,
          borderColor: isDisabled
            ? theme.colors.border.default
            : theme.colors.green[700],
          borderWidth: 2,
          textColor: isDisabled
            ? theme.colors.text.disabled
            : theme.colors.green[700],
          shadow: theme.shadows.sm,
        };
      case 'ghost':
        return {
          useGradient: false,
          backgroundColor: 'transparent',
          textColor: isDisabled
            ? theme.colors.text.disabled
            : theme.colors.green[700],
          shadow: undefined,
        };
      case 'danger':
        return {
          useGradient: false,
          backgroundColor: isDisabled
            ? theme.colors.canvas.tertiary
            : theme.colors.error,
          textColor: theme.colors.text.inverse,
          shadow: theme.shadows.md,
        };
      default:
        return {
          useGradient: true,
          gradientColors: theme.gradients.greenPrimary.colors,
          textColor: theme.colors.text.inverse,
          shadow: theme.shadows.md,
        };
    }
  };

  const variantStyles = getVariantStyles();

  const baseButtonStyle: ViewStyle = {
    height: currentSize.height,
    paddingHorizontal: currentSize.paddingHorizontal,
    borderRadius: theme.radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: fullWidth ? '100%' : undefined,
    ...(variantStyles.backgroundColor && {
      backgroundColor: variantStyles.backgroundColor
    }),
    ...(variantStyles.borderColor && {
      borderColor: variantStyles.borderColor,
      borderWidth: variantStyles.borderWidth || 1,
    }),
  };

  const textStyleObj: TextStyle = {
    color: variantStyles.textColor,
    fontSize: currentSize.fontSize,
    fontFamily: theme.typography.fontFamily.bold,
    ...(icon && iconPosition === 'left' && { marginLeft: theme.spacing.sm }),
    ...(icon && iconPosition === 'right' && { marginRight: theme.spacing.sm }),
  };

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles.textColor}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text style={[textStyleObj, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </>
      )}
    </>
  );

  if (variantStyles.useGradient) {
    return (
      <AnimatedTouchable
        activeOpacity={1}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[
          styles.container,
          fullWidth && styles.fullWidth,
          variantStyles.shadow,
          animatedStyle,
          style,
        ]}
      >
        <LinearGradient
          colors={variantStyles.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[baseButtonStyle, styles.gradient]}
        >
          {renderContent()}
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  return (
    <AnimatedTouchable
      activeOpacity={1}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        baseButtonStyle,
        variantStyles.shadow,
        fullWidth && styles.fullWidth,
        animatedStyle,
        style,
      ]}
    >
      {renderContent()}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    width: '100%',
  },
  iconLeft: {
    marginRight: theme.spacing.sm,
  },
  iconRight: {
    marginLeft: theme.spacing.sm,
  },
});
