import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Feather.glyphMap;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightIconPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  containerStyle?: ViewStyle;
}

export default function Input({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  size = 'md',
  containerStyle,
  style,
  ...textInputProps
}: InputProps) {

  const [isFocused, setIsFocused] = useState(false);

  const sizeStyles = {
    sm: theme.componentSizes.input.sm.height,
    md: theme.componentSizes.input.md.height,
    lg: theme.componentSizes.input.lg.height,
  };

  const inputHeight = sizeStyles[size];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}

      <View
        style={[
          styles.inputContainer,
          { height: inputHeight },
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
        ]}
      >
        {icon && (
          <Feather
            name={icon}
            size={theme.componentSizes.icon.sm}
            color={error ? theme.colors.error : theme.colors.text.tertiary}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          {...textInputProps}
          style={[
            styles.input,
            icon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            style,
          ]}
          placeholderTextColor={theme.colors.text.disabled}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIconContainer}
            disabled={!onRightIconPress}
          >
            <Feather
              name={rightIcon}
              size={theme.componentSizes.icon.sm}
              color={theme.colors.text.tertiary}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.green[700],
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas.tertiary,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  inputContainerFocused: {
    borderColor: theme.colors.green[600],
    backgroundColor: theme.colors.canvas.primary,
  },
  inputContainerError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.canvas.primary,
  },
  leftIcon: {
    marginRight: theme.spacing.md,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
  },
  inputWithLeftIcon: {
    marginLeft: 0,
  },
  inputWithRightIcon: {
    marginRight: 0,
  },
  rightIconContainer: {
    marginLeft: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
});
