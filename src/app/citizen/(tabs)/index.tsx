import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import PostService, { Post } from '../../../../services/post.service';
import NotificationBell from '../../../components/NotificationBell';
import { useAuth } from '../../../../context/AuthProvider';
import { theme } from '../../../theme/tokens';
import { Button, Card, Input } from '../../../components/ui';

const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'view-grid' },
  { id: 'plastic', name: 'Plastic', icon: 'recycle' },
  { id: 'organic', name: 'Organic', icon: 'leaf' },
  { id: 'glass', name: 'Glass', icon: 'bottle-wine-outline' },
  { id: 'metal', name: 'Metal', icon: 'cube-scan' },
];

const getCategoryIcon = (categoryId?: string) => {
  const cat = CATEGORIES.find((c) => c.id === categoryId?.toLowerCase());
  return cat ? cat.icon : 'package-variant-closed';
};

export default function BrowseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const query: any = {};
        if (activeCategory !== 'all') query.category = activeCategory;
        if (searchTerm.trim()) query.search = searchTerm;
        const response = await PostService.getAllPosts(query);
        const postsArray = Array.isArray(response) ? response : (response?.data || []);
        setPosts(postsArray);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, [activeCategory, searchTerm]);

  const renderHeader = () => {
    const firstName = user?.name?.split(' ')[0] || 'Friend';
    return (
      <View style={{ paddingHorizontal: theme.spacing.xl, paddingTop: Platform.OS === 'ios' ? 20 : 44, paddingBottom: theme.spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: theme.typography.fontSize['2xl'].size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text.primary, marginBottom: theme.spacing.xs }}>
            Hello, {firstName}!
          </Text>
          <Text style={{ fontSize: theme.typography.fontSize.md.size, color: theme.colors.text.secondary }}>
            Find waste materials near you
          </Text>
        </View>
        <NotificationBell />
      </View>
    );
  };

  const renderPrimaryAction = () => {
    return (
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
            onPress={() => router.push('/create-post')}
            icon={<Feather name="plus" size={20} color={theme.colors.text.inverse} />}
            iconPosition="left"
            fullWidth
          />
        </View>
      </Card>
    );
  };

  const renderSearchBar = () => {
    return (
      <View style={{ marginHorizontal: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        <Input
          placeholder="Search materials, locations..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          icon="search"
        />
      </View>
    );
  };

  const renderCategories = () => {
    return (
      <View style={{ marginBottom: theme.spacing.md, paddingBottom: theme.spacing.sm }}>
        <Text style={{ fontSize: theme.typography.fontSize.md.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text.primary, marginHorizontal: theme.spacing.xl, marginBottom: theme.spacing.md }}>
          Categories
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: theme.spacing.xl }}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={{
                  marginRight: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.lg,
                  borderRadius: theme.radius.md,
                  backgroundColor: isActive ? theme.colors.emerald[500] : theme.colors.canvas.primary,
                  borderWidth: isActive ? 0 : 1,
                  borderColor: theme.colors.border.default,
                  flexDirection: 'row',
                  alignItems: 'center',
                  ...theme.shadows.sm,
                }}
              >
                <MaterialCommunityIcons name={cat.icon as any} size={20} color={isActive ? theme.colors.text.inverse : theme.colors.emerald[500]} />
                <Text style={{ marginLeft: theme.spacing.sm, fontSize: theme.typography.fontSize.md.size, color: isActive ? theme.colors.text.inverse : theme.colors.text.primary, fontFamily: theme.typography.fontFamily.medium }}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderPostCard = (post: Post) => {
    let rawUrl = post.images?.[0]?.url?.trim();
    if (!rawUrl) {
      rawUrl = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80';
    } else if (rawUrl.includes('cloudinary.com') && rawUrl.startsWith('http://')) {
      rawUrl = rawUrl.replace('http://', 'https://');
    }
    const displayImage = rawUrl;
    const weight = (post as any).weight || 'TBD kg';
    const isFree = (post as any).price === 0 || !(post as any).price;
    const badgeText = isFree ? 'FREE' : '$' + (post as any).price;
    const formattedDate = post.createdAt
      ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'Recent';

    return (
      <TouchableOpacity
        key={post.id}
        activeOpacity={0.8}
        onPress={() => router.push('/citizen/' + post.id)}
        style={{
          width: '48%',
          marginRight: '2%',
          marginBottom: theme.spacing.md,
          backgroundColor: theme.colors.canvas.primary,
          borderRadius: theme.radius.xl,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.colors.border.light,
          ...theme.shadows.md,
        }}
      >
        <View style={{ aspectRatio: 16/9, backgroundColor: theme.colors.canvas.tertiary }}>
          <Image source={{ uri: displayImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: theme.colors.mint[500], paddingHorizontal: theme.spacing.xs, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.sm }}>
            <MaterialCommunityIcons name={getCategoryIcon(post.category) as any} size={14} color={theme.colors.text.inverse} />
          </View>
          <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: isFree ? theme.colors.success : theme.colors.warning, paddingHorizontal: theme.spacing.xs, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.sm }}>
            <Text style={{ fontSize: theme.typography.fontSize.xs.size, color: theme.colors.text.inverse, fontFamily: theme.typography.fontFamily.medium }}> {badgeText} </Text>
          </View>
        </View>
        <View style={{ padding: theme.spacing.md }}>
          <Text numberOfLines={1} style={{ fontSize: theme.typography.fontSize.md.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text.primary, marginBottom: theme.spacing.xs }}>
            {(post as any).title || 'Untitled Material'}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="map-pin" size={12} color={theme.colors.text.quaternary} />
              <Text style={{ marginLeft: theme.spacing.xs, fontSize: theme.typography.fontSize.sm.size, color: theme.colors.text.secondary }}>
                {(post as any).location || 'Unknown'}
              </Text>
            </View>
            <Text style={{ fontSize: theme.typography.fontSize.sm.size, color: theme.colors.text.tertiary }}>
              {formattedDate}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas.secondary }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderPrimaryAction()}
        {renderSearchBar()}
        {renderCategories()}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={theme.colors.emerald[500]} />
          </View>
        ) : posts.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
            <View style={{ alignItems: 'center', paddingHorizontal: theme.spacing.xl }}>
              <Feather name="refresh-cw" size={64} color={theme.colors.mint[500]} />
              <Text style={{ fontSize: theme.typography.fontSize.lg.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text.primary, marginTop: theme.spacing.lg, textAlign: 'center' }}>
                No materials found
              </Text>
              <Text style={{ fontSize: theme.typography.fontSize.md.size, color: theme.colors.text.secondary, marginTop: theme.spacing.sm, textAlign: 'center' }}>
                Try changing categories or search for something else
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: theme.spacing.lg, flexDirection: 'row', flexWrap: 'wrap' }}>
            {posts.map(renderPostCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
