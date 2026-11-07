import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ActivityIndicator, ScrollView, RefreshControl, SafeAreaView, Platform, TouchableOpacity, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import PostService, { Post } from '../../../../services/post.service';
import { useAuth } from '../../../../context/AuthProvider';
import { theme } from '../../../theme/tokens';
import { Button, Input } from '../../../components/ui';
import BadgesButton from '../../../components/BadgesButton';
import NotificationBell from '../../../components/NotificationBell';
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

export default function CitizenMyPostsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'Supplier';
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'in_progress' | 'completed'>('all');

  // Shared pending requests summary
  const { summary } = usePendingRequestsSummary();
  const pendingByPost = summary.perPost;

  const fetchPosts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const myPosts = await PostService.getMyPosts();
      setPosts(myPosts);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPosts(true); }, [fetchPosts]);

  const onRefresh = () => { setRefreshing(true); fetchPosts(true); };

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const status = getPostStatus(post);
      if (activeFilter === 'open') return status === 'OPEN';
      if (activeFilter === 'in_progress') return status === 'CLAIMED';
      if (activeFilter === 'completed') return status === 'COMPLETED' || status === 'DELETED';
      return true;
    }).filter(post => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return [post.title, post.description, post.address].filter(Boolean).some(v => v?.toLowerCase().includes(term));
    });
  }, [posts, activeFilter, search]);

  const renderPostCard = (post: Post) => {
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

    // Get pending count from shared summary
    const pendingCount = pendingByPost.get(post.id) ?? 0;

    return (
      <TouchableOpacity
        key={post.id}
        activeOpacity={0.8}
        onPress={() => router.push(`/citizen/${post.id}`)}
        style={{ marginBottom: theme.spacing.md, backgroundColor: theme.colors.canvas.primary, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border.default, overflow: 'hidden', ...theme.shadows.sm }}
      >
        <View style={{ flexDirection: 'row', padding: theme.spacing.md }}>
          <View style={{ width: 80, height: 80, borderRadius: theme.radius.md, backgroundColor: theme.colors.canvas.tertiary, overflow: 'hidden' }}>
            <View style={{ flex: 1 }}><Image source={{ uri: rawUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /></View>
          </View>
          <View style={{ marginLeft: theme.spacing.md, flex: 1, justifyContent: 'space-between' }}>
            <View>
              <Text numberOfLines={1} style={{ fontSize: theme.typography.fontSize.md.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text.primary }}>
                {post.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs }}>
                <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: theme.spacing.xs, paddingVertical: 2, borderRadius: theme.radius.sm, marginRight: theme.spacing.sm }}>
                  <Text style={{ fontSize: theme.typography.fontSize.xs.size, color: statusStyle.text, fontFamily: theme.typography.fontFamily.medium }}>
                    {statusStyle.label}
                  </Text>
                </View>
                {pendingCount > 0 && (
                  <View style={{ backgroundColor: theme.colors.info, paddingHorizontal: theme.spacing.xs, paddingVertical: 2, borderRadius: theme.radius.sm }}>
                    <Text style={{ fontSize: theme.typography.fontSize.xs.size, color: theme.colors.text.inverse, fontFamily: theme.typography.fontFamily.medium }}>
                      {pendingCount > 9 ? '9+' : pendingCount} pending
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ marginTop: theme.spacing.xs, color: theme.colors.text.secondary, fontSize: theme.typography.fontSize.sm.size }}>
                {available} / {total} {unit} available
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Error/Empty content component - rendered as list items
  const renderError = () => (
    <View style={{ alignItems: 'center', paddingHorizontal: theme.spacing.xl, paddingVertical: 40 }}>
      <Feather name="wifi-off" size={48} color={theme.colors.text.tertiary} />
      <Text style={{ marginTop: theme.spacing.md, color: theme.colors.text.primary, fontFamily: theme.typography.fontFamily.semiBold }}>Could not load posts</Text>
      <Text style={{ marginTop: theme.spacing.xs, color: theme.colors.text.secondary, textAlign: 'center' }}>{error}</Text>
      <Button title="Try again" variant="primary" size="sm" onPress={() => fetchPosts()} style={{ marginTop: theme.spacing.lg }} />
    </View>
  );

  const renderEmpty = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
      <View style={{ alignItems: 'center', paddingHorizontal: theme.spacing.xl }}>
        <Feather name="package" size={64} color={theme.colors.mint[500]} />
        <Text style={{ fontSize: theme.typography.fontSize.lg.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text.primary, marginTop: theme.spacing.lg, textAlign: 'center' }}>
          {posts.length === 0 ? 'No posts yet' : 'No posts match your filters'}
        </Text>
        <Text style={{ fontSize: theme.typography.fontSize.md.size, color: theme.colors.text.secondary, marginTop: theme.spacing.sm, textAlign: 'center' }}>
          {posts.length === 0 ? 'List your first waste material' : 'Try changing filters'}
        </Text>
        {posts.length === 0 && (
          <Button title="List Your Waste" variant="primary" size="md" onPress={() => router.push('/citizen/create-post')} style={{ marginTop: theme.spacing.lg }} />
        )}
      </View>
    </View>
  );

  // Header component for FlatList
  const renderListHeader = () => (
    <View>
      <View style={{ paddingHorizontal: theme.spacing.xl, paddingTop: Platform.OS === 'ios' ? 20 : 44, paddingBottom: theme.spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: theme.typography.fontSize['2xl'].size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text.primary, marginBottom: theme.spacing.xs }}>
            Hello, {firstName}!
          </Text>
          <Text style={{ fontSize: theme.typography.fontSize.md.size, color: theme.colors.text.secondary }}>
            Your waste listings
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.push('/citizen/create-post')} style={{ marginRight: theme.spacing.md }}>
            <Feather name="plus" size={24} color={theme.colors.emerald[500]} />
          </TouchableOpacity>
          <BadgesButton />
          <NotificationBell />
        </View>
      </View>
      <View style={{ marginHorizontal: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        <Input
          placeholder="Search your posts..."
          value={search}
          onChangeText={setSearch}
          icon="search"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.md }}>
        {[
          { id: 'all', label: 'Open' },
          { id: 'open', label: 'In Progress' },
          { id: 'completed', label: 'Completed' },
        ].map(filter => {
          const isActive = activeFilter === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              onPress={() => setActiveFilter(filter.id as any)}
              style={{
                marginRight: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.lg,
                borderRadius: theme.radius.md,
                backgroundColor: isActive ? theme.colors.emerald[500] : theme.colors.canvas.primary,
                borderWidth: isActive ? 0 : 1,
                borderColor: theme.colors.border.default,
                ...theme.shadows.sm,
              }}
            >
              <Text style={{ fontSize: theme.typography.fontSize.md.size, color: isActive ? theme.colors.text.inverse : theme.colors.text.primary, fontFamily: theme.typography.fontFamily.medium }}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas.secondary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.emerald[500]} />
        </View>
      </SafeAreaView>
    );
  }

  // If error, show error screen
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas.secondary }}>
        {renderError()}
      </SafeAreaView>
    );
  }

  // If no posts, show empty screen
  if (filteredPosts.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas.secondary }}>
        {renderEmpty()}
      </SafeAreaView>
    );
  }

  // Main FlatList with header
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas.secondary }}>
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => renderPostCard(item)}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.emerald[500]} />
        }
      />
    </SafeAreaView>
  );
}