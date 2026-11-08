import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  BackHandler,
  Platform,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme/tokens';

export interface ConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
  variant?: 'default' | 'destructive';
  icon?: string;
}

export default function ConfirmSheet({
  visible,
  onClose,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  variant = 'default',
  icon = 'alert-circle-outline',
}: ConfirmSheetProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(100)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onClose) onClose();
      });
    }
  }, [visible, fadeAnim, slideAnim, onClose]);

  // Handle hardware back button on Android
  React.useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!loading) {
        onCancel?.();
      }
      return true;
    });
    return () => subscription.remove();
  }, [visible, loading, onCancel]);

  if (!visible) return null;

  const confirmColor = variant === 'destructive' ? theme.colors.error : theme.colors.emerald[500];
  const confirmTextColor = '#FFFFFF';
  const iconColor = variant === 'destructive' ? theme.colors.error : theme.colors.emerald[500];

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: fadeAnim },
        { pointerEvents: visible ? 'auto' : 'none' },
      ]}
    >
      <Pressable onPress={() => !loading && onCancel?.()} style={styles.backdrop} />
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name={icon as any} size={48} color={iconColor} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.buttonRow}>
          <Pressable
            onPress={() => !loading && onCancel?.()}
            disabled={loading}
            style={[
              styles.cancelButton,
              loading && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={cancelText}
          >
            <Text style={[styles.cancelButtonText, loading && styles.buttonDisabledText]}>{cancelText}</Text>
          </Pressable>
          <Pressable
            onPress={() => !loading && onConfirm()}
            disabled={loading}
            style={[
              styles.confirmButton,
              { backgroundColor: confirmColor },
              loading && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={confirmText}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <View style={[styles.spinner, { borderTopColor: confirmTextColor }]} />
                <Text style={[styles.confirmButtonText, styles.buttonDisabledText]}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 34, 29, 0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: Math.max(24, 0),
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8E2DD',
    marginBottom: 16,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonDisabledText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: '#FFFFFF',
  },
});