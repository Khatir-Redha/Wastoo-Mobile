import React, { useEffect, useState } from 'react';
import {
  View, Text, ActivityIndicator, TouchableOpacity,
  ScrollView, SafeAreaView, StyleSheet
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import RequestService, { Request, RequestStatus } from '../../../../services/request.service';
import PostService, { Post } from '../../../../services/post.service';
import { Image } from 'expo-image';
import { theme } from '../../../theme/tokens';
import { getPostQuantities } from '../../../utils/post-quantities';
import { ConfirmSheet, useToast } from '../../../components/ui';

const STATUS_STYLES: Record<RequestStatus, { bg: string; text: string; icon: string }> = {
  PENDING: { bg: '#FFF8E1', text: '#F59E0B', icon: 'clock-outline' },
  ACCEPTED: { bg: '#EFF6FF', text: '#3B82F6', icon: 'check-circle-outline' },
  REJECTED: { bg: '#FEF2F2', text: '#EF4444', icon: 'close-circle-outline' },
  WITHDRAWN: { bg: '#F4F4F4', text: '#6D7A6E', icon: 'undo-outline' },
};

const formatStatus = (s: string) => s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function CitizenRequestDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [request, setRequest] = useState<Request | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ConfirmSheet states
  const [showAcceptSheet, setShowAcceptSheet] = useState(false);
  const [showRejectSheet, setShowRejectSheet] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const requestData = await RequestService.getRequestById(Number(id));
        setRequest(requestData);
        if (requestData.post_id) {
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

  const handleAcceptPress = () => {
    setShowAcceptSheet(true);
  };

  const handleRejectPress = () => {
    setShowRejectSheet(true);
  };

  const handleAcceptConfirm = async () => {
    setActionLoading(true);
    try {
      const updatedRequest = await RequestService.updateRequestStatus(Number(id), RequestStatus.ACCEPTED);
      if (updatedRequest.status === RequestStatus.ACCEPTED) {
        setRequest(updatedRequest);
        showToast('Request accepted. A pickup was created.', 'success');
        // Navigate back to requests list
        router.back();
      } else {
        showToast('Failed to accept request', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to accept request', 'error');
    } finally {
      setActionLoading(false);
      setShowAcceptSheet(false);
    }
  };

  const handleRejectConfirm = async () => {
    setActionLoading(true);
    try {
      const updatedRequest = await RequestService.updateRequestStatus(Number(id), RequestStatus.REJECTED);
      if (updatedRequest.status === RequestStatus.REJECTED) {
        setRequest(updatedRequest);
        showToast('Request rejected', 'success');
      } else {
        showToast('Failed to reject request', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to reject request', 'error');
    } finally {
      setActionLoading(false);
      setShowRejectSheet(false);
    }
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
      <SafeAreaView style={styles.errorContainer}>
        <MaterialCommunityIcons name="clipboard-alert-outline" size={56} color={theme.colors.text.tertiary} />
        <Text style={styles.errorTitle}>Request not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusStyle = STATUS_STYLES[request.status as RequestStatus] || STATUS_STYLES.PENDING;
  const postTitle = request.post?.title || post?.title || 'Unknown Post';
  const postCategory = request.post?.category || post?.category || 'Unknown';
  const requestedQty = request.requested_quantity;
  const unit = ['ORGANIC', 'HAZARDOUS'].includes(postCategory) ? 'L' : 'kg';
  const imageUrl = request.post?.images?.[0]?.url?.trim()
    ? request.post.images[0].url.replace('http://', 'https://')
    : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80';
  const collectorName = request.collector?.name || 'Unknown Collector';
  const collectorPhone = request.collector?.phone || 'Not provided';

  // Get quantities using the shared helper
  const postQuantities = getPostQuantities(post || request.post || null);
  const availableQty = postQuantities.available ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Back">
          <Feather name="arrow-left" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request #{request.id}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View style={[{ backgroundColor: statusStyle.bg }, styles.statusBadge]}>
            <MaterialCommunityIcons name={statusStyle.icon as any} size={20} color={statusStyle.text} />
            <Text style={{ color: statusStyle.text, ...styles.statusText }}>
              {formatStatus(request.status)}
            </Text>
          </View>
          <Text style={styles.requestDate}>
            Received {new Date(request.created_at).toLocaleDateString('en-GB', {
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
                  <Text style={styles.metaText}>{requestedQty} {unit} requested · {availableQty ?? 0} {unit} available</Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="tag" size={14} color={theme.colors.text.tertiary} />
                  <Text style={styles.metaText}>
                    {postCategory.charAt(0) + postCategory.slice(1).toLowerCase()}
                  </Text>
                </View>
              </View>
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

        {/* Collector Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>COLLECTOR</Text>
          <View style={styles.collectorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {collectorName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.collectorName}>{collectorName}</Text>
              <Text style={styles.collectorPhone}>{collectorPhone}</Text>
            </View>
          </View>
        </View>

        {/* Pending Requests Info */}
        {postQuantities.pendingRequested !== null && postQuantities.pendingRequested > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PENDING REQUESTS</Text>
            <View style={styles.pendingInfo}>
              <View style={styles.pendingRow}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.gold[500]} />
                <Text style={styles.pendingText}>
                  {postQuantities.pendingRequested} {unit} requested across pending request(s)
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Message */}
        {request.message && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>COLLECTOR MESSAGE</Text>
            <View style={styles.messageBubble}>
              <Text style={styles.messageText}>{"\"" + request.message + "\""}</Text>
            </View>
          </View>
        )}

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
                onPress={() => router.push(`/pickups/${request.pickup!.id}`)}
                style={styles.viewPickupButton}
              >
                <Text style={styles.viewPickupButtonText}>View Pickup Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Bottom Action Bar - Fixed at bottom */}
      {request.status === RequestStatus.PENDING && (
        <View style={styles.bottomActionBar}>
          {/* Warning when requested > available */}
          {requestedQty > availableQty && (
            <View style={styles.warningBar}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color={theme.colors.error} />
              <Text style={styles.warningText}>
                Requested {requestedQty} {unit} exceeds available {availableQty ?? 0} {unit}
              </Text>
            </View>
          )}
          <TouchableOpacity
            onPress={handleRejectPress}
            disabled={actionLoading}
            style={[styles.rejectButton, actionLoading && styles.buttonDisabled]}
            activeOpacity={0.8}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAcceptPress}
            disabled={actionLoading || requestedQty > availableQty}
            style={[
              styles.acceptButton,
              (actionLoading || requestedQty > availableQty) && styles.buttonDisabled,
            ]}
            activeOpacity={0.8}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {request.status === RequestStatus.ACCEPTED && !request.pickup && (
        <View style={styles.bottomActionBar}>
          <TouchableOpacity
            onPress={() => {
              router.push(`/pickups/create?post_id=${request.post_id}&from_request=${request.id}`);
            }}
            style={styles.createPickupButton}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="truck-plus-outline" size={18} color="#FFFFFF" />
            <Text style={styles.createPickupButtonText}>Create Pickup</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ConfirmSheets */}
      <ConfirmSheet
        visible={showAcceptSheet}
        onClose={() => setShowAcceptSheet(false)}
        title="Accept Request"
        message={`Accept ${collectorName}'s request for ${requestedQty} ${unit} of "${postTitle}"?`}
        confirmText="Accept"
        cancelText="Cancel"
        onConfirm={handleAcceptConfirm}
        loading={actionLoading}
        variant="default"
        icon="check-circle-outline"
      />

      <ConfirmSheet
        visible={showRejectSheet}
        onClose={() => setShowRejectSheet(false)}
        title="Reject Request"
        message={`Reject ${collectorName}'s request for ${requestedQty} ${unit} of "${postTitle}"?`}
        confirmText="Reject"
        cancelText="Cancel"
        onConfirm={handleRejectConfirm}
        loading={actionLoading}
        variant="destructive"
        icon="close-circle-outline"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  headerSpacer: {
    width: 44,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
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
  collectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.emerald[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: theme.colors.emerald[700],
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.bold,
  },
  collectorName: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  collectorPhone: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.tertiary,
  },
  messageBubble: {
    padding: 16,
    backgroundColor: theme.colors.canvas.tertiary,
    borderRadius: theme.radius.md,
  },
  messageText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
    fontStyle: 'italic',
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
  // Bottom Action Bar - Fixed at bottom with safe area
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 0,
    paddingTop: 12,
    backgroundColor: theme.colors.canvas.primary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.default,
    flexDirection: 'row',
    gap: 12,
    minHeight: 52 + 34, // 52px button + iOS home indicator area
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: theme.colors.error,
    borderRadius: theme.radius.md,
    minHeight: 52,
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: theme.colors.emerald[500],
    borderRadius: theme.radius.md,
    minHeight: 52,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createPickupButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: theme.colors.emerald[600],
    borderRadius: theme.radius.md,
    minHeight: 52,
  },
  createPickupButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  warningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: theme.radius.md,
    marginBottom: 12,
  },
  warningText: {
    color: theme.colors.error,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.medium,
    flex: 1,
  },
  pendingInfo: {
    padding: 4,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingText: {
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
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
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
});