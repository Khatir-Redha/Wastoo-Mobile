import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Image, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router'; // <-- Added this import
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import PostService, { Post } from "../../../../services/post.service"; // Adjust path

// Helper to pick the right icon based on material
const getCategoryIcon = (category: string) => {
  const cat = category?.toLowerCase();
  if (cat === 'plastic') return 'recycle';
  if (cat === 'paper') return 'archive-outline';
  if (cat === 'metal') return 'trash-can-outline';
  if (cat === 'glass') return 'bottle-wine-outline';
  if (cat === 'organic') return 'leaf';
  return 'recycle'; // default
};

// Helper to format dates
const timeAgo = (dateString?: string) => {
  if (!dateString) return 'Posted recently';
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `Posted ${interval}d ago`;
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `Posted ${interval}h ago`;
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `Posted ${interval}m ago`;
  
  return 'Just now';
};

export default function ActivityScreen() {
  const router = useRouter(); // <-- Initialized the router

  const [activeTab, setActiveTab] = useState<'posts' | 'transactions'>('posts');
  const [activeStatus, setActiveStatus] = useState<'open' | 'claimed' | 'completed'>('open');
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyPosts();
  }, []);

  const fetchMyPosts = async () => {
    setIsLoading(true);
    try {
      const myData = await PostService.getMyPosts();
      setPosts(myData || []);
    } catch (error) {
      console.error("Failed to fetch activity:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    const status = post.status?.toLowerCase() || 'open';
    return status === activeStatus;
  });

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
            onPress={() => setActiveTab('transactions')}
            className="flex-1 items-center justify-center rounded-full"
            style={activeTab === 'transactions' ? { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 } : {}}
          >
            <Text className={`text-[14px] ${activeTab === 'transactions' ? 'text-[#1E5631] font-semibold' : 'text-[#6D7A6E] font-medium'}`}>
              Transactions
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
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

          {/* Posts List */}
          <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100, gap: 16 }} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#27AE60" className="mt-10" />
            ) : filteredPosts.length === 0 ? (
              <View className="items-center justify-center mt-10">
                <Text className="text-[#6D7A6E]">No {activeStatus} posts found.</Text>
              </View>
            ) : (
              filteredPosts.map((post) => {
                
                let rawUrl = post.images?.[0]?.url?.trim();

              // 2. Fallback if empty
              if (!rawUrl) {
                rawUrl =
                  "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80";
              } else if (
                rawUrl.includes("cloudinary.com") &&
                rawUrl.startsWith("http://")
              ) {
                rawUrl = rawUrl.replace("http://", "https://");
              }

              const displayImage = rawUrl;

                return (
                  // <-- Changed View to TouchableOpacity and added the route push
                  <TouchableOpacity 
                    key={post.id} 
                    activeOpacity={0.7}
                    onPress={() => router.push(`/citizen/${post.id}/update-post`)}
                    className="bg-white border border-[#ECECEC] rounded-[16px] p-3 flex-row items-center"
                  >
                    <Image source={{ uri: displayImage }} className="w-16 h-16 rounded-[8px] bg-[#F9F9F9]" resizeMode="cover" />
                    <View className="flex-1 ml-4 justify-center">
                      <Text className="font-semibold text-[14px] text-[#1b1c1c] mb-1" numberOfLines={1}>
                        {(post as any).title || 'Untitled Listing'}
                      </Text>
                      <View className="flex-row items-center mb-1">
                        <MaterialCommunityIcons name={getCategoryIcon(post.category || '')} size={14} color="#6D7A6E" />
                        <Text className="text-[12px] text-[#6D7A6E] ml-1">
                          {post.category?.charAt(0).toUpperCase() + (post.category?.slice(1) || '') || 'Material'} • {(post as any).quantity || 0} kg
                        </Text>
                      </View>
                      <Text className="text-[10px] text-[#6D7A6E]">{timeAgo(post.createdAt)}</Text>
                    </View>
                    <View className="h-16 justify-between items-end ml-2">
                      <View className="bg-[#E8F8EE] px-2 py-1 rounded-md">
                        <Text className="text-[#1E5631] text-[10px] font-semibold uppercase tracking-wider">{post.status || 'Open'}</Text>
                      </View>
                      <View className="p-1 -mr-1">
                        <MaterialIcons name="chevron-right" size={20} color="#6D7A6E" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : (
        /* Completed Transactions Tab from HTML */
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          
          {/* Summary Strip */}
          <View className="bg-[#F9F9F9] border border-[#ECECEC] rounded-[16px] p-4 flex-row justify-between items-center mb-6 mt-2">
            <Text className="text-[#1b1c1c] font-medium text-[16px]">Total Earned</Text>
            <Text className="text-[#9A7B0F] font-bold text-[24px]">$1,245.00</Text>
          </View>

          <View className="flex-col gap-4">
            
            {/* Sale Item */}
            <View className="flex-row items-center justify-between py-3 border-b border-[#ECECEC]">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-[#fcf8ec] items-center justify-center mr-3">
                  <MaterialIcons name="attach-money" size={24} color="#9A7B0F" />
                </View>
                <View>
                  <Text className="font-semibold text-[14px] text-[#1b1c1c]">Scrap Aluminum sold</Text>
                  <Text className="text-[12px] text-[#6D7A6E] mt-0.5">Today, 10:30 AM</Text>
                </View>
              </View>
              <Text className="text-[#9A7B0F] font-semibold text-[16px]">+$45.00</Text>
            </View>

            {/* Giveaway Item */}
            <View className="flex-row items-center justify-between py-3 border-b border-[#ECECEC]">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-[#E8F8EE] items-center justify-center mr-3">
                  <MaterialIcons name="eco" size={22} color="#1E5631" />
                </View>
                <View>
                  <Text className="font-semibold text-[14px] text-[#1b1c1c]">Cardboard donated</Text>
                  <Text className="text-[12px] text-[#6D7A6E] mt-0.5">Yesterday, 2:15 PM</Text>
                </View>
              </View>
              <View className="bg-[#E8F8EE] px-2 py-1 rounded">
                <Text className="text-[#1E5631] font-semibold text-[12px]">Donated</Text>
              </View>
            </View>

            {/* Cash-out Item */}
            <View className="flex-row items-center justify-between py-3 border-b border-[#ECECEC]">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-[#F9F9F9] border border-[#ECECEC] items-center justify-center mr-3">
                  <MaterialIcons name="account-balance-wallet" size={22} color="#1E5631" />
                </View>
                <View>
                  <Text className="font-semibold text-[14px] text-[#1b1c1c]">Cashed out to bank</Text>
                  <Text className="text-[12px] text-[#6D7A6E] mt-0.5">Nov 12, 09:00 AM</Text>
                </View>
              </View>
              <Text className="text-[#2B2B2B] font-semibold text-[16px]">-$30.00</Text>
            </View>

          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}