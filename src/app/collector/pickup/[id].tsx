import React, { useEffect, useState } from 'react';
import {
  View, Text, ActivityIndicator, TouchableOpacity, Alert,
  ScrollView, SafeAreaView, Platform, StyleSheet
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import PickupService, { Pickup, PickupStatus } from '../../../../services/pickup.service';
import PostService, { Post } from '../../../../services/post.service';
import { theme } from '../../../theme/tokens';
import ScreenHeader from '../../../components/collector/ScreenHeader';
import Toast from '../../../components/ui/Toast';
import ConfirmSheet from '../../../components/ui/ConfirmSheet';

// Timeline steps - updated with new statuses
const TIMELINE = [
  { key: 'PENDING',    label: 'Requested' },
  { key: 'ASSIGNED',  label: 'Assigned' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'COLLECTED_PENDING_VERIFICATION', label: 'Awaiting Verification' },
  { key: 'COMPLETED', label: 'Completed' },
];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'PENDING':    return { bg: '#FFF8E1', text: '#F59E0B', label: 'Pending' };
    case 'ASSIGNED':   return { bg: '#EFF6FF', text: '#3B82F6', label: 'Assigned' };
    case 'IN_TRANSIT': return { bg: '#F5F3FF', text: '#8B5CF6', label: 'In Transit' };
    case 'COLLECTED_PENDING_VERIFICATION': return { bg: '#FFF4E6', text: '#E67E22', label: 'Awaiting Verification' };
    case 'COMPLETED':  return { bg: '#E8F8EE', text: '#1E5631', label: 'Completed' };
    case 'CANCELED':   return { bg: '#FEF2F2', text: '#EF4444', label: 'Cancelled' };
    case 'REQUESTED':  return { bg: '#E8F8EE', text: '#1E5631', label: 'Requested' };
    default:           return { bg: '#F4F4F4', text: '#6D7A6E', label: status };
  }
};

