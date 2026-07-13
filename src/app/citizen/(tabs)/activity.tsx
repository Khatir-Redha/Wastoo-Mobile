import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Image, 
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import PostService, { Post } from "../../../../services/post.service";
import PickupService, { Pickup, PickupStatus } from '../../../../services/pickup.service';

// Helper: icon per category
const getCategoryIcon = (category: string) => {
  const cat = category?.toLowerCase();
  if (cat === 'plastic') return 'recycle';
  if (cat === 'paper') return 'archive-outline';
  if (cat === 'metal') return 'trash-can-outline';
  if (cat === 'glass') return 'bottle-wine-outline';
  if (cat === 'organic') return 'leaf';
  return 'recycle';
};

// Helper: time ago
const timeAgo = (dateString?: string) => {
  if (!dateString) return 'Posted recently';
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval}d ago`;
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval}h ago`;
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval}m ago`;
  return 'Just now';
};

// Pickup status badge colors
const getStatusStyle = (status: string) => {
  switch (status) {
    case 'PENDING':    return { bg: '#FFF8E1', text: '#F59E0B' };
    case 'ASSIGNED':   return { bg: '#EFF6FF', text: '#3B82F6' };
    case 'IN_TRANSIT': return { bg: '#F5F3FF', text: '#8B5CF6' };
    case 'COMPLETED':  return { bg: '#E8F8EE', text: '#1E5631' };
    case 'CANCELED':   return { bg: '#FEF2F2', text: '#EF4444' };
    default:           return { bg: '#F4F4F4', text: '#6D7A6E' };
  }
};

const formatStatus = (s: string) => s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function ActivityScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'posts' | 'pickups'>('posts');
  const [activeStatus, setActiveStatus] = useState<'open' | 'claimed' | 'completed'>('open');

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // Pickups state
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [pickupsLoading, setPickupsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Add-pickup modal state
  const [showPostModal, setShowPostModal] = useState(false);
  const [openPosts, setOpenPosts] = useState<Post[]>([]);
  const [openPostsLoading, setOpenPostsLoading] = useState(false);

  // Fetch posts once
  useEffect(() => {
    fetchMyPosts();
  }, []);

  // Fetch pickups when tab switches to pickups
  useEffect(() => {
    if (activeTab === 'pickups') fetchMyPickups();
  }, [activeTab]);

  const fetchMyPosts = async () => {
    setPostsLoading(true);
    try {
      const data = await PostService.getMyPosts();
      setPosts(data || []);
    } catch (e) {
      console.error('Failed to fetch posts:', e);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchMyPickups = async () => {
    setPickupsLoading(true);
    try {
      const data = await PickupService.getMyPickups();
      setPickups(data || []);
    } catch (e) {
      console.error('Failed to fetch pickups:', e);
    } finally {
      setPickupsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'posts') await fetchMyPosts();
    else await fetchMyPickups();
    setRefreshing(false);
  }, [activeTab]);

  const filteredPosts = posts.filter(p => (p.status?.toLowerCase() || 'open') === activeStatus);

  // Open the "select a post" modal
  const handleAddPickup = async () => {
    setShowPostModal(true);
    setOpenPostsLoading(true);
    try {
      const allMyPosts = await PostService.getMyPosts();
      // Only show posts that are OPEN (not completed/deleted/claimed)
      const open = (allMyPosts || []).filter(p => (p.status || '').toLowerCase() === 'open');
      setOpenPosts(open);
    } catch (e) {
      setOpenPosts([]);
    } finally {
      setOpenPostsLoading(false);
    }
  };

  // Navigate to that post's existing pickup (auto-created by backend on post creation)
  const handleSelectPost = async (post: Post) => {
    setShowPostModal(false);
    try {
      // The pickup for this post was already created by the backend.
      // Fetch all pickups and find the one matching this post.
      const allPickups = await PickupService.getAllPickups();
      const match = allPickups.find((p: Pickup) => p.post_id === post.id);
      if (match) {
        router.push(`/pickups/${match.id}`);
      } else {
        // Navigate to create screen as fallback (if no pickup found)
        router.push(`/pickups/create?post_id=${post.id}`);
      }
    } catch (e) {
      router.push(`/pickups/create?post_id=${post.id}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      {/* Header */}
      <View className="px-5 pt-6 pb-4 bg-white z-10">
        <Text className="text-[24px] font-bold text-[#1E5631]">Activity</Text>

        {/* Main Segmented Control */}
        <View className="flex-row mt-4 bg-[#F9F9F9] rounded-full p-1 h-12">
          <TouchableOpacity
            onPress={() => setActiveTab('posts')}
            className="flex-1 items-center justify-center rounded-full"
            style={activeTab === 'posts' ? { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 } : {}}
          >
            <Text className={`text-[14px] ${activeTab === 'posts' ? 'text-[#1E5631] font-semibold' : 'text-[#6D7A6E] font-medium'}`}>
              My Posts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('pickups')}
            className="flex-1 items-center justify-center rounded-full"
            style={activeTab === 'pickups' ? { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 } : {}}
          >
            <Text className={`text-[14px] ${activeTab === 'pickups' ? 'text-[#1E5631] font-semibold' : 'text-[#6D7A6E] font-medium'}`}>
              My Pickups
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─────────── POSTS TAB ─────────── */}
      {activeTab === 'posts' ? (
        <View className="flex-1">
          {/* Sub-filters */}
          <View className="flex-row px-5 border-b border-[#ECECEC] mb-4">
            {(['open', 'claimed', 'completed'] as const).map((status) => {
              const isActive = activeStatus === status;
              const count = posts.filter(p => (p.status?.toLowerCase() || 'open') === status).length;
              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => setActiveStatus(status)}
                  className={`mr-6 pb-3 border-b-[3px] ${isActive ? 'border-[#27AE60]' : 'border-transparent'}`}
                >
                  <Text className={`text-[14px] ${isActive ? 'text-[#1E5631] font-semibold' : 'text-[#6D7A6E] font-medium'}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingBottom: 100, gap: 16 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#27AE60" />}
          >
            {postsLoading ? (
              <ActivityIndicator size="large" color="#27AE60" className="mt-10" />
            ) : filteredPosts.length === 0 ? (
              <View className="items-center justify-center mt-10">
                <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#ECECEC" />
                <Text className="text-[#6D7A6E] mt-3">No {activeStatus} posts found.</Text>
              </View>
            ) : (
              filteredPosts.map((post) => {
                let rawUrl = post.images?.[0]?.url?.trim();
                if (!rawUrl) {
                  rawUrl = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80";
                } else if (rawUrl.includes("cloudinary.com") && rawUrl.startsWith("http://")) {
                  rawUrl = rawUrl.replace("http://", "https://");
                }

                return (
                  <TouchableOpacity
                    key={post.id}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/citizen/${post.id}/update-post`)}
                    className="bg-white border border-[#ECECEC] rounded-[16px] p-3 flex-row items-center"
                  >
                    <Image source={{ uri: rawUrl }} className="w-16 h-16 rounded-[8px] bg-[#F9F9F9]" resizeMode="cover" />
                    <View className="flex-1 ml-4 justify-center">
                      <Text className="font-semibold text-[14px] text-[#1b1c1c] mb-1" numberOfLines={1}>
                        {(post as any).title || 'Untitled Listing'}
                      </Text>
                      <View className="flex-row items-center mb-1">
                        <MaterialCommunityIcons name={getCategoryIcon(post.category || '')} size={14} color="#6D7A6E" />
                        <Text className="text-[12px] text-[#6D7A6E] ml-1">
                          {post.category?.charAt(0).toUpperCase() + (post.category?.slice(1) || '')} • {(post as any).quantity || 0} kg
                        </Text>
                      </View>
                      <Text className="text-[10px] text-[#6D7A6E]">{timeAgo(post.createdAt)}</Text>
                    </View>
                    <View className="h-16 justify-between items-end ml-2">
                      <View className="bg-[#E8F8EE] px-2 py-1 rounded-md">
                        <Text className="text-[#1E5631] text-[10px] font-semibold uppercase tracking-wider">{post.status || 'Open'}</Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color="#6D7A6E" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

      ) : (
        /* ─────────── PICKUPS TAB ─────────── */
        <View className="flex-1">
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 8, gap: 12 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#27AE60" />}
          >
            {pickupsLoading ? (
              <ActivityIndicator size="large" color="#27AE60" style={{ marginTop: 40 }} />
            ) : pickups.length === 0 ? (
              <View className="items-center justify-center mt-16">
                <MaterialCommunityIcons name="truck-outline" size={56} color="#ECECEC" />
                <Text className="text-[#6D7A6E] font-medium text-[16px] mt-4">No pickup requests found.</Text>
                <Text className="text-[#B0B0B0] text-[13px] mt-1 text-center px-6">
                  Tap "Add Pickup" below to create one from your posts.
                </Text>
              </View>
            ) : (
              pickups.map((pickup) => {
                const statusStyle = getStatusStyle(pickup.status);
                return (
                  <TouchableOpacity
                    key={pickup.id}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/pickups/${pickup.id}`)}
                    className="bg-white border border-[#ECECEC] rounded-[18px] p-4"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}
                  >
                    <View className="flex-row justify-between items-center mb-3">
                      <View className="flex-row items-center">
                        <View className="w-9 h-9 bg-[#E8F8EE] rounded-full items-center justify-center mr-3">
                          <MaterialCommunityIcons name="truck-delivery-outline" size={18} color="#1E5631" />
                        </View>
                        <Text className="font-semibold text-[15px] text-[#1b1c1c]">
                          Pickup #{pickup.id}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: statusStyle.bg }} className="px-3 py-1 rounded-full">
                        <Text style={{ color: statusStyle.text }} className="text-[11px] font-bold tracking-wide">
                          {formatStatus(pickup.status)}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center mb-1.5">
                      <Feather name="package" size={13} color="#8A8F87" />
                      <Text className="text-[13px] text-[#6D7A6E] ml-2">Post #{pickup.post_id}</Text>
                    </View>

                    <View className="flex-row items-center mb-1.5">
                      <Feather name="calendar" size={13} color="#8A8F87" />
                      <Text className="text-[13px] text-[#6D7A6E] ml-2">
                        {pickup.scheduled_date
                          ? new Date(pickup.scheduled_date).toLocaleDateString()
                          : 'Not scheduled yet'}
                        {pickup.start_time ? ` · ${pickup.start_time} - ${pickup.end_time}` : ''}
                      </Text>
                    </View>

                    {pickup.collector_id && (
                      <View className="flex-row items-center mt-2 pt-2 border-t border-[#F0F0F0]">
                        <Feather name="user" size={13} color="#8A8F87" />
                        <Text className="text-[13px] text-[#6D7A6E] ml-2">Collector assigned</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Add Pickup Button */}
          <View className="px-5 pb-6 pt-3 bg-white border-t border-[#F0F0F0]">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleAddPickup}
              className="w-full bg-[#1E5631] h-[54px] rounded-full flex-row items-center justify-center"
              style={{ shadowColor: '#1E5631', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 }}
            >
              <Feather name="plus" size={20} color="white" />
              <Text className="text-white text-[16px] font-bold ml-2">Add Pickup</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─────────── SELECT POST MODAL ─────────── */}
      <Modal visible={showPostModal} transparent animationType="slide" onRequestClose={() => setShowPostModal(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-[32px] px-5 pt-6 pb-10" style={{ maxHeight: '75%' }}>
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-[20px] font-bold text-[#1b1c1c]">Select a Post</Text>
              <TouchableOpacity onPress={() => setShowPostModal(false)} className="w-8 h-8 items-center justify-center bg-[#F4F4F4] rounded-full">
                <Feather name="x" size={18} color="#1b1c1c" />
              </TouchableOpacity>
            </View>

            <Text className="text-[14px] text-[#6D7A6E] mb-5">
              Choose one of your open posts to view or manage its pickup request.
            </Text>

            {openPostsLoading ? (
              <ActivityIndicator size="large" color="#27AE60" style={{ marginVertical: 40 }} />
            ) : openPosts.length === 0 ? (
              <View className="items-center py-10">
                <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#ECECEC" />
                <Text className="text-[#6D7A6E] mt-3 text-center">No open posts found.</Text>
                <Text className="text-[#B0B0B0] text-[12px] mt-1 text-center">Create a post first to request a pickup.</Text>
              </View>
            ) : (
              <FlatList
                data={openPosts}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View className="h-3" />}
                renderItem={({ item }) => {
                  let rawUrl = item.images?.[0]?.url?.trim();
                  if (!rawUrl) rawUrl = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80";
                  else if (rawUrl.includes("cloudinary.com") && rawUrl.startsWith("http://")) rawUrl = rawUrl.replace("http://", "https://");

                  return (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleSelectPost(item)}
                      className="flex-row items-center bg-[#F9F9F9] border border-[#ECECEC] rounded-[16px] p-3"
                    >
                      <Image source={{ uri: rawUrl }} className="w-14 h-14 rounded-[10px] bg-[#EAEAEA]" resizeMode="cover" />
                      <View className="flex-1 ml-3">
                        <Text className="font-semibold text-[14px] text-[#1b1c1c] mb-0.5" numberOfLines={1}>
                          {(item as any).title || 'Untitled Listing'}
                        </Text>
                        <Text className="text-[12px] text-[#6D7A6E]">
                          {item.category} · {(item as any).quantity || 0} kg
                        </Text>
                      </View>
                      <View className="w-8 h-8 bg-[#E8F8EE] rounded-full items-center justify-center">
                        <Feather name="arrow-right" size={16} color="#1E5631" />
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}