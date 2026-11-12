import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
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
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../../../context/AuthProvider';
import { theme } from '../../../theme/tokens';
import RequestService, { Request, RequestStatus, GetMyRequestsResponse } from '../../../../services/request.service';
import ScreenHeader from '../../../components/collector/ScreenHeader';
import { ListSkeleton } from '../../../components/ui/Skeleton';
import { ConfirmSheet, useToast } from '../../../components/ui';

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
  const { showToast } = useToast();

  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'>('ALL');

  // ConfirmSheet state
  const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);
  const [pendingWithdrawRequest, setPendingWithdrawRequest] = useState<Request | null>(null);

  const loadRequests = useCallback(async (isRefresh = false) => {
    const targetPage = 1; // We'll get all requests, not paginated
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response: GetMyRequestsResponse = await RequestService.getMyRequests({
        page: targetPage,
        limit: 100, // Large limit to get all requests
      });

      let data = response.data;

      // Apply status filter
      if (filter !== 'ALL') {
        data = data.filter(r => r.status === filter);
      }

      setRequests(data);
    } catch (err: any) {
      console.error('Failed to load requests:', err);
      setError(err?.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    loadRequests(false);
  }, [loadRequests]);

  const handleRefresh = () => loadRequests(true);

  const handleWithdrawPress = (request: Request) => {
    setPendingWithdrawRequest(request);
    setShowWithdrawSheet(true);
  };

  const handleWithdrawConfirm = async () => {
    if (!pendingWithdrawRequest) return;
    try {
      await RequestService.withdrawRequest(pendingWithdrawRequest.id);
      setRequests(prev => prev.filter(r => r.id !== pendingWithdrawRequest!.id));
      showToast('Request withdrawn', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to withdraw request', 'error');
    } finally {
      setShowWithdrawSheet(false);
      setPendingWithdrawRequest(null);
    }
  };

  // Group requests by status
  const groupedRequests = {
    PENDING: requests.filter(r => r.status === RequestStatus.PENDING),
    ACCEPTED: requests.filter(r => r.status === RequestStatus.ACCEPTED),
    REJECTED: requests.filter(r => r.status === RequestStatus.REJECTED),
    WITHDRAWN: requests.filter(r => r.status === RequestStatus.WITHDRAWN),
  };

  const renderRequest = ({ item }: { item: Request }) => {
    const statusStyle = STATUS_STYLES[item.status as RequestStatus] || STATUS_STYLES.PENDING;
    const postTitle = item.post?.title || 'Unknown Post';
    const postCategory = item.post?.category || 'Unknown';
    const requestedQty = item.requested_quantity;
    const unit = ['ORGANIC', 'HAZARDOUS'].includes(postCategory) ? 'L' : 'kg';
    const imageUrl = item.post?.images?.[0]?.url?.trim()
      ? item.post.images[0].url.replace('http://', 'https://')
      : null;

    return (
      <Pressable
        onPress={() => router.push(`/collector/request/${item.id}`)}
        style={styles.requestCard}
        accessibilityRole="button"
      >
        <View style={styles.cardHeader}>
          <View style={[{ backgroundColor: statusStyle.bg }, styles.statusBadge]}>
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

        {item.status === RequestStatus.PENDING && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              handleWithdrawPress(item);
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
              router.push(`/collector/pickup/${item.pickup!.id}`);
            }}
            style={styles.viewPickupButton}
            accessibilityLabel="View pickup details"
          >
            <Text style={styles.viewPickupButtonText}>View Pickup</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title={`Hello, ${firstName}!`} subtitle="Your requests" />
        <ScrollView contentContainerStyle={styles.loadingList} showsVerticalScrollIndicator={false}>
          <ListSkeleton count={5} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const hasAnyRequests = requests.length > 0;

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={`Hello, ${firstName}!`} subtitle="Your requests" />

      {error && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.filterContainer}>
        {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const).map((status) => (
          <Pressable
            key={status}
            onPress={() => setFilter(status)}
            style={[
              styles.filterButton,
              filter === status && styles.filterButtonActive
            ]}
          >
            <Text style={[
              styles.filterText,
              filter === status && styles.filterTextActive
            ]}>
              {formatStatus(status)}
            </Text>
          </Pressable>
        ))}
      </View>

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
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptyDescription}>
              Requests you submit for posts will appear here.
            </Text>
          </View>
        }
      />

      {/* ConfirmSheet */}
      {pendingWithdrawRequest && (
        <ConfirmSheet
          visible={showWithdrawSheet}
          onClose={() => { setShowWithdrawSheet(false); setPendingWithdrawRequest(null); }}
          title="Withdraw Request"
          message="Are you sure you want to withdraw this request?"
          confirmText="Withdraw"
          cancelText="Cancel"
          onConfirm={handleWithdrawConfirm}
          loading={false}
          variant="destructive"
          icon="undo-outline"
        />
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.canvas.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.md,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.emerald[500],
    borderColor: theme.colors.emerald[500],
  },
  filterText: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  filterTextActive: {
    color: theme.colors.text.inverse,
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
  withdrawButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.error[500],
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  withdrawButtonText: {
    color: theme.colors.error[500],
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  viewPickupButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.emerald[500],
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  viewPickupButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 16,
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
});