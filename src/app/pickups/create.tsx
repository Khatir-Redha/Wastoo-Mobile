import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import PostService, { Post } from '../../../services/post.service';

export default function CreatePickupScreen() {
  const router = useRouter();
  const { post_id } = useLocalSearchParams();
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactNumber, setContactNumber] = useState('');
  const [accessNotes, setAccessNotes] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      if (!post_id) {
        setLoading(false);
        return;
      }
      try {
        const data = await PostService.getPostById(Number(post_id));
        setPost(data);
      } catch (err) {
        console.error('Failed to fetch post', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [post_id]);

  const handleContinue = () => {
    if (!contactNumber.trim()) {
      Alert.alert('Required', 'Please provide a valid contact number.');
      return;
    }
    
    // Pass data to schedule screen
    router.push({
      pathname: '/pickups/schedule',
      params: { 
        post_id: post_id,
        contact_number: contactNumber,
        access_notes: accessNotes 
      }
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#2ECC71" />
      </View>
    );
  }

  if (!post) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Text className="text-lg font-bold text-gray-800">Post not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-[#2ECC71] px-6 py-3 rounded-full">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl = (post.images && post.images.length > 0) 
    ? (typeof post.images[0] === 'string' ? post.images[0] : (post.images[0] as any).url) 
    : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80';

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 pt-12 pb-4 bg-white border-b border-[#ECECEC] flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Feather name="arrow-left" size={24} color="#1b1c1c" />
        </TouchableOpacity>
        <Text className="text-[20px] font-bold text-[#1b1c1c] ml-2">Request Pickup</Text>
      </View>

      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        {/* Post Summary Card */}
        <View className="bg-[#F9F9F9] border border-[#ECECEC] rounded-[16px] p-4 flex-row items-center mb-8">
          <Image source={{ uri: imageUrl }} className="w-20 h-20 rounded-[12px] bg-[#EAEAEA]" resizeMode="cover" />
          <View className="flex-1 ml-4 justify-center">
            <Text className="font-bold text-[16px] text-[#1b1c1c] mb-1" numberOfLines={1}>
              {(post as any).title || 'Untitled Listing'}
            </Text>
            <View className="flex-row items-center mb-1">
              <MaterialCommunityIcons name="recycle" size={14} color="#6D7A6E" />
              <Text className="text-[13px] text-[#6D7A6E] ml-1">
                {post.category} • {(post as any).weight || 'TBD'} kg
              </Text>
            </View>
            <Text className="text-[12px] text-[#8A8F87]" numberOfLines={1}>
              {(post as any).address || 'No location provided'}
            </Text>
          </View>
        </View>

        {/* Contact Info Section */}
        <Text className="text-[18px] font-bold text-[#1b1c1c] mb-4">Contact Information</Text>
        
        <View className="mb-6">
          <Text className="text-[#6D7A6E] font-medium mb-2 ml-1 text-sm">Contact Number <Text className="text-red-500">*</Text></Text>
          <View className="flex-row items-center bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl px-4 h-[56px]">
            <Feather name="phone" size={20} color="#8A8F87" />
            <TextInput
              className="flex-1 text-[#1b1c1c] text-[16px] ml-3"
              placeholder="+213 555 123 456"
              placeholderTextColor="#B0B0B0"
              keyboardType="phone-pad"
              value={contactNumber}
              onChangeText={setContactNumber}
            />
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-[#6D7A6E] font-medium mb-2 ml-1 text-sm">Access Notes (Optional)</Text>
          <View className="bg-[#F9F9F9] border border-[#ECECEC] rounded-2xl p-4 min-h-[120px]">
            <TextInput
              className="flex-1 text-[#1b1c1c] text-[16px]"
              placeholder="e.g. Ring the second bell, gate code is 1234, call upon arrival..."
              placeholderTextColor="#B0B0B0"
              multiline
              textAlignVertical="top"
              value={accessNotes}
              onChangeText={setAccessNotes}
            />
          </View>
        </View>

      </ScrollView>

      {/* Footer */}
      <View className="px-6 py-4 border-t border-[#F0F0F0] bg-white">
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handleContinue}
          className="w-full bg-[#2ECC71] h-[56px] rounded-full flex-row items-center justify-center shadow-sm"
        >
          <Text className="text-white text-[17px] font-bold mr-2">Continue</Text>
          <Feather name="arrow-right" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
