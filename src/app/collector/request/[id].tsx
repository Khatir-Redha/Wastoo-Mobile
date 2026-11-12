import React, { useEffect, useState } from 'react';
import {
  View, Text, ActivityIndicator, TouchableOpacity,
  ScrollView, Image, SafeAreaView, Platform, StyleSheet
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import RequestService, { Request, RequestStatus } from '../../../../services/request.service';
import PostService, { Post } from '../../../../services/post.service';
import { theme } from '../../../theme/tokens';
import ScreenHeader from '../../../components/collector/ScreenHeader';
import { getPostQuantities } from '../../../utils/post-quantities';
import { ConfirmSheet, useToast } from '../../../components/ui';

const STATUS_STYLES: Record<RequestStatus, { bg: string; text: string; icon: string }> = {
  PENDING: { bg: '#FFF8E1', text: '#F59E0B', icon: 'clock-outline' },
  ACCEPTED: { bg: '#EFF6FF', text: '#3B82F6', icon: 'check-circle-outline' },
  REJECTED: { bg: '#FEF2F2', text: '#EF4444', icon: 'close-circle-outline' },
  WITHDRAWN: { bg: '#F4F4F4', text: '#6D7A6E', icon: 'undo-outline' },
};

const formatStatus = (s: string) => s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function CollectorRequestDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [request, setRequest] = useState<Request | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ConfirmSheet states
  const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const requestData = await RequestService.getRequestById(Number(id));
        setRequest(requestData);
        if (requestData.post) {
          const postData = await PostService.getPostById(requestData.post_id);
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

  const handleWithdrawConfirm = async () => {
    setActionLoading(true);
    try {
      await RequestService.withdrawRequest(Number(id));
      setRequest(prev => prev ? { ...prev, status: RequestStatus.WITHDRAWN } : prev);
      showToast('Request withdrawn', 'success');
      router.back();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to withdraw request', 'error');
    } finally {
      setActionLoading(false);
      setShowWithdrawSheet(false);
    }
  };

  const handleWithdrawPress = () => {
    setShowWithdrawSheet(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.emerald[500]} />
      </View>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title="Request not found" showBack={true} subtitle="" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="clipboard-alert-outline" size={56} color={theme.colors.text.tertiary} />
          <Text style={styles.errorTitle}>Request not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = STATUS_STYLES[request.status as RequestStatus] || STATUS_STYLES.PENDING;
  const postTitle = request.post?.title || 'Unknown Post';
  const postCategory = request.post?.category || 'Unknown';
  const requestedQty = request.requested_quantity;
  const unit = ['ORGANIC', 'HAZARDOUS'].includes(postCategory) ? 'L' : 'kg';
  const imageUrl = request.post?.images?.[0]?.url?.trim()
    ? request.post.images[0].url.replace('http://', 'https://')
    : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80';

  // Get quantities using the shared helper
  const requestPostQuantities = getPostQuantities(request.post);
  const availableQty = requestPostQuantities.available;

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={post?.title ?? "Request Details"} showBack={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <MaterialCommunityIcons name={statusStyle.icon as any} size={20} color={statusStyle.text} />
            <Text style={{ color: statusStyle.text, ...styles.statusText }}>
              {formatStatus(request.status)}
            </Text>
          </View>
          <Text style={styles.requestDate}>
            Submitted {new Date(request.created_at).toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </Text>
        </View>

        {/* Waste Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WASTE DETAILS</Text>
          <View style={styles.postContent}>
            <Image source={{ uri: imageUrl }} style={styles.postImage} resizeMode="cover" />
            <View style={styles.postInfo}>
              <Text style={styles.postTitle}>{postTitle}</Text>
              <View style={styles.postMeta}>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="scale" size={14} color={theme.colors.text.tertiary} />
                  <Text style={styles.metaText}>{requestedQty} {unit} requested</Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="tag" size={14} color={theme.colors.text.tertiary} />
                  <Text style={styles.metaText}>
                    {postCategory.charAt(0) + postCategory.slice(1).toLowerCase()}
                  </Text>
                </View>
              </View>
              {availableQty !== null && (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="package-variant" size={14} color={theme.colors.emerald[600]} />
                  <Text style={{ ...styles.metaText, color: theme.colors.emerald[600] }}>
                    {availableQty} {unit} available
                  </Text>
                </View>
              )}
              {post?.address && (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.text.tertiary} />
                  <Text style={styles.metaText} numberOfLines={1}>{post.address}</Text>
                </View>
              )}
            </View>
          </View>
          {post?.description && (
            <Text style={styles.postDescription}>{post.description}</Text>
          )}
        </View>

        {/* Pickup Info - if accepted */}
        {request.status === RequestStatus.ACCEPTED && request.pickup && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PICKUP DETAILS</Text>
            <View style={styles.pickupInfo}>
              <View style={styles.pickupRow}>
                <MaterialCommunityIcons name="truck-outline" size={18} color={theme.colors.emerald[600]} />
                <Text style={styles.pickupText}>Pickup created: #{request.pickup.id}</Text>
              </View>
              <View style={styles.pickupRow}>
                <MaterialCommunityIcons name="progress-check" size={18} color={theme.colors.emerald[600]} />
                <Text style={styles.pickupText}>
                  Status: {formatStatus(request.pickup.status)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push(`/collector/pickup/${request.pickup!.id}`)}
                style={styles.viewPickupButton}
              >
                <Text style={styles.viewPickupButtonText}>View Pickup Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          {request.status === RequestStatus.PENDING && (
            <TouchableOpacity
              onPress={handleWithdrawPress}
              disabled={actionLoading}
              style={[styles.withdrawButton, actionLoading && styles.buttonDisabled]}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.withdrawButtonText}>Withdraw Request</Text>
              )}
            </TouchableOpacity>
          )}

          {request.status === RequestStatus.REJECTED && (
            <View style={styles.rejectedNotice}>
              <MaterialCommunityIcons name="information-outline" size={18} color={theme.colors.text.tertiary} />
              <Text style={styles.rejectedText}>
                This request was declined by the supplier. You can submit a new request for this post if it's still available.
              </Text>
            </View>
          )}

          {request.status === RequestStatus.WITHDRAWN && (
            <View style={styles.withdrawnNotice}>
              <MaterialCommunityIcons name="information-outline" size={18} color={theme.colors.text.tertiary} />
              <Text style={styles.withdrawnText}>
                You withdrew this request. The reserved quantity has been released.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ConfirmSheet */}
      <ConfirmSheet
        visible={showWithdrawSheet}
        onClose={() => setShowWithdrawSheet(false)}
        title="Withdraw Request"
        message="Are you sure you want to withdraw this request? The reserved quantity will be released."
        confirmText="Withdraw"
        cancelText="Cancel"
        onConfirm={handleWithdrawConfirm}
        loading={actionLoading}
        variant="destructive"
        icon="undo-outline"
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
    backgroundColor: theme.colors.canvas.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: theme.colors.canvas.secondary,
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.bold,
  },
  requestDate: {
    color: theme.colors.text.tertiary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.medium,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.xl,
    padding: 20,
    marginBottom: 16,
  },
  sectionLabel: {
    color: theme.colors.emerald[700],
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: 1,
    marginBottom: 16,
  },
  postContent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  postImage: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.canvas.tertiary,
  },
  postInfo: {
    marginLeft: 16,
    flex: 1,
  },
  postTitle: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 17,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  postMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  postDescription: {
    color: theme.colors.text.tertiary,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.regular,
    lineHeight: 20,
  },
  pickupInfo: {
    gap: 12,
  },
  pickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickupText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
  },
  viewPickupButton: {
    marginTop: 8,
    paddingVertical: 12,
    backgroundColor: theme.colors.emerald[500],
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  viewPickupButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  actionsSection: {
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: theme.colors.error[500],
    borderRadius: theme.radius.md,
  },
  withdrawButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  rejectedNotice: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: theme.radius.md,
  },
  rejectedText: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.regular,
    color: '#B91C1C',
    lineHeight: 19,
  },
  withdrawnNotice: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: theme.radius.md,
  },
  withdrawnText: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.regular,
    color: '#6B7280',
    lineHeight: 19,
  },
});