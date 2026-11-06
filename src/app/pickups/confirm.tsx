import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import PickupService, { Pickup, PickupStatus } from '../../../services/pickup.service';
import PostService, { Post } from '../../../services/post.service';
import api from '../../../lib/api';
import { theme } from '../../theme/tokens';

export default function ConfirmPickupScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [weight, setWeight] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/pickup');
        const foundPickup = res.data.find((p: Pickup) => p.id.toString() === id);
        if (foundPickup) {
          setPickup(foundPickup);
          const postData = await PostService.getPostById(foundPickup.post_id);
          setPost(postData);
          // Pre-fill with requested quantity if available
          if (foundPickup.request?.requested_quantity) {
            setWeight(foundPickup.request.requested_quantity.toString());
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const handleComplete = async () => {
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Error', 'Please enter a valid collected weight.');
      return;
    }
    if (!confirmed) {
      Alert.alert('Error', 'Please check the confirmation box.');
      return;
    }

    // Verify weight doesn't exceed requested quantity
    if (pickup?.request?.requested_quantity && weightNum > pickup.request.requested_quantity) {
      Alert.alert('Error', `Collected weight (${weightNum}) cannot exceed requested quantity (${pickup.request.requested_quantity}).`);
      return;
    }

    setActionLoading(true);
    try {
      await PickupService.updatePickup(Number(id), {
        status: PickupStatus.COMPLETED,
        collected_weight: weightNum,
      } as any);

      Alert.alert('Success', 'Pickup Completed Successfully', [
        { text: 'Return to Dashboard', onPress: () => router.push('/pickups') }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to complete pickup');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.emerald[500]} />
      </KeyboardAvoidingView>
    );
  }

  if (!pickup) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#E74C3C" />
        <Text style={styles.errorTitle}>Pickup Not Found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  const requestedQty = pickup.request?.requested_quantity || 0;
  const unit = post?.category && ['ORGANIC', 'HAZARDOUS'].includes(post.category) ? 'L' : 'kg';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="x" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Pickup</Text>
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <Text style={styles.introText}>
          You're about to mark this pickup as completed. Please enter the final collected weight for our records.
        </Text>

        <Text style={styles.label}>Collected Weight ({unit}) <Text style={styles.required}>*</Text></Text>
        <View style={styles.inputWrapper}>
          <MaterialCommunityIcons name="scale" size={20} color={theme.colors.emerald[500]} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="0.0"
            placeholderTextColor={theme.colors.text.quaternary}
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
          <Text style={styles.unitText}>{unit}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setConfirmed(!confirmed)}
          style={styles.confirmWrapper}
        >
          <View style={[
            styles.confirmCheckbox,
            confirmed && styles.confirmCheckboxChecked
          ]}>
            {confirmed && <Feather name="check" size={16} color="white" />}
          </View>
          <Text style={styles.confirmText}>
            I confirm the waste has been collected and the weight entered is accurate.
          </Text>
        </TouchableOpacity>

        {pickup.request && (
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="package-variant" size={18} color={theme.colors.text.tertiary} />
              <Text style={styles.infoText}>
                Requested: {requestedQty} {unit}
              </Text>
            </View>
            {post?.quantity && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="scale" size={18} color={theme.colors.text.tertiary} />
                <Text style={styles.infoText}>
                  Post total: {post.quantity} {unit}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleComplete}
          disabled={actionLoading}
          style={[
            styles.completeButton,
            actionLoading && styles.buttonDisabled,
          ]}
        >
          {actionLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.completeButtonText}>Complete Pickup</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.canvas.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: theme.colors.canvas.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    marginTop: 16,
    color: theme.colors.forest[500],
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.emerald[500],
    borderRadius: theme.radius.full,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.canvas.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.default,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100,
  },
  introText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: theme.typography.fontFamily.regular,
  },
  label: {
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  required: {
    color: theme.colors.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas.tertiary,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.xl,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  unitText: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.tertiary,
    marginRight: 4,
  },
  confirmWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.canvas.tertiary,
    padding: 16,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    marginBottom: 24,
  },
  confirmCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.border.default,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
    flexShrink: 0,
  },
  confirmCheckboxChecked: {
    backgroundColor: theme.colors.emerald[500],
    borderColor: theme.colors.emerald[500],
  },
  confirmText: {
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
    lineHeight: 22,
  },
  infoBox: {
    padding: 16,
    backgroundColor: theme.colors.emerald[50],
    borderWidth: 1,
    borderColor: theme.colors.emerald[200],
    borderRadius: theme.radius.md,
    marginBottom: 24,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    backgroundColor: theme.colors.canvas.primary,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  completeButton: {
    height: 56,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.emerald[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.emerald[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: theme.typography.fontFamily.bold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});