import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Platform, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import PostService, { Post } from '../../../../services/post.service';
import NotificationBell from '../../../components/NotificationBell';
import BadgesButton from '../../../components/BadgesButton';
import { useAuth } from '../../../../context/AuthProvider';
import { theme } from '../../../theme/tokens';
import { Button, Card, ListSkeleton, Skeleton } from '../../../components/ui';
import { usePendingRequestsSummary } from '@/hooks/usePendingRequestsSummary';

const POST_STATUS_STYLES = {
  OPEN: { label: 'Open', bg: '#E8F8EE', text: '#1E5631' },
  CLAIMED: { label: 'In progress', bg: '#FFF8E1', text: '#F59E0B' },
  COMPLETED: { label: 'Completed', bg: '#E8F8EE', text: '#1E5631' },
  DELETED: { label: 'Deleted', bg: '#FEF2F2', text: '#EF4444' },
};

const getPostStatus = (post: Post) => {
  const total = post.quantity ?? 0;
  const reserved = post.reserved_quantity ?? 0;
  const collected = post.collected_quantity ?? 0;
  const available = Math.max(0, total - reserved - collected);

  if (post.status === 'DELETED') return 'DELETED';
  if (post.status === 'COMPLETED') return 'COMPLETED';
  if (available <= 0) return 'CLAIMED';
  if (reserved > 0 || collected > 0) return 'CLAIMED';
  return 'OPEN';
};

const getQuantityUnit = (category: string) => {
  const liquidCategories = ['ORGANIC', 'HAZARDOUS'];
  return liquidCategories.includes(category) ? 'L' : 'kg';
};

