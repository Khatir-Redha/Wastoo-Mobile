import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView,
  StyleSheet
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import PickupService from '../../../../services/pickup.service';
import ScreenHeader from '../../../components/collector/ScreenHeader';
import { theme } from '../../../theme/tokens';
import Toast from '../../../components/ui/Toast';

export default function PickupConfirmScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [weight, setWeight] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleReport = async () => {
    const weightNum = parseFloat(weight);

    if (!weight.trim() || isNaN(weightNum) || weightNum < 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid collected weight (0 or greater).');
      return;
    }
    if (!confirmed) {
      Alert.alert('Confirmation Required', 'Please check the confirmation box to proceed.');
      return;
    }

    setLoading(true);
    try {
      // Report collected quantity - moves to COLLECTED_PENDING_VERIFICATION
      await PickupService.reportCollection(Number(id), weightNum);

      showToast('Collection reported, awaiting verification');

      // Navigate back to pickups list
      setTimeout(() => router.replace('/collector' as any), 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to report collection';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Report Collected Quantity" showBell={true} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Icon + intro */}
        <View style={styles.introSection}>
          <View style={styles.introIcon}>
            <Feather name="check-square" size={36} color={theme.colors.warning[500]} />
          </View>
          <Text style={styles.introTitle}>Report Collected Quantity</Text>
          <Text style={styles.introDesc}>
            Enter the actual weight of waste collected. This will be sent to the supplier for verification.
          </Text>
        </View>

        {/* Weight input */}
        <Text style={styles.inputLabel}>
          Collected Weight (kg) <Text style={styles.requiredMarker}>*</Text>
        </Text>
        <View style={styles.weightInputContainer}>
          <Feather name="layers" size={20} color={theme.colors.warning[500]} />
          <TextInput
            style={styles.weightInput}
            placeholder="0.0"
            placeholderTextColor={theme.colors.text.tertiary}
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
          <Text style={styles.unitText}>kg</Text>
        </View>

        {/* Confirmation checkbox */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setConfirmed(!confirmed)}
          style={[
            styles.checkboxContainer,
            confirmed && styles.checkboxConfirmed
          ]}
        >
          <View style={[
            styles.checkbox,
            confirmed && styles.checkboxChecked
          ]}>
            {confirmed && <Feather name="check" size={14} color="white" />}
          </View>
          <Text style={[
            styles.checkboxLabel,
            confirmed && styles.checkboxLabelConfirmed
          ]}>
            I confirm the waste has been collected and the weight entered is accurate.
          </Text>
        </TouchableOpacity>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Feather name="alert-triangle" size={18} color={theme.colors.warning[500]} />
          <Text style={styles.disclaimerText}>
            The supplier will verify this quantity. If they reject it, you'll need to re-collect.
          </Text>
        </View>
      </ScrollView>

      {/* Footer button */}
      <View style={styles.buttonSection}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleReport}
          disabled={loading}
          style={[
            styles.completeButton,
            loading && styles.completeButtonLoading,
            {
              shadowColor: theme.colors.warning[500],
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }
          ]}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <>
                <Feather name="send" size={20} color="white" />
                <Text style={styles.completeButtonText}>Report & Send for Verification</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {toast && <Toast visible={true} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.canvas.secondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  introIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  introTitle: {
    fontSize: theme.typography.fontSize['2xl'].size,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  introDesc: {
    fontSize: theme.typography.fontSize.base.size,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  requiredMarker: {
    color: theme.colors.error[500],
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md,
    height: 56,
    marginBottom: theme.spacing.xl,
  },
  weightInput: {
    flex: 1,
    fontSize: 22,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    paddingVertical: 0,
    marginLeft: theme.spacing.sm,
  },
  unitText: {
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.sm,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.canvas.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.xl,
    marginBottom: theme.spacing.xl,
  },
  checkboxConfirmed: {
    backgroundColor: '#FFF4E6',
    borderColor: '#F59E0B',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0.5,
    marginRight: theme.spacing.md,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.canvas.primary,
  },
  checkboxChecked: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  checkboxLabelConfirmed: {
    color: '#E67E22',
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing['2xl'],
    gap: 10,
  },
  disclaimerText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm.size,
    fontFamily: theme.typography.fontFamily.regular,
    color: '#92400E',
    lineHeight: 20,
  },
  buttonSection: {
    padding: theme.spacing.xl,
    paddingBottom: 24,
    backgroundColor: theme.colors.canvas.primary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.default,
  },
  completeButton: {
    height: 56,
    backgroundColor: '#F59E0B',
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeButtonLoading: {
    backgroundColor: theme.colors.text.tertiary,
  },
  completeButtonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.base.size,
    fontFamily: theme.typography.fontFamily.bold,
  },
});