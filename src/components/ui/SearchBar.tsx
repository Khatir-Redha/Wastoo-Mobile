import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme/tokens';

interface SearchBarProps extends TextInputProps {
  containerStyle?: ViewStyle;
}

export default function SearchBar({
  containerStyle,
  style,
  placeholder = "Search...",
  ...textInputProps
}: SearchBarProps) {

  return (
    <View style={[styles.container, theme.shadows.sm, containerStyle]}>
      <Feather
        name="search"
        size={theme.componentSizes.icon.sm}
        color={theme.colors.text.quaternary}
      />

      <TextInput
        {...textInputProps}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.quaternary}
        style={[styles.input, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: theme.componentSizes.input.md.height,
    backgroundColor: theme.colors.canvas.primary,
    borderRadius: theme.radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  input: {
    flex: 1,
    marginLeft: theme.spacing.md,
    fontSize: theme.typography.fontSize.md.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
  },
});