export default function CitizenHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'Supplier';
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Use shared hook for pending requests
  const { summary: pendingSummary, refresh: refreshPending } = usePendingRequestsSummary();
  const pendingRequestsCount = pendingSummary.total;

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const posts = await PostService.getMyPosts();
      setMyPosts(posts);
    } catch (err: any) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(false); }, [fetchData]);

  const onRefresh = () => {
    refreshPending();
    fetchData(true);
  };

  const openCreatePost = () => {
    router.push('/citizen/create-post');
  };

  const renderHeader = () => (
    <View style={{ paddingHorizontal: theme.spacing.xl, paddingTop: Platform.OS === 'ios' ? 20 : 44, paddingBottom: theme.spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: theme.typography.fontSize['2xl'].size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text.primary, marginBottom: theme.spacing.xs }}>
          Hello, {firstName}!
        </Text>
        <Text style={{ fontSize: theme.typography.fontSize.md.size, color: theme.colors.text.secondary }}>
          Manage your waste listings
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <BadgesButton />
        <NotificationBell />
      </View>
    </View>
  );

  const renderSummary = () => {
    const openPosts = myPosts.filter(p => getPostStatus(p) === 'OPEN').length;
    const inProgressPosts = myPosts.filter(p => getPostStatus(p) === 'CLAIMED').length;
    const completedPosts = myPosts.filter(p => getPostStatus(p) === 'COMPLETED').length;

    return (
      <View style={{ paddingHorizontal: theme.spacing.xl, marginBottom: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md }}>
          <Card variant="elevated" style={{ flex: 1, padding: theme.spacing.md, borderRadius: theme.radius.xl }}>
            <Text style={{ fontSize: theme.typography.fontSize.xs.size, color: theme.colors.text.tertiary, fontFamily: theme.typography.fontFamily.medium }}>Open Posts</Text>
            <Text style={{ fontSize: theme.typography.fontSize['2xl'].size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text.primary, marginTop: theme.spacing.xs }}>{openPosts}</Text>
          </Card>
          <Card variant="elevated" style={{ flex: 1, padding: theme.spacing.md, borderRadius: theme.radius.xl }}>
            <Text style={{ fontSize: theme.typography.fontSize.xs.size, color: theme.colors.text.tertiary, fontFamily: theme.typography.fontFamily.medium }}>In Progress</Text>
            <Text style={{ fontSize: theme.typography.fontSize['2xl'].size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.warning, marginTop: theme.spacing.xs }}>{inProgressPosts}</Text>
          </Card>
          <Card variant="elevated" style={{ flex: 1, padding: theme.spacing.md, borderRadius: theme.radius.xl }}>
            <Text style={{ fontSize: theme.typography.fontSize.xs.size, color: theme.colors.text.tertiary, fontFamily: theme.typography.fontFamily.medium }}>Completed</Text>
            <Text style={{ fontSize: theme.typography.fontSize['2xl'].size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.success, marginTop: theme.spacing.xs }}>{completedPosts}</Text>
          </Card>
        </View>
        {pendingRequestsCount > 0 && (
          <Card variant="elevated" style={{ marginTop: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radius.xl, backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFE082' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="clipboard-alert-outline" size={20} color={theme.colors.warning} style={{ marginRight: theme.spacing.sm }} />
                <Text style={{ fontSize: theme.typography.fontSize.md.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.warning }}>
                  {pendingRequestsCount} pending request{pendingRequestsCount > 1 ? 's' : ''} awaiting review
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/citizen/my-posts')} style={{ paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, backgroundColor: theme.colors.warning, borderRadius: theme.radius.md }}>
                <Text style={{ color: theme.colors.text.inverse, fontSize: theme.typography.fontSize.sm.size, fontFamily: theme.typography.fontFamily.semiBold }}>Review</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      </View>
    );
  };

  const renderPrimaryAction = () => (
    <Card variant="elevated" style={{ marginHorizontal: theme.spacing.xl, marginBottom: theme.spacing.lg, borderRadius: theme.radius.xl }}>
      <View style={{ padding: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
          <View style={{ backgroundColor: theme.colors.mint[50], padding: theme.spacing.sm, borderRadius: theme.radius.md, marginRight: theme.spacing.md }}>
            <Feather name="refresh-cw" size={24} color={theme.colors.mint[500]} />
          </View>
          <Text style={{ fontSize: theme.typography.fontSize.lg.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text.primary, flex: 1 }}>
            Make recycling easier for everyone
          </Text>
        </View>
        <Text style={{ fontSize: theme.typography.fontSize.md.size, color: theme.colors.text.secondary, marginBottom: theme.spacing.lg }}>
          List your waste to help collectors and create a greener community
        </Text>
        <Button
          title="List Your Waste"
          variant="primary"
          size="md"
          onPress={openCreatePost}
          icon={<Feather name="plus" size={20} color={theme.colors.text.inverse} />}
          iconPosition="left"
          fullWidth
        />
      </View>
    </Card>
  );

  const renderSummarySkeleton = () => (
    <View style={{ paddingHorizontal: theme.spacing.xl, marginBottom: theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md }}>
        <Card variant="elevated" style={{ flex: 1, padding: theme.spacing.md, borderRadius: theme.radius.xl }}>
          <Skeleton width="80%" height={14} style={{ marginBottom: 4 }} />
          <Skeleton width="40%" height={24} />
        </Card>
        <Card variant="elevated" style={{ flex: 1, padding: theme.spacing.md, borderRadius: theme.radius.xl }}>
          <Skeleton width="80%" height={14} style={{ marginBottom: 4 }} />
          <Skeleton width="40%" height={24} />
        </Card>
        <Card variant="elevated" style={{ flex: 1, padding: theme.spacing.md, borderRadius: theme.radius.xl }}>
          <Skeleton width="80%" height={14} style={{ marginBottom: 4 }} />
          <Skeleton width="40%" height={24} />
        </Card>
      </View>
    </View>
  );

  const renderRecentPostsSkeleton = () => (
    <View style={{ paddingHorizontal: theme.spacing.xl, marginBottom: theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <Text style={{ fontSize: theme.typography.fontSize.lg.size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text.primary }}>Your Recent Posts</Text>
        <TouchableOpacity onPress={() => router.push('/citizen/my-posts')}>
          <Text style={{ fontSize: theme.typography.fontSize.md.size, color: theme.colors.emerald[600], fontFamily: theme.typography.fontFamily.semiBold }}>View All</Text>
        </TouchableOpacity>
      </View>
      <ListSkeleton count={3} />
    </View>
  );

  const renderRecentPosts = () => {
    const recentPosts = myPosts.slice(0, 3);

    return (
      <View style={{ paddingHorizontal: theme.spacing.xl, marginBottom: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
          <Text style={{ fontSize: theme.typography.fontSize.lg.size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text.primary }}>Your Recent Posts</Text>
          <TouchableOpacity onPress={() => router.push('/citizen/my-posts')}>
            <Text style={{ fontSize: theme.typography.fontSize.md.size, color: theme.colors.emerald[600], fontFamily: theme.typography.fontFamily.semiBold }}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={{ gap: theme.spacing.md }}>
          {recentPosts.map((post, index) => {
            // Show skeleton for 3 items when loading, otherwise show actual posts
            if (isInitialLoad && index < 3) {
              return (
                <React.Fragment key={`skeleton-${index}`}>
                  <Card variant="elevated" style={{ backgroundColor: theme.colors.canvas.primary, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border.default, overflow: 'hidden' }}>
                    <View style={{ flexDirection: 'row', padding: theme.spacing.md }}>
                      <Skeleton width={60} height={60} borderRadius={theme.radius.md} />
                      <View style={{ marginLeft: theme.spacing.md, flex: 1, gap: 8 }}>
                        <Skeleton width="80%" height={20} />
                        <Skeleton width="40%" height={16} />
                        <Skeleton width="60%" height={14} />
                      </View>
                    </View>
                  </Card>
                </React.Fragment>
              );
            }

            const status = getPostStatus(post);
            const statusStyle = POST_STATUS_STYLES[status as keyof typeof POST_STATUS_STYLES] || POST_STATUS_STYLES.OPEN;
            const total = post.quantity ?? 0;
            const reserved = post.reserved_quantity ?? 0;
            const collected = post.collected_quantity ?? 0;
            const available = Math.max(0, total - reserved - collected);
            const unit = getQuantityUnit(post.category || '');

            let rawUrl = post.images?.[0]?.url?.trim();
            if (!rawUrl) {
              rawUrl = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80';
            } else if (rawUrl.includes('cloudinary.com') && rawUrl.startsWith('http://')) {
              rawUrl = rawUrl.replace('http://', 'https://');
            }

            return (
              <TouchableOpacity
                key={post.id}
                activeOpacity={0.8}
                onPress={() => router.push(`/citizen/${post.id}`)}
                style={{ backgroundColor: theme.colors.canvas.primary, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border.default, overflow: 'hidden', ...theme.shadows.sm }}
              >
                <View style={{ flexDirection: 'row', padding: theme.spacing.md }}>
                  <View style={{ width: 60, height: 60, borderRadius: theme.radius.md, backgroundColor: theme.colors.canvas.tertiary, overflow: 'hidden' }}>
                    <View style={{ flex: 1 }}><Image source={{ uri: rawUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /></View>
                  </View>
                  <View style={{ marginLeft: theme.spacing.md, flex: 1, justifyContent: 'space-between' }}>
                    <View>
                      <Text numberOfLines={1} style={{ fontSize: theme.typography.fontSize.md.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text.primary }}>
                        {post.title}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs }}>
                        <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: theme.spacing.xs, paddingVertical: 2, borderRadius: theme.radius.sm }}>
                          <Text style={{ fontSize: theme.typography.fontSize.xs.size, color: statusStyle.text, fontFamily: theme.typography.fontFamily.medium }}>
                            {statusStyle.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ marginTop: theme.spacing.xs, color: theme.colors.text.secondary, fontSize: theme.typography.fontSize.sm.size }}>
                        {available} / {total} {unit} available
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const isInitialLoad = loading && !refreshing;

  if (isInitialLoad) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas.secondary }}>
        {renderHeader()}
        {renderSummarySkeleton()}
        {renderPrimaryAction()}
        {renderRecentPostsSkeleton()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas.secondary }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.emerald[500]} />}
      >
        {renderHeader()}
        {renderSummary()}
        {renderPrimaryAction()}
        {renderRecentPosts()}
      </ScrollView>
    </SafeAreaView>
  );
}