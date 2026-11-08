import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme/tokens';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

const ICONS: Record<ToastType, string> = {
  success: 'check-circle-outline',
  error: 'close-circle-outline',
  info: 'information-outline',
  warning: 'alert-outline',
};

const BG_COLORS: Record<ToastType, string> = {
  success: theme.colors.success,
  error: theme.colors.error,
  info: theme.colors.info,
  warning: theme.colors.warning,
};

const ICON_COLORS: Record<ToastType, string> = {
  success: '#FFFFFF',
  error: '#FFFFFF',
  info: '#FFFFFF',
  warning: '#FFFFFF',
};

export default function Toast({
  visible,
  message,
  type = 'info',
  duration = 4000,
  onClose,
  action,
}: ToastProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        hide();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, fadeAnim, slideAnim, duration]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -100, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      onClose?.();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        { backgroundColor: BG_COLORS[type] },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.content}>
        <MaterialCommunityIcons
          name={ICONS[type] as any}
          size={22}
          color={ICON_COLORS[type]}
          style={styles.icon}
        />
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
        {action && (
          <Pressable onPress={() => { action.onPress(); hide(); }} style={styles.action}>
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        )}
      </View>
      <Pressable onPress={hide} style={styles.closeButton} hitSlop={10}>
        <MaterialCommunityIcons name="close" size={20} color={ICON_COLORS[type]} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 56,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  icon: {
    flexShrink: 0,
  },
  message: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 20,
  },
  action: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionText: {
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number, action?: { label: string; onPress: () => void }) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Array<{ id: string; message: string; type: ToastType; duration: number; action?: { label: string; onPress: () => void } }>>([]);

  const showToast = React.useCallback(
    (message: string, type: ToastType = 'info', duration = 4000, action?: { label: string; onPress: () => void }) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { id, message, type, duration, action }]);
    },
    [],
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={containerStyles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            visible={true}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
            action={toast.action}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const containerStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 50,
    pointerEvents: 'none',
  },
});