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
  Alert,
} from 'react-native';
import { useAuth } from '../../../../context/AuthProvider';
import { theme } from '../../../theme/tokens';
import PickupService, { Pickup, PickupStatus } from '../../../../services/pickup.service';
import NotificationBell from '../../../components/NotificationBell';

const STATUS_STYLES: Record<PickupStatus, { bg: string; text: string; icon: string }> = {
  PENDING: { bg: '#FFF8E1', text: '#F59E0B', icon: 'clock-outline' },
  REQUESTED: { bg: '#E8F8EE', text: '#1E5631', icon: 'clipboard-outline' },
  ASSIGNED: { bg: '#EFF6FF', text: '#3B82F6', icon: 'truck-outline' },
  IN_TRANSIT: { bg: '#F5F3FF', text: '#8B5CF6', icon: 'truck-fast-outline' },
  COMPLETED: { bg: '#E8F8EE', text: '#1E5631', icon: 'check-circle-outline' },
  CANCELED: { bg: '#FEF2F2', text: '#EF4444', icon: 'cancel-outline' },
};

const formatStatus = (s: string) => s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function CollectorMyPickupsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'Collector';

  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPickups = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const allPickups = await PickupService.getAllPickups();
      // Filter for current user's pickups as collector
      const myPickups = allPickups.filter(p => p.collector_id === user?._id);

      // Sort by most recent first
      myPickups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setPickups(myPickups);
    } catch (err: any) {
      console.error('Failed to load pickups:', err);
      setError(err?.response?.data?.message || 'Failed to load collections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPickups();
  }, []);

  const handleRefresh = () => loadPickups(true);

  const handleStartTransit = async (id: number) => {
    try {
      await PickupService.updateStatus(id);
      setPickups(prev => prev.map(p => p.id === id ? { ...p, status: PickupStatus.IN_TRANSIT } : p));
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to start transit');
    }
  };

  const handleCompletePickup = (id: number) => {
    router.push(`/collector/pickup/confirm?id=${id}`);
  };

  const renderPickup = ({ item }: { item: Pickup }) => {
    const statusStyle = STATUS_STYLES[item.status as PickupStatus] || STATUS_STYLES.PENDING;
    const postTitle = item.post?.title || `Post #${item.post_id}`;

    const onPress = () => router.push(`/collector/pickup/${item.id}`);

    return (
      <Pressable onPress={onPress} style={styles.pickupCard} accessibilityRole="button">
        <View style={styles.cardHeader}>
          <View style={[{ backgroundColor: statusStyle.bg }, styles.statusBadge]}>
            <MaterialCommunityIcons name={statusStyle.icon} size={16} color={statusStyle.text} />
            <Text style={{ color: statusStyle.text, ...styles.statusText }}>
              {formatStatus(item.status)}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {item.scheduled_date
              ? new Date(item.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
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
                  {item.scheduled_date
                    ? new Date(item.scheduled_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                    : 'ASAP'}
                </Text>
              </View>
              {item.start_time && (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="clock" size={14} color={theme.colors.text.tertiary} />
                  <Text style={styles.metaText}>{item.start_time} - {item.end_time}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {(item.status === PickupStatus.ASSIGNED || item.status === PickupStatus.IN_TRANSIT) && (
          <View style={styles.actionBar}>
            {item.status === PickupStatus.ASSIGNED && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleStartTransit(item.id);
                }}
                style={styles.primaryButton}
                accessibilityLabel="Start transit"
              >
                <MaterialCommunityIcons name="truck-fast-outline" size={16} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Start Pickup</Text>
              </Pressable>
            )}
            {item.status === PickupStatus.IN_TRANSIT && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleCompletePickup(item.id);
                }}
                style={styles.successButton}
                accessibilityLabel="Complete pickup"
              >
                <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                <Text style={styles.successButtonText}>Complete</Text>
              </Pressable>
            )}
          </View>
        )}

        {item.status === PickupStatus.COMPLETED && (
          <View style={styles.actionBar}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                // View receipt
              }}
              style={styles.secondaryButton}
              accessibilityLabel="View receipt"
            >
              <MaterialCommunityIcons name="file-document-outline" size={16} color={theme.colors.emerald[600]} />
              <Text style={styles.secondaryButtonText}>View Receipt</Text>
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
            <Text style={styles.subtitle}>Your active collections</Text>
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
          <Text style={styles.subtitle}>Your active collections</Text>
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
        data={pickups}
        keyExtractor={item => item.id.toString()}
        renderItem={renderPickup}
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
              name="package-variant-closed"
              size={56}
              color={theme.colors.text.tertiary}
            />
            <Text style={styles.emptyTitle}>No collections yet</Text>
            <Text style={styles.emptyDescription}>
              Accepted requests will appear here as active collections.
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
    justifyContent: 'flex-end',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.emerald[500],
    borderRadius: theme.radius.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.emerald[700],
    borderRadius: theme.radius.md,
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.emerald[500],
    borderRadius: theme.radius.md,
  },
  secondaryButtonText: {
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
    width: 50,
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
});