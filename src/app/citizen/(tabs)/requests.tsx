import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../../../context/AuthProvider';
import { theme } from '../../../theme/tokens';
import RequestService, { Request, RequestStatus } from '../../../../services/request.service';
import PostService from '../../../../services/post.service';
import PickupService, { Pickup, PickupStatus } from '../../../../services/pickup.service';
import NotificationBell from '../../../components/NotificationBell';
import { usePendingRequestsSummary } from '@/hooks/usePendingRequestsSummary';

type Segment = 'incoming' | 'pickups';

const REQUEST_STATUS_STYLES: Record<RequestStatus, { bg: string; text: string; icon: string }> = {
  PENDING: { bg: '#FFF8E1', text: '#F59E0B', icon: 'clock-outline' },
  ACCEPTED: { bg: '#EFF6FF', text: '#3B82F6', icon: 'check-circle-outline' },
  REJECTED: { bg: '#FEF2F2', text: '#EF4444', icon: 'close-circle-outline' },
  WITHDRAWN: { bg: '#F4F4F4', text: '#6D7A6E', icon: 'undo-outline' },
};

const PICKUP_STATUS_STYLES: Record<PickupStatus, { bg: string; text: string; icon: string }> = {
  PENDING: { bg: '#FFF8E1', text: '#F59E0B', icon: 'clock-outline' },
  REQUESTED: { bg: '#E8F8EE', text: '#1E5631', icon: 'clipboard-outline' },
  ASSIGNED: { bg: '#EFF6FF', text: '#3B82F6', icon: 'truck-outline' },
  IN_TRANSIT: { bg: '#F5F3FF', text: '#8B5CF6', icon: 'truck-fast-outline' },
  COMPLETED: { bg: '#E8F8EE', text: '#1E5631', icon: 'check-circle-outline' },
  CANCELED: { bg: '#FEF2F2', text: '#EF4444', icon: 'cancel-outline' },
};

const formatStatus = (s: string) => s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

const getQuantityUnit = (category: string) => {
  const liquidCategories = ['ORGANIC', 'HAZARDOUS'];
  return liquidCategories.includes(category) ? 'L' : 'kg';
};

export default function CitizenRequestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'Supplier';
  const { refresh: refreshPending } = usePendingRequestsSummary();

  const [activeSegment, setActiveSegment] = useState<Segment>('incoming');
  const [requests, setRequests] = useState<Request[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAllData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // Load incoming requests
      const myPosts = await PostService.getMyPosts();
      const postIds = myPosts.map(p => p.id);

      if (postIds.length === 0) {
        setRequests([]);
      } else {
        const allRequests = await Promise.all(
          postIds.map(postId => RequestService.getRequestsForPost(postId))
        );
        const flattened = allRequests.flat().sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRequests(flattened);
      }

      // Load pickups
      const allPickups = await PickupService.getAllPickups();
      const myPickups = allPickups.filter(p => p.owner_id === user?.id);
      myPickups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPickups(myPickups);

    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err?.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadAllData(false);
  }, [loadAllData]);

  const handleRefresh = () => {
    refreshPending();
    loadAllData(true);
  };

  const handleAcceptRequest = async (request: Request) => {
    Alert.alert(
      'Accept Request',
      `Accept ${request.collector?.name || 'collector'}'s request for ${request.requested_quantity} ${['ORGANIC', 'HAZARDOUS'].includes(request.post?.category || '') ? 'L' : 'kg'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await RequestService.updateRequestStatus(request.id, RequestStatus.ACCEPTED);
              setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: RequestStatus.ACCEPTED } : r));
              await refreshPending();
              // Show success message temporarily
              Alert.alert('Success', 'Accepted. A pickup was created', [{ text: 'OK' }]);
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to accept request');
            }
          }
        }
      ]
    );
  };

  const handleRejectRequest = async (request: Request) => {
    Alert.alert(
      'Reject Request',
      `Reject ${request.collector?.name || 'collector'}'s request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await RequestService.updateRequestStatus(request.id, RequestStatus.REJECTED);
              setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: RequestStatus.REJECTED } : r));
              await refreshPending();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to reject request');
            }
          }
        }
      ]
    );
  };

  // Filter requests - only show PENDING for incoming segment
  const filteredRequests = requests.filter(r => r.status === RequestStatus.PENDING);

  // Filter pickups - grouped by status
  const activePickups = pickups.filter(p =>
    p.status === PickupStatus.PENDING ||
    p.status === PickupStatus.REQUESTED ||
    p.status === PickupStatus.ASSIGNED ||
    p.status === PickupStatus.IN_TRANSIT
  );
  const completedPickups = pickups.filter(p =>
    p.status === PickupStatus.COMPLETED ||
    p.status === PickupStatus.CANCELED
  );

  const renderRequestCard = ({ item }: { item: Request }) => {
    const statusStyle = REQUEST_STATUS_STYLES[item.status as RequestStatus] || REQUEST_STATUS_STYLES.PENDING;
    const postTitle = item.post?.title || `Post #${item.post_id}`;
    const postCategory = item.post?.category || 'Unknown';
    const requestedQty = item.requested_quantity;
    const availableQty = item.post?.available_quantity ?? 0;
    const totalQty = item.post?.quantity ?? 0;
    const unit = getQuantityUnit(postCategory || '');
    const imageUrl = item.post?.images?.[0]?.url?.trim()
      ? item.post.images[0].url.replace('http://', 'https://')
      : null;
    const collectorName = item.collector?.name || 'Unknown Collector';

    const canAccept = item.status === RequestStatus.PENDING && requestedQty <= availableQty;

    return (
      <Pressable onPress={() => router.push(`/citizen/request/${item.id}`)} style={styles.requestCard} accessibilityRole="button">
        <View style={styles.cardHeader}>
          <View style={[{ backgroundColor: statusStyle.bg }, styles.statusBadge]}>
            <MaterialCommunityIcons name={statusStyle.icon as any} size={16} color={statusStyle.text} />
            <Text style={{ color: statusStyle.text, ...styles.statusText }}>
              {formatStatus(item.status)}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>

        <View style={styles.cardContent}>
          {imageUrl && (
            <View style={styles.imageWrapper}>
              <View style={styles.imagePlaceholder}>
                <MaterialCommunityIcons name="recycle" size={24} color={statusStyle.text} />
              </View>
            </View>
          )}

          <View style={styles.infoWrapper}>
            <Text style={styles.postTitle} numberOfLines={2}>{postTitle}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="account" size={14} color={theme.colors.text.tertiary} />
                <Text style={styles.metaText}>{collectorName}</Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="scale" size={14} color={theme.colors.text.tertiary} />
                <Text style={styles.metaText}>
                  {requestedQty} / {totalQty} {unit} available
                </Text>
              </View>
            </View>
          </View>
        </View>

        {item.status === RequestStatus.PENDING && (
          <View style={styles.actionBar}>
            {!canAccept && (
              <Text style={styles.warningText}>
                Exceeds available quantity
              </Text>
            )}
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleRejectRequest(item);
              }}
              style={styles.rejectButton}
              accessibilityLabel="Reject request"
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </Pressable>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleAcceptRequest(item);
              }}
              disabled={!canAccept}
              style={[styles.acceptButton, !canAccept && styles.acceptButtonDisabled]}
              accessibilityLabel="Accept request"
            >
              <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Accept</Text>
            </Pressable>
          </View>
        )}

        {item.status === RequestStatus.ACCEPTED && item.pickup && (
          <View style={styles.actionBar}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/pickups/${item.pickup!.id}`);
              }}
              style={styles.viewPickupButton}
              accessibilityLabel="View pickup details"
            >
              <MaterialCommunityIcons name="truck-outline" size={16} color={theme.colors.emerald[600]} />
              <Text style={styles.viewPickupButtonText}>View Pickup</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  };

  const renderPickupCard = (pickup: Pickup) => {
    const statusStyle = PICKUP_STATUS_STYLES[pickup.status] || PICKUP_STATUS_STYLES.PENDING;
    const post = pickup.post;
    const unit = getQuantityUnit(post?.category || '');
    const collectedWeight = pickup.collected_weight;
    const postTitle = post?.title || `Post #${pickup.post_id}`;

    let rawUrl = post?.images?.[0]?.url?.trim();
    if (!rawUrl) {
      rawUrl = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80';
    } else if (rawUrl.includes('cloudinary.com') && rawUrl.startsWith('http://')) {
      rawUrl = rawUrl.replace('http://', 'https://');
    }

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/pickups/${pickup.id}`)}
        style={styles.pickupCard}
      >
        <View style={styles.cardHeader}>
          <View style={[{ backgroundColor: statusStyle.bg }, styles.statusBadge]}>
            <MaterialCommunityIcons name={statusStyle.icon as any} size={16} color={statusStyle.text} />
            <Text style={{ color: statusStyle.text, ...styles.statusText }}>
              {formatStatus(pickup.status)}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {pickup.scheduled_date
              ? new Date(pickup.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              : 'ASAP'}
          </Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.imageWrapper}>
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="recycle" size={24} color={statusStyle.text} />
            </View>
          </View>

          <View style={styles.infoWrapper}>
            <Text style={styles.postTitle} numberOfLines={2}>{postTitle}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="calendar" size={14} color={theme.colors.text.tertiary} />
                <Text style={styles.metaText}>
                  {pickup.scheduled_date
                    ? new Date(pickup.scheduled_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                    : 'ASAP'}
                </Text>
              </View>
              {pickup.start_time && (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="clock" size={14} color={theme.colors.text.tertiary} />
                  <Text style={styles.metaText}>{pickup.start_time} - {pickup.end_time}</Text>
                </View>
              )}
              {collectedWeight !== null && (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="scale" size={14} color={theme.colors.success} />
                  <Text style={styles.metaText}>{collectedWeight} {unit} collected</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Segments
  const segments: Segment[] = ['incoming', 'pickups'];
  const segmentLabels: Record<Segment, string> = { incoming: 'Incoming', pickups: 'Pickups' };

  // Empty state components for different segments
  const EmptyIncomingRequests = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="clipboard-outline"
        size={56}
        color={theme.colors.text.tertiary}
      />
      <Text style={styles.emptyTitle}>No incoming requests</Text>
      <Text style={styles.emptyDescription}>
        When collectors request your posts, they&apos;ll appear here.
      </Text>
    </View>
  );

  const EmptyPickups = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="package-variant-closed"
        size={56}
        color={theme.colors.text.tertiary}
      />
      <Text style={styles.emptyTitle}>No pickups yet</Text>
      <Text style={styles.emptyDescription}>
        Pickups will appear when collectors accept your requests.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.title}>Hello, {firstName}!</Text>
            <Text style={styles.subtitle}>Collection requests</Text>
          </View>
          <NotificationBell />
        </View>
        <ScrollView contentContainerStyle={styles.loadingList} showsVerticalScrollIndicator={false}>
          {[1, 2, 3].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonHeader}>
                <View style={styles.skeletonBadge} />
                <View style={styles.skeletonDate} />
              </View>
              <View style={styles.skeletonContent}>
                <View style={styles.skeletonLine} />
                <View style={styles.skeletonShortLine} />
                <View style={styles.skeletonMeta} />
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>Hello, {firstName}!</Text>
          <Text style={styles.subtitle}>Collection requests</Text>
        </View>
        <NotificationBell />
      </View>

      {/* Segment Control */}
      <View style={styles.segmentContainer}>
        {segments.map((segment) => (
          <TouchableOpacity
            key={segment}
            onPress={() => setActiveSegment(segment)}
            style={[
              styles.segmentButton,
              activeSegment === segment && styles.segmentButtonActive
            ]}
          >
            <Text style={[
              styles.segmentText,
              activeSegment === segment && styles.segmentTextActive
            ]}>
              {segmentLabels[segment]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {activeSegment === 'incoming' ? (
        <FlatList
          data={filteredRequests}
          keyExtractor={item => item.id.toString()}
          renderItem={renderRequestCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.emerald[500]}
            />
          }
          ListEmptyComponent={activeSegment === 'incoming' ? <EmptyIncomingRequests /> : <EmptyPickups />}
        />
      ) : (
        <View style={styles.pickupContainer}>
          {pickups.length === 0 ? (
            <EmptyPickups />
          ) : (
            <>
              {activePickups.length > 0 && (
                <View style={styles.pickupSection}>
                  <Text style={styles.sectionTitle}>Active Pickups</Text>
                  {activePickups.map((pickup) => (
                    <React.Fragment key={pickup.id}>
                      {renderPickupCard(pickup)}
                    </React.Fragment>
                  ))}
                </View>
              )}
              {completedPickups.length > 0 && (
                <View style={styles.pickupSection}>
                  <Text style={styles.sectionTitle}>Completed</Text>
                  {completedPickups.map((pickup) => (
                    <React.Fragment key={pickup.id}>
                      {renderPickupCard(pickup)}
                    </React.Fragment>
                  ))}
                </View>
              )}
            </>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  heading: {
    flex: 1,
  },
  title: {
    color: theme.colors.forest[500],
    fontSize: 22,
    fontFamily: theme.typography.fontFamily.bold,
  },
  subtitle: {
    marginTop: 3,
    color: theme.colors.text.secondary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.regular,
  },
  segmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentButtonActive: {
    borderBottomColor: theme.colors.emerald[500],
  },
  segmentText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.tertiary,
  },
  segmentTextActive: {
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.emerald[500],
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF9EC',
    borderWidth: 1,
    borderColor: '#F2E3C4',
    borderRadius: 12,
  },
  errorText: {
    flex: 1,
    color: '#9B5B12',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.medium,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.emerald[500],
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  loadingList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
  pickupContainer: {
    flex: 1,
  },
  pickupSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.xl,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  pickupCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.xl,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  dateText: {
    color: theme.colors.text.tertiary,
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.medium,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
  },
  imageWrapper: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.canvas.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    position: 'absolute',
  },
  infoWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  postTitle: {
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  actionBar: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  warningText: {
    color: theme.colors.error,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.medium,
    marginRight: 8,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: theme.colors.error,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: theme.colors.emerald[500],
    borderRadius: theme.radius.md,
  },
  acceptButtonDisabled: {
    backgroundColor: theme.colors.text.tertiary,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  viewPickupButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.emerald[500],
    borderRadius: theme.radius.md,
  },
  viewPickupButtonText: {
    color: theme.colors.emerald[600],
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyTitle: {
    marginTop: 16,
    color: theme.colors.forest[500],
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  emptyDescription: {
    marginTop: 6,
    color: theme.colors.text.tertiary,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.regular,
    lineHeight: 20,
  },
  skeletonCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  skeletonBadge: {
    width: 100,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#E5EEE9',
  },
  skeletonDate: {
    width: 70,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#E5EEE9',
  },
  skeletonContent: {
    padding: 14,
    gap: 8,
  },
  skeletonLine: {
    height: 18,
    borderRadius: 4,
    backgroundColor: '#E5EEE9',
    width: '70%',
  },
  skeletonShortLine: {
    width: '40%',
  },
  skeletonMeta: {
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E5EEE9',
    width: '50%',
  },
});