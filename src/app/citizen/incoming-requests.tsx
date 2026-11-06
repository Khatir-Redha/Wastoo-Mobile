import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useAuth } from '../../../context/AuthProvider';
import { theme } from '../../theme/tokens';
import RequestService, { Request, RequestStatus } from '../../../services/request.service';
import PostService from '../../../services/post.service';
import NotificationBell from '../../components/NotificationBell';

const STATUS_STYLES: Record<RequestStatus, { bg: string; text: string; icon: string }> = {
  PENDING: { bg: '#FFF8E1', text: '#F59E0B', icon: 'clock-outline' },
  ACCEPTED: { bg: '#EFF6FF', text: '#3B82F6', icon: 'check-circle-outline' },
  REJECTED: { bg: '#FEF2F2', text: '#EF4444', icon: 'close-circle-outline' },
  WITHDRAWN: { bg: '#F4F4F4', text: '#6D7A6E', icon: 'undo-outline' },
};

const formatStatus = (s: string) => s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function CitizenIncomingRequestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'Supplier';

  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      // Fetch all posts by this user
      const myPosts = await PostService.getMyPosts();
      const postIds = myPosts.map(p => p.id);

      if (postIds.length === 0) {
        setRequests([]);
        return;
      }

      // Fetch requests for all user's posts
      const allRequests = await Promise.all(
        postIds.map(postId => RequestService.getRequestsForPost(postId))
      );

      // Flatten and sort by most recent first
      const flattened = allRequests.flat().sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRequests(flattened);
    } catch (err: any) {
      console.error('Failed to load incoming requests:', err);
      setError(err?.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleRefresh = () => loadRequests(true);

  const handleAccept = async (request: Request) => {
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
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to accept request');
            }
          }
        }
      ]
    );
  };

  const handleReject = async (request: Request) => {
    Alert.alert(
      'Reject Request',
      `Reject ${request.collector?.name || 'collector'}'s request? This will release the reserved quantity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await RequestService.updateRequestStatus(request.id, RequestStatus.REJECTED);
              setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: RequestStatus.REJECTED } : r));
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to reject request');
            }
          }
        }
      ]
    );
  };

  const renderRequest = ({ item }: { item: Request }) => {
    const statusStyle = STATUS_STYLES[item.status as RequestStatus] || STATUS_STYLES.PENDING;
    const postTitle = item.post?.title || `Post #${item.post_id}`;
    const postCategory = item.post?.category || 'Unknown';
    const requestedQty = item.requested_quantity;
    const unit = ['ORGANIC', 'HAZARDOUS'].includes(postCategory) ? 'L' : 'kg';
    const imageUrl = item.post?.images?.[0]?.url?.trim()
      ? item.post.images[0].url.replace('http://', 'https://')
      : null;
    const collectorName = item.collector?.name || 'Unknown Collector';

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
                <Text style={styles.metaText}>{requestedQty} {unit}</Text>
              </View>
            </View>
          </View>
        </View>

        {item.status === RequestStatus.PENDING && (
          <View style={styles.actionBar}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleReject(item);
              }}
              style={styles.rejectButton}
              accessibilityLabel="Reject request"
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </Pressable>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleAccept(item);
              }}
              style={styles.acceptButton}
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

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.title}>Hello, {firstName}!</Text>
            <Text style={styles.subtitle}>Incoming collection requests</Text>
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
          <Text style={styles.subtitle}>Incoming collection requests</Text>
        </View>
        <NotificationBell />
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

      <FlatList
        data={requests}
        keyExtractor={item => item.id.toString()}
        renderItem={renderRequest}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.emerald[500]}
          />
        }
        ListEmptyComponent={
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
        }
      />
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
  requestCard: {
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
  loadingList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listContent: {
    paddingBottom: 24,
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