const formatStatus = (s: string) => s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function CollectorPickupDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<'cancel' | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleConfirmCancel = () => {
    if (pendingAction === 'cancel') {
      doCancelPickup();
    }
    setConfirmVisible(false);
    setPendingAction(null);
  };

  const doCancelPickup = async () => {
    if (!pickup) return;
    setActionLoading(true);
    try {
      await PickupService.cancelPickup(pickup.id);
      showToast('Pickup cancelled');
      setPickup(prev => prev ? { ...prev, status: PickupStatus.CANCELED } : prev);
      // Navigate back after a moment
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to cancel pickup';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch all pickups and find by id (no single-pickup endpoint)
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

  const handleStartTransit = async () => {
    if (!pickup) return;
    setActionLoading(true);
    try {
      await PickupService.startTransit(pickup.id);
      showToast('Pickup started');
      setPickup(prev => prev ? { ...prev, status: PickupStatus.IN_TRANSIT } : prev);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to start transit';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportCollection = () => {
    if (!pickup) return;
    router.push(`/collector/pickup/confirm?id=${pickup.id}`);
  };

  const handleCancel = () => {
    if (!pickup) return;
    setPendingAction('cancel');
    setConfirmVisible(true);
  };

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

  const statusStyle = getStatusStyle(pickup.status);
  const currentStep = TIMELINE.findIndex(s => s.key === pickup.status);
  const progressRatio = Math.max(currentStep, 0) / (TIMELINE.length - 1);

  const imageUrl = post?.images?.[0]?.url?.trim()
    ? post.images[0].url.replace('http://', 'https://')
    : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80';

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={post?.title || `Pickup #${pickup.id}`} showBell={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Timeline ── */}
        {pickup.status !== PickupStatus.CANCELED && pickup.status !== PickupStatus.COMPLETED && (
          <View style={styles.timelineSection}>
            <Text style={styles.timelineLabel}>PROGRESS</Text>
            <View style={styles.timelineTrack}>
              <View style={styles.track} />
              <View
                style={{
                  position: 'absolute',
                  top: 3,
                  left: 4,
                  right: 4,
                  height: 1,
                  backgroundColor: '#2ECC71',
                  borderRadius: 2,
                  width: `${progressRatio * 92}%`,
                }}
              />
              {TIMELINE.map((step, idx) => {
                const done = currentStep >= idx;
                return (
                  <View key={step.key} style={styles.timelineStep}>
                    <View style={[
                      styles.stepCircle,
                      done ? styles.stepCircleActive : styles.stepCircleInactive
                    ]}>
                      {done && <Feather name="check" size={12} color="white" />}
                    </View>
                    <Text style={[
                      styles.stepLabel,
                      done ? styles.stepLabelActive : styles.stepLabelInactive
                    ]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {pickup.status === PickupStatus.CANCELED && (
          <View style={[styles.canceledSection, styles.sectionCard]}>
            <Feather name="x-circle" size={22} color="#EF4444" />
            <Text style={styles.canceledText}>This pickup was cancelled.</Text>
          </View>
        )}

        {pickup.status === PickupStatus.COMPLETED && (
          <View style={[styles.completedSection, styles.sectionCard]}>
            <Feather name="check-circle" size={22} color="#1E5631" />
            <Text style={styles.completedText}>Pickup completed successfully</Text>
          </View>
        )}

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

        {/* ── Agreed Quantity ── */}
        {pickup.request && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>AGREED QUANTITY</Text>
            <View style={styles.quantityRow}>
              <MaterialCommunityIcons name="weight-kilogram" size={24} color={theme.colors.emerald[600]} />
              <View style={styles.quantityInfo}>
                <Text style={styles.quantityLabel}>Agreed Quantity</Text>
                <Text style={styles.quantityValue}>{pickup.request.requested_quantity} kg</Text>
              </View>
              {pickup.collected_weight !== null && pickup.collected_weight !== undefined && (
                <View style={styles.quantityInfo}>
                  <Text style={styles.quantityLabel}>Reported</Text>
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

        {/* ── Citizen Contact & Access ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>CITIZEN CONTACT</Text>
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

      {/* ── Actions (collector-specific) ── */}
      <View style={styles.actionSection}>
        {pickup.status === PickupStatus.ASSIGNED && (
          <TouchableOpacity
            onPress={handleStartTransit}
            disabled={actionLoading}
            style={[
              styles.actionButton,
              actionLoading && styles.actionButtonInactive
            ]}
          >
            {actionLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name="truck-fast-outline" size={22} color="white" />
                <Text style={styles.actionButtonText}>Start Pickup</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {pickup.status === PickupStatus.IN_TRANSIT && (
          <TouchableOpacity
            onPress={handleReportCollection}
            style={styles.actionButtonCompleted}
          >
            <Feather name="check-square" size={22} color="white" />
            <Text style={styles.actionButtonText}>Report Quantity</Text>
          </TouchableOpacity>
        )}

        {pickup.status === PickupStatus.COLLECTED_PENDING_VERIFICATION && (
          <View style={styles.waitingContainer}>
            <MaterialCommunityIcons name="clock-alert-outline" size={20} color={theme.colors.warning[500]} />
            <Text style={styles.waitingText}>Waiting for supplier verification</Text>
          </View>
        )}

        {pickup.status === PickupStatus.COMPLETED && (
          <View style={styles.actionButtonReceipt}>
            <Feather name="file-text" size={22} color="#1E5631" />
            <Text style={styles.receiptText}>View Receipt</Text>
          </View>
        )}

        {(pickup.status === PickupStatus.PENDING || pickup.status === PickupStatus.REQUESTED) && (
          <View style={styles.actionButtonDisabled}>
            <Text style={styles.disabledActionText}>
              Request pending - await assignment
            </Text>
          </View>
        )}

        {pickup.status === PickupStatus.CANCELED && (
          <View style={styles.actionButtonDisabled}>
            <Text style={styles.disabledActionText}>
              Pickup was cancelled
            </Text>
          </View>
        )}

        {/* Cancel button for active pickups */}
        {(pickup.status === PickupStatus.ASSIGNED ||
          pickup.status === PickupStatus.IN_TRANSIT ||
          pickup.status === PickupStatus.COLLECTED_PENDING_VERIFICATION) && (
          <TouchableOpacity
            onPress={handleCancel}
            disabled={actionLoading}
            style={styles.cancelButton}
          >
            <MaterialCommunityIcons name="cancel" size={20} color={theme.colors.error} />
            <Text style={styles.cancelButtonText}>Cancel Pickup</Text>
          </TouchableOpacity>
        )}
      </View>

      {toast && <Toast visible={true} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmSheet
        visible={confirmVisible}
        onClose={() => { setConfirmVisible(false); setPendingAction(null); }}
        title="Cancel Pickup"
        message="Are you sure you want to cancel this pickup? The reserved quantity will be released and the supplier can accept other requests."
        confirmText="Yes, Cancel"
        cancelText="No, Keep It"
        onConfirm={handleConfirmCancel}
        onCancel={() => { setConfirmVisible(false); setPendingAction(null); }}
        loading={actionLoading}
        variant="destructive"
        icon="alert-circle-outline"
      />
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
    paddingBottom: 200,
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
  timelineSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  timelineLabel: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#1E5631',
    letterSpacing: 1,
    marginBottom: 12,
  },
  timelineTrack: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  track: {
    position: 'absolute',
    top: 3,
    left: 4,
    right: 4,
    height: 1,
    backgroundColor: '#EAEAEA',
    borderRadius: 2,
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.emerald[500],
  },
  stepCircleActive: {
    backgroundColor: theme.colors.emerald[500],
  },
  stepCircleInactive: {
    backgroundColor: '#EAEAEA',
  },
  stepLabel: {
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.bold,
    textAlign: 'center',
    marginTop: 4,
  },
  stepLabelActive: {
    color: '#1E5631',
  },
  stepLabelInactive: {
    color: '#B0B0B0',
  },
  canceledSection: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: theme.radius.xl,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  canceledText: {
    color: '#C0392B',
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 15,
    flex: 1,
  },
  completedSection: {
    backgroundColor: '#E8F8EE',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: theme.radius.xl,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  completedText: {
    color: '#1E5631',
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 15,
    flex: 1,
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
  actionButton: {
    height: 56,
    backgroundColor: theme.colors.emerald[500],
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonCompleted: {
    height: 56,
    backgroundColor: '#F59E0B',
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonReceipt: {
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
  actionButtonDisabled: {
    backgroundColor: theme.colors.text.tertiary,
    height: 56,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingContainer: {
    height: 56,
    backgroundColor: '#FFF4E6',
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waitingText: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: '#E67E22',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: theme.typography.fontFamily.bold,
  },
  receiptText: {
    color: '#1E5631',
    fontSize: 17,
    fontFamily: theme.typography.fontFamily.bold,
  },
  actionButtonInactive: {
    opacity: 0.7,
  },
  disabledActionText: {
    color: theme.colors.text.tertiary,
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.medium,
    textAlign: 'center',
  },
  cancelButton: {
    height: 48,
    backgroundColor: '#FEF2F2',
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
});