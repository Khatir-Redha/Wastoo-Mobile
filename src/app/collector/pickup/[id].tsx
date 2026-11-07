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

// Timeline steps
const TIMELINE = [
  { key: 'PENDING',    label: 'Requested' },
  { key: 'ASSIGNED',  label: 'Assigned' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'COMPLETED', label: 'Completed' },
];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'PENDING':    return { bg: '#FFF8E1', text: '#F59E0B' };
    case 'ASSIGNED':   return { bg: '#EFF6FF', text: '#3B82F6' };
    case 'IN_TRANSIT': return { bg: '#F5F3FF', text: '#8B5CF6' };
    case 'COMPLETED':  return { bg: '#E8F8EE', text: '#1E5631' };
    case 'CANCELED':   return { bg: '#FEF2F2', text: '#EF4444' };
    case 'REQUESTED':  return { bg: '#E8F8EE', text: '#1E5631' };
    default:           return { bg: '#F4F4F4', text: '#6D7A6E' };
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
    setActionLoading(true);
    try {
      await PickupService.updateStatus(Number(id));
      setPickup(prev => prev ? { ...prev, status: PickupStatus.IN_TRANSIT } : prev);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err.message || 'Failed to start transit');
    } finally {
      setActionLoading(false);
    }
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
      <ScreenHeader title={`Pickup #${pickup.id}`} showBell={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Timeline ── */}
        {pickup.status !== PickupStatus.CANCELED && (
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
            <Text style={styles.canceledText}>This pickup was cancelled by the citizen.</Text>
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
                  {(post as any).title || 'Untitled Post'}
                </Text>
                <Text style={styles.postCategory}>
                  {(post as any).category}  •  {(post as any).quantity || 'N/A'} kg
                </Text>
                {(post as any).address && (
                  <View style={styles.addressRow}>
                    <Feather name="map-pin" size={13} color="#8A8F87" />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {(post as any).address}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.postNotFound}>Post #{pickup.post_id}</Text>
          )}

          {post?.description && (
            <Text style={styles.postDescription}>{post.description}</Text>
          )}
        </View>

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
                <Text style={styles.actionButtonText}>Start Pickup (In Transit)</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {pickup.status === PickupStatus.IN_TRANSIT && (
          <TouchableOpacity
            onPress={() => router.push(`/collector/pickup/confirm?id=${pickup.id}`)}
            style={styles.actionButtonCompleted}
          >
            <Feather name="check-circle" size={22} color="white" />
            <Text style={styles.actionButtonText}>Complete Pickup</Text>
          </TouchableOpacity>
        )}

        {pickup.status === PickupStatus.COMPLETED && (
          <View style={styles.actionButtonReceipt}>
            <Feather name="file-text" size={22} color="#1E5631" />
            <Text style={styles.receiptText}>View Receipt</Text>
          </View>
        )}

        {(pickup.status === PickupStatus.PENDING || pickup.status === PickupStatus.CANCELED) && (
          <View style={styles.actionButtonDisabled}>
            <Text style={styles.disabledActionText}>
              {pickup.status === PickupStatus.PENDING
                ? 'Request pending - await assignment'
                : 'Pickup was cancelled'}
            </Text>
          </View>
        )}
      </View>
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
    paddingBottom: 120,
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
    backgroundColor: '#1E5631',
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
});