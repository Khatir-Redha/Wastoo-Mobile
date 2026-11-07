import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
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
} from 'react-native';
import { useAuth } from '../../../../context/AuthProvider';
import { theme } from '../../../theme/tokens';
import RequestService, { Request, RequestStatus, GetMyRequestsResponse } from '../../../../services/request.service';
import NotificationBell from '../../../components/NotificationBell';

const STATUS_STYLES: Record<RequestStatus, { bg: string; text: string }> = {
  PENDING: { bg: '#FFF8E1', text: '#F59E0B' },
  ACCEPTED: { bg: '#EFF6FF', text: '#3B82F6' },
  REJECTED: { bg: '#FEF2F2', text: '#EF4444' },
  WITHDRAWN: { bg: '#F4F4F4', text: '#6D7A6E' },
};

const formatStatus = (s: string) => s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function CollectorRequestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'Collector';

  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = async (isRefresh = false) => {
    const targetPage = isRefresh ? 1 : page;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response: GetMyRequestsResponse = await RequestService.getMyRequests({
        page: targetPage,
        limit: 20,
      });

      if (isRefresh) {
        setRequests(response.data);
      } else {
        setRequests(prev => [...prev, ...response.data]);
      }

      setHasMore(targetPage < response.meta.totalPages);
      setPage(targetPage + 1);
    } catch (err: any) {
      console.error('Failed to load requests:', err);
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
  const handleLoadMore = () => {
    if (!loading && hasMore) loadRequests(false);
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

    const onPress = () => {
      if (item.status === RequestStatus.ACCEPTED && item.pickup) {
        router.push(`/collector/pickup/${item.pickup.id}`);
      } else {
        router.push(`/collector/request/${item.id}`);
      }
    };

    return (
      <Pressable onPress={onPress} style={styles.requestCard} accessibilityRole="button">
        <View style={styles.cardHeader}>
          <View style={styles.statusBadge} style={[{ backgroundColor: statusStyle.bg }]}>
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
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: statusStyle.bg,
                  opacity: 0.1,
                }}
              />
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'transparent',
                }}
              />
              <View style={styles.imagePlaceholder}>
                <MaterialCommunityIcons name="recycle" size={24} color={statusStyle.text} />
              </View>
            </View>
          )}

          <View style={styles.infoWrapper}>
            <Text style={styles.postTitle} numberOfLines={2}>{postTitle}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="scale" size={14} color={theme.colors.text.tertiary} />
                <Text style={styles.metaText}>{requestedQty} {unit}</Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="tag" size={14} color={theme.colors.text.tertiary} />
                <Text style={styles.metaText}>
                  {postCategory.charAt(0) + postCategory.slice(1).toLowerCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {(item.status === RequestStatus.PENDING || item.status === RequestStatus.ACCEPTED) && (
          <View style={styles.actionBar}>
            {item.status === RequestStatus.PENDING && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  // Withdraw request
                }}
                style={styles.withdrawButton}
                accessibilityLabel="Withdraw request"
              >
                <Text style={styles.withdrawButtonText}>Withdraw</Text>
              </Pressable>
            )}
            {item.status === RequestStatus.ACCEPTED && item.pickup && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/collector/pickup/${item.pickup.id}`);
                }}
                style={styles.viewPickupButton}
                accessibilityLabel="View pickup details"
              >
                <Text style={styles.viewPickupButtonText}>View Pickup</Text>
              </Pressable>
            )}
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
            <Text style={styles.subtitle}>Your collection requests</Text>
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
          <Text style={styles.subtitle}>Your collection requests</Text>
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="clipboard-outline"
              size={56}
              color={theme.colors.text.tertiary}
            />
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptyDescription}>
              Requests you submit for posts will appear here.
            </Text>
          </View>
        }
      />

      {hasMore && !loading && (
        <View style={styles.loadMore}>
          <Pressable onPress={handleLoadMore} style={styles.loadMoreButton}>
            <Text style={styles.loadMoreText}>Load more</Text>
          </Pressable>
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
    justifyContent: 'flex-end',
  },
  withdrawButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
  },
  withdrawButtonText: {
    color: theme.colors.error,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  viewPickupButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.emerald[500],
    borderRadius: theme.radius.md,
  },
  viewPickupButtonText: {
    color: '#FFFFFF',
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
  loadMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: 999,
  },
  loadMoreText: {
    color: theme.colors.text.secondary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.medium,
  },
  listContent: {
    paddingBottom: 24,
  },
  loadingList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
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
    width: 80,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#E5EEE9',
  },
  skeletonDate: {
    width: 60,
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