import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme/tokens';

export type PickupStep = 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'COMPLETED';

interface StatusStepperProps {
  currentStatus: PickupStep;
  style?: ViewStyle;
}

const STEPS: PickupStep[] = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED'];

export default function StatusStepper({
  currentStatus,
  style,
}: StatusStepperProps) {

  const currentStepIndex = STEPS.indexOf(currentStatus);

  const formatStepLabel = (step: PickupStep): string => {
    return step.replace('_', '\n');
  };

  return (
    <View style={[styles.container, style]}>
      {/* Progress Bar Background */}
      <View style={styles.progressBarBackground} />

      {/* Progress Bar Fill */}
      <View
        style={[
          styles.progressBarFill,
          {
            width: `${(Math.max(currentStepIndex, 0) / 3) * 100}%`,
          },
        ]}
      />

      {/* Steps */}
      {STEPS.map((step, idx) => {
        const isActive = currentStepIndex >= idx;
        const isCurrentStep = currentStepIndex === idx;

        return (
          <View key={step} style={styles.stepContainer}>
            <View
              style={[
                styles.stepCircle,
                isActive ? styles.stepCircleActive : styles.stepCircleInactive,
                isCurrentStep && styles.stepCircleCurrent,
              ]}
            >
              {isActive && (
                <Feather
                  name="check"
                  size={12}
                  color={theme.colors.canvas.primary}
                />
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                isActive ? styles.stepLabelActive : styles.stepLabelInactive,
              ]}
            >
              {formatStepLabel(step)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    paddingVertical: theme.spacing.lg,
  },
  progressBarBackground: {
    position: 'absolute',
    top: theme.spacing['2xl'],
    left: theme.spacing['3xl'],
    right: theme.spacing['3xl'],
    height: 4,
    backgroundColor: theme.colors.border.default,
    zIndex: 0,
  },
  progressBarFill: {
    position: 'absolute',
    top: theme.spacing['2xl'],
    left: theme.spacing['3xl'],
    height: 4,
    backgroundColor: theme.colors.green[600],
    zIndex: 1,
  },
  stepContainer: {
    alignItems: 'center',
    zIndex: 10,
    width: 64,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  stepCircleActive: {
    backgroundColor: theme.colors.green[600],
  },
  stepCircleInactive: {
    backgroundColor: theme.colors.border.default,
  },
  stepCircleCurrent: {
    borderWidth: 3,
    borderColor: theme.colors.green[200],
  },
  stepLabel: {
    fontSize: theme.typography.fontSize.xs.size,
    fontFamily: theme.typography.fontFamily.bold,
    textAlign: 'center',
    lineHeight: 14,
  },
  stepLabelActive: {
    color: theme.colors.green[700],
  },
  stepLabelInactive: {
    color: theme.colors.text.disabled,
  },
});
