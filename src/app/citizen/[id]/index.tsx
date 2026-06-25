import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import PostService, { Post } from '../../../../services/post.service'; // Adjust path if needed

export default function WasteDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  // Fetch individual post data on mount / ID change
  useEffect(() => {
    if (!id) return;

    const fetchPostDetails = async () => {
      setIsLoading(true);
      try {
        // Convert route param string to number for your NestJS/Prisma backend
        const postId = Number(id);
        if (isNaN(postId)) throw new Error("Invalid Post ID");

        const data = await PostService.getPostById(postId);
        setPost(data);
      } catch (error) {
        console.error('Error fetching post details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostDetails();
  }, [id]);

  // --- Loading State ---
  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#2ECC71" />
        <Text className="text-[#8A8F87] mt-3 font-medium">Loading details...</Text>
      </View>
    );
  }

  // --- Error / Not Found State ---
  if (!post) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#E74C3C" />
        <Text className="text-[#1b1c1c] text-lg font-bold mt-4">Post Not Found</Text>
        <Text className="text-[#8A8F87] text-center mt-2 mb-6">
          The listing you are looking for might have been deleted or moved.
        </Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="bg-[#2ECC71] px-6 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Data Mapping & Fallbacks ---
  const displayImage = post.images && post.images.length > 0 
    ? post.images[0].url 
    : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80';

  // Fallbacks for schema fields that might not be in your primitive DTO yet
  const priceText = (post as any).price ? `$${(post as any).price}/ton` : 'FREE';
  const weightText = (post as any).weight || 'TBD kg';
  const locationText = (post as any).location || 'Algiers, Algeria';
  const descriptionText = (post as any).content || 'No description provided.';
  const categoryText = post.category ? post.category.charAt(0).toUpperCase() + post.category.slice(1) : 'General';
  const statusText = post.status ? post.status.charAt(0).toUpperCase() + post.status.slice(1).toLowerCase() : 'Open';

  return (
    <View className="flex-1 bg-white">
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* --- Top Image Header --- */}
        <View className="relative w-full h-[400px]">
          <Image 
            source={{ uri: displayImage }} 
            className="w-full h-full"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/10" />

          {/* Top Actions: Back & Heart */}
          <View className="absolute top-[50px] w-full px-6 flex-row justify-between items-center">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="w-11 h-11 bg-white rounded-full items-center justify-center shadow-sm"
              style={{ elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}
            >
              <Feather name="arrow-left" size={24} color="#1b1c1c" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setIsLiked(!isLiked)}
              className="w-11 h-11 bg-white rounded-full items-center justify-center shadow-sm"
              style={{ elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={24} 
                color={isLiked ? "#E74C3C" : "#1b1c1c"} 
              />
            </TouchableOpacity>
          </View>

          {/* Pagination Dots */}
          <View className="absolute bottom-10 w-full flex-row justify-center items-center space-x-1.5">
            <View className="w-6 h-1.5 bg-white rounded-full" />
            <View className="w-1.5 h-1.5 bg-white/60 rounded-full" />
            <View className="w-1.5 h-1.5 bg-white/60 rounded-full" />
          </View>
        </View>

        {/* --- Main Content Body --- */}
        <View 
          className="bg-white px-6 pt-5 pb-32"
          style={{ marginTop: -24, borderTopLeftRadius: 30, borderTopRightRadius: 30 }}
        >
          <View className="w-12 h-1.5 bg-[#EAEAEA] rounded-full self-center mb-6" />

          {/* Badges Row */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="bg-[#F1C40F] px-4 py-1.5 rounded-full">
              <Text className="text-[#1b1c1c] text-[15px] font-bold">{priceText}</Text>
            </View>
            <View className="bg-[#D5F5E3] px-3 py-1.5 rounded-full">
              <Text className="text-[#2ECC71] text-[12px] font-bold tracking-wide">{statusText}</Text>
            </View>
          </View>

          {/* Title & Metadata */}
          <Text className="text-[26px] font-bold text-[#1b1c1c] mb-3">
            {(post as any).title || 'Untitled Listing'}
          </Text>
          
          <View className="flex-row items-center mb-6">
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="recycle" size={18} color="#2ECC71" />
              <Text className="text-[#3d4a3f] text-[14px] ml-1.5">{categoryText}</Text>
            </View>
            <Text className="text-[#D1D1D1] mx-3">•</Text>
            <View className="flex-row items-center">
              <Feather name="shopping-bag" size={16} color="#2ECC71" />
              <Text className="text-[#3d4a3f] text-[14px] ml-1.5">{weightText}</Text>
            </View>
          </View>

          {/* Description Card */}
          <View className="bg-[#FAFAFA] border border-[#F0F0F0] rounded-[20px] p-5 mb-7">
            <Text className="text-[#1E5631] text-[11px] font-bold tracking-wider mb-2">DESCRIPTION</Text>
            <Text className="text-[#5b645d] text-[15px] leading-6">{descriptionText}</Text>
          </View>

          {/* Location Section */}
          <View className="mb-7">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <Feather name="map-pin" size={18} color="#1E5631" />
                <Text className="text-[17px] font-semibold text-[#1b1c1c] ml-2">{locationText}</Text>
              </View>
              <TouchableOpacity>
                <Text className="text-[#2ECC71] text-[13px] font-semibold">Show route</Text>
              </TouchableOpacity>
            </View>
            {/* Mock Map Image Box */}
            <View className="w-full h-[120px] bg-[#537c76] rounded-[20px] items-center justify-center overflow-hidden relative">
              <View className="absolute w-[200%] h-[200%] bg-[#779e98] rounded-full top-[-100%] right-[-50%] opacity-30" />
              <View className="w-6 h-6 bg-white/30 rounded-full items-center justify-center">
                <View className="w-2.5 h-2.5 bg-white rounded-full" />
              </View>
            </View>
          </View>

          {/* Seller Profile Box */}
          <View 
            className="flex-row items-center bg-white border border-[#F0F0F0] p-4 rounded-[20px]"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}
          >
            {/* Note: Map to dynamic author data when backend includes relations */}
            <Image 
              source={{ uri: (post as any).author?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80' }} 
              className="w-12 h-12 rounded-full mr-4 bg-gray-200"
            />
            <View className="flex-1">
              <Text className="text-[16px] font-semibold text-[#1b1c1c] mb-0.5">
                {(post as any).author?.name || 'User #' + post.author_id}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-[#8A8F87] text-[13px]">Citizen</Text>
                <Text className="text-[#D1D1D1] mx-2">•</Text>
                <Ionicons name="star" size={12} color="#F1C40F" />
                <Text className="text-[#1b1c1c] text-[12px] font-bold ml-1">4.8</Text>
              </View>
            </View>
            <TouchableOpacity className="w-10 h-10 border border-[#ECECEC] rounded-full items-center justify-center">
              <MaterialCommunityIcons name="message-text-outline" size={20} color="#1E5631" />
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      {/* --- Fixed Bottom Action Bar --- */}
      <View 
        className="absolute bottom-0 w-full bg-white px-6 py-4 border-t border-[#F0F0F0]"
        style={{ paddingBottom: Platform.OS === 'ios' ? 34 : 16 }}
      >
        <TouchableOpacity 
          activeOpacity={0.8}
          className="w-full bg-[#2ECC71] h-[56px] rounded-full flex-row items-center justify-center shadow-sm"
          style={{ shadowColor: '#2ECC71', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }}
        >
          <Text className="text-white text-[17px] font-bold mr-2">
            Buy for {priceText}
          </Text>
          <Feather name="shopping-cart" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}