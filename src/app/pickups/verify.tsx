import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, SafeAreaView, StyleSheet, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import PickupService, { Pickup, PickupStatus } from '../../../services/pickup.service';
import PostService, { Post } from '../../../services/post.service';
import { theme } from '../../theme/tokens';
import ScreenHeader from '../../components/collector/ScreenHeader';
import Toast from '../../components/ui/Toast';
import ConfirmSheet from '../../components/ui/ConfirmSheet';

export default function VerifyPickupScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<'verify' | 'reject' | null>(null);
  const [rejectionWeight, setRejectionWeight] = useState('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleConfirmAction = async () => {
    if (!pickup) return;
    setActionLoading(true);
    try {
      if (pendingAction === 'verify') {
        await PickupService.verifyCollection(pickup.id, true);
        showToast('Collection verified successfully');
        setPickup(prev => prev ? { ...prev, status: PickupStatus.COMPLETED } : prev);
      } else if (pendingAction === 'reject') {
        const weightNum = parseFloat(rejectionWeight);
        if (isNaN(weightNum) || weightNum < 0) {
          Alert.alert('Invalid Weight', 'Please enter a valid collected weight (0 or greater).');
          setActionLoading(false);
          return;
        }
        await PickupService.verifyCollection(pickup.id, false, weightNum);
        showToast('Collection rejected, pickup returned to In Transit');
        setPickup(prev => prev ? { ...prev, status: PickupStatus.IN_TRANSIT } : prev);
      }
      setConfirmVisible(false);
      setPendingAction(null);
      setRejectionWeight('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to process action';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = () => {
    if (!pickup) return;
    setPendingAction('verify');
    setConfirmVisible(true);
  };

  const handleReject = () => {
    if (!pickup) return;
    setPendingAction('reject');
    setConfirmVisible(true);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const all: Pickup[] = await PickupService.getAllPickups();
        const found = all.find(p => p.id.toString() === id?.toString());
        if (found) {
          setPickup(found);
          const postData = await PostService.getPostById(found.post_id);
          setPost(postData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.emerald[500]} />
      </View>
    );
  }

  if (!pickup) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title="Pickup not found" showBell={false} />
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="truck-alert-outline" size={56} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyTitle}>Pickup not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = {
    PENDING: { bg: '#FFF8E1', text: '#F59E0B', label: 'Pending' },
    ASSIGNED: { bg: '#EFF6FF', text: '#3B82F6', label: 'Assigned' },
    IN_TRANSIT: { bg: '#F5F3FF', text: '#8B5CF6', label: 'In Transit' },
    COLLECTED_PENDING_VERIFICATION: { bg: '#FFF4E6', text: '#E67E22', label: 'Awaiting Verification' },
    COMPLETED: { bg: '#E8F8EE', text: '#1E5631', label: 'Completed' },
    CANCELED: { bg: '#FEF2F2', text: '#EF4444', label: 'Cancelled' },
    REQUESTED: { bg: '#E8F8EE', text: '#1E5631', label: 'Requested' },
  }[pickup.status] || { bg: '#F4F4F4', text: '#6D7A6E', label: pickup.status };

  const imageUrl = post?.images?.[0]?.url?.trim()
    ? post.images[0].url.replace('http://', 'https://')
    : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80';

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={post?.title || `Pickup #${pickup.id}`} showBell={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Status Card ── */}
        <View style={[styles.statusCard, styles.sectionCard]}>
          <View style={styles.statusBadge}>
            <Text style={{
              color: statusStyle.text,
              fontSize: 14,
              fontFamily: theme.typography.fontFamily.bold,
            }}>
              {statusStyle.label}
            </Text>
          </View>
          <Text style={styles.statusDescription}>
            {pickup.status === PickupStatus.COLLECTED_PENDING_VERIFICATION &&
              'The collector has reported the collected quantity. Please verify or reject the amount.'}
            {pickup.status === PickupStatus.COMPLETED &&
              'This pickup has been verified and completed.'}
            {pickup.status === PickupStatus.IN_TRANSIT &&
              'This pickup was rejected and is back with the collector.'}
          </Text>
        </View>

        {/* ── Post / Waste Info ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>WASTE DETAILS</Text>
          {post ? (
            <View style={styles.postRow}>
              <Image source={{ uri: imageUrl }} style={styles.postImage} resizeMode="cover" />
              <View style={styles.postInfo}>
                <Text style={styles.postTitle} numberOfLines={2}>
                  {post.title || 'Untitled Post'}
                </Text>
                <Text style={styles.postCategory}>
                  {post.category}  •  {post.quantity || 'N/A'} kg
                </Text>
                {post.address && (
                  <View style={styles.addressRow}>
                    <Feather name="map-pin" size={13} color="#8A8F87" />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {post.address}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.postNotFound}>Unknown Post</Text>
          )}

          {post?.description && (
            <Text style={styles.postDescription}>{post.description}</Text>
          )}
        </View>

        {/* ── Agreed & Reported Quantity ── */}
        {pickup.request && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>QUANTITY</Text>
            <View style={styles.quantityRow}>
              <MaterialCommunityIcons name="weight-kilogram" size={24} color={theme.colors.emerald[600]} />
              <View style={styles.quantityInfo}>
                <Text style={styles.quantityLabel}>Agreed Quantity</Text>
                <Text style={styles.quantityValue}>{pickup.request.requested_quantity} kg</Text>
              </View>
              {pickup.collected_weight !== null && pickup.collected_weight !== undefined && (
                <View style={styles.quantityInfo}>
                  <Text style={styles.quantityLabel}>Reported by Collector</Text>
                  <Text style={styles.quantityValue}>{pickup.collected_weight} kg</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Schedule ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>SCHEDULE</Text>
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleIcon}>
              <Feather name="calendar" size={16} color="#1E5631" />
            </View>
            <View>
              <Text style={styles.scheduleLabel}>Date</Text>
              <Text style={styles.scheduleValue}>
                {pickup.scheduled_date
                  ? new Date(pickup.scheduled_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : 'ASAP'}
              </Text>
            </View>
          </View>
          {pickup.start_time && (
            <View style={styles.scheduleRow}>
              <View style={styles.scheduleIcon}>
                <Feather name="clock" size={16} color="#1E5631" />
              </View>
              <View>
                <Text style={styles.scheduleLabel}>Time Window</Text>
                <Text style={styles.scheduleValue}>
                  {pickup.start_time} – {pickup.end_time}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Collector Contact & Access ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>COLLECTOR CONTACT</Text>
          <View style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <Feather name="phone" size={16} color="#1E5631" />
            </View>
            <View>
              <Text style={styles.contactLabel}>Contact Number</Text>
              <Text style={styles.contactValue}>
                {pickup.contact_number || 'Not provided'}
              </Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <Feather name="key" size={16} color="#1E5631" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Access Notes</Text>
              <Text style={styles.contactValue}>
                {pickup.access_notes || 'No access notes provided.'}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* ── Actions (supplier-specific) ── */}
      <View style={styles.actionSection}>
        {pickup.status === PickupStatus.COLLECTED_PENDING_VERIFICATION && (
          <>
            <TouchableOpacity
              onPress={handleReject}
              style={styles.rejectButton}
            >
              <MaterialCommunityIcons name="close-circle-outline" size={22} color="white" />
              <Text style={styles.actionButtonText}>Reject & Request Re-collection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleVerify}
              style={styles.verifyButton}
            >
              <Feather name="check-circle" size={22} color="white" />
              <Text style={styles.actionButtonText}>Verify & Complete</Text>
            </TouchableOpacity>
          </>
        )}

        {pickup.status === PickupStatus.COMPLETED && (
          <View style={styles.completedContainer}>
            <Feather name="check-circle" size={20} color="#1E5631" />
            <Text style={styles.completedText}>Pickup verified and completed</Text>
          </View>
        )}

        {pickup.status === PickupStatus.IN_TRANSIT && (
          <View style={styles.rejectedContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={theme.colors.warning[500]} />
            <Text style={styles.rejectedText}>
              Collection was rejected. Collector needs to re-collect and report again.
            </Text>
          </View>
        )}

      </View>

      {toast && <Toast visible={true} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmSheet
        visible={confirmVisible}
        onClose={() => { setConfirmVisible(false); setPendingAction(null); setRejectionWeight(''); }}
        title={pendingAction === 'verify' ? 'Verify Collection' : 'Reject Collection'}
        message={
          pendingAction === 'verify'
            ? `Confirm the collected weight of ${pickup.collected_weight} kg and complete this pickup?`
            : 'Reject the reported quantity. The pickup will return to In Transit for the collector to re-collect. Enter the correct collected weight in the field below:'
        }
        confirmText={pendingAction === 'verify' ? 'Yes, Verify' : 'Yes, Reject'}
        cancelText="Cancel"
        onConfirm={handleConfirmAction}
        onCancel={() => { setConfirmVisible(false); setPendingAction(null); setRejectionWeight(''); }}
        loading={actionLoading}
        variant={pendingAction === 'verify' ? 'default' : 'destructive'}
        icon={pendingAction === 'verify' ? 'check-circle-outline' : 'alert-circle-outline'}
      />
      {pendingAction === 'reject' && confirmVisible && (
        <View style={styles.rejectionInputContainer}>
          <Text style={styles.rejectionInputLabel}>Correct Weight (kg) <Text style={styles.requiredMarker}>*</Text></Text>
          <View style={styles.rejectionInputWrapper}>
            <MaterialCommunityIcons name="scale" size={20} color={theme.colors.warning[500]} style={styles.rejectionInputIcon} />
            <TextInput
              style={styles.rejectionInput}
              placeholder="0.0"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="decimal-pad"
              value={rejectionWeight}
              onChangeText={setRejectionWeight}
            />
            <Text style={styles.unitText}>kg</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.canvas.secondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.canvas.secondary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 220,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#1E5631',
    letterSpacing: 1,
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#FFF4E6',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  postRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  postImage: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.canvas.tertiary,
    marginRight: 16,
  },
  postInfo: {
    flex: 1,
  },
  postTitle: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  postCategory: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  addressText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  postNotFound: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  postDescription: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    lineHeight: 20,
    marginTop: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityInfo: {
    flex: 1,
  },
  quantityLabel: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.tertiary,
  },
  quantityValue: {
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  scheduleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F8EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scheduleLabel: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  scheduleValue: {
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F8EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 0.5,
  },
  contactLabel: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  contactValue: {
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginTop: 16,
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
  actionSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.canvas.primary,
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.default,
  },
  verifyButton: {
    height: 56,
    backgroundColor: theme.colors.emerald[500],
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rejectButton: {
    height: 56,
    backgroundColor: '#EF4444',
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: theme.typography.fontFamily.bold,
  },
  completedContainer: {
    height: 56,
    backgroundColor: '#E8F8EE',
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.default,
    marginBottom: 8,
  },
  completedText: {
    color: '#1E5631',
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  rejectedContainer: {
    height: 56,
    backgroundColor: '#FFF8E1',
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  rejectedText: {
    color: '#E67E22',
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
    textAlign: 'center',
  },
  rejectionInputContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  rejectionInputLabel: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  requiredMarker: {
    color: theme.colors.error[500],
  },
  rejectionInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md,
    height: 56,
  },
  rejectionInputIcon: {
    marginRight: theme.spacing.sm,
  },
  rejectionInput: {
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
});