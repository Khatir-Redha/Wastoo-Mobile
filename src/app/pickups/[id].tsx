import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { usePickups } from '../../../hooks/usePickups';
import { Pickup, PickupStatus } from '../../../services/pickup.service';
import api from '../../../lib/api'; 
import PostService, { Post } from '../../../services/post.service';
import CancelPickupModal from '../../components/CancelPickupModal';

export default function PickupDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { updateStatus, deletePickup, loading } = usePickups();
  
  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  // Mocking roles: in a real app, this comes from auth context
  // Set to CITIZEN to see citizen view, COLLECTOR to see collector view
  const currentUserRole = 'CITIZEN'; 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/pickup`); 
        const foundPickup = res.data.find((p: Pickup) => p.id.toString() === id);
        if (foundPickup) {
          setPickup(foundPickup);
          const postData = await PostService.getPostById(foundPickup.post_id);
          setPost(postData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetchLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleStartTransit = async () => {
    try {
      await updateStatus(Number(id));
      setPickup(prev => prev ? { ...prev, status: PickupStatus.IN_TRANSIT } : prev);
      Alert.alert('Success', 'Pickup is now in transit!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleCancelConfirm = async (reason: string, notes: string) => {
    setCancelModalVisible(false);
    try {
      await deletePickup(Number(id)); 
      Alert.alert('Cancelled', 'Pickup request has been cancelled.');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (fetchLoading) {
    return (
      <View className="flex-1 bg-[#F9F9F9] items-center justify-center">
        <ActivityIndicator size="large" color="#2ECC71" />
      </View>
    );
  }

  if (!pickup || !post) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F9F9F9]">
        <Text className="text-lg font-medium text-[#6D7A6E]">Pickup not found</Text>
      </View>
    );
  }

  const imageUrl = (post.images && post.images.length > 0) 
    ? (typeof post.images[0] === 'string' ? post.images[0] : (post.images[0] as any).url) 
    : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80';

  const TIMELINE_STEPS = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED'];
  const currentStepIndex = TIMELINE_STEPS.indexOf(pickup.status);

  return (
    <View className="flex-1 bg-[#F9F9F9]">
      {/* Header */}
      <View className="px-5 pt-12 pb-4 bg-white border-b border-[#ECECEC] flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Feather name="arrow-left" size={24} color="#1b1c1c" />
        </TouchableOpacity>
        <Text className="text-[20px] font-bold text-[#1b1c1c] ml-2">Pickup #{pickup.id}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        {/* Status Timeline */}
        {pickup.status !== PickupStatus.CANCELED && (
          <View className="bg-white p-5 rounded-2xl shadow-sm border border-[#ECECEC] mb-6 flex-row justify-between items-center relative">
            <View className="absolute top-8 left-10 right-10 h-1 bg-[#EAEAEA] z-0" />
            <View className="absolute top-8 left-10 h-1 bg-[#2ECC71] z-0" style={{ width: `${(Math.max(currentStepIndex, 0) / 3) * 100}%` }} />
            
            {TIMELINE_STEPS.map((step, idx) => {
              const isActive = currentStepIndex >= idx;
              return (
                <View key={step} className="items-center z-10 w-16">
                  <View className={`w-6 h-6 rounded-full items-center justify-center mb-1 ${isActive ? 'bg-[#2ECC71]' : 'bg-[#EAEAEA]'}`}>
                    {isActive && <Feather name="check" size={12} color="white" />}
                  </View>
                  <Text className={`text-[10px] text-center font-bold ${isActive ? 'text-[#1E5631]' : 'text-[#B0B0B0]'}`}>
                    {step.replace('_', '\n')}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {pickup.status === PickupStatus.CANCELED && (
          <View className="bg-red-50 p-4 rounded-2xl mb-6 flex-row items-center border border-red-100">
            <Feather name="x-circle" size={24} color="#E74C3C" />
            <Text className="text-[#C0392B] font-bold text-[16px] ml-3">This pickup was cancelled.</Text>
          </View>
        )}

        {/* Post Info */}
        <View className="bg-white p-5 rounded-2xl shadow-sm border border-[#ECECEC] mb-6">
          <Text className="text-[#1E5631] text-[12px] font-bold tracking-wider mb-4">WASTE DETAILS</Text>
          <View className="flex-row mb-4">
            <Image source={{ uri: imageUrl }} className="w-20 h-20 rounded-[12px] bg-[#EAEAEA]" />
            <View className="ml-4 flex-1">
              <Text className="font-bold text-[16px] text-[#1b1c1c] mb-1">{(post as any).title || 'Untitled'}</Text>
              <Text className="text-[#6D7A6E] text-[14px] mb-1">{post.category} • {(post as any).quantity || 'TBD'} kg</Text>
              <TouchableOpacity onPress={() => router.push(`/citizen/${pickup.post_id}`)} className="mt-1">
                <Text className="text-[#2ECC71] text-[13px] font-bold">View Original Post</Text>
              </TouchableOpacity>
            </View>
          </View>
          {post.description && (
            <Text className="text-[#6D7A6E] text-[14px] leading-5">{post.description}</Text>
          )}
        </View>

        {/* Schedule & Location */}
        <View className="bg-white p-5 rounded-2xl shadow-sm border border-[#ECECEC] mb-6">
          <Text className="text-[#1E5631] text-[12px] font-bold tracking-wider mb-4">SCHEDULE & LOCATION</Text>
          
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-[#E8F8EE] rounded-full items-center justify-center mr-3">
              <Feather name="calendar" size={18} color="#1E5631" />
            </View>
            <View>
              <Text className="text-[#6D7A6E] text-[12px] font-medium">Scheduled Time</Text>
              <Text className="text-[#1b1c1c] text-[15px] font-semibold">
                {pickup.scheduled_date ? new Date(pickup.scheduled_date).toLocaleDateString() : 'ASAP'}
                {pickup.start_time ? ` • ${pickup.start_time} - ${pickup.end_time}` : ''}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-[#E8F8EE] rounded-full items-center justify-center mr-3">
              <Feather name="map-pin" size={18} color="#1E5631" />
            </View>
            <View className="flex-1">
              <Text className="text-[#6D7A6E] text-[12px] font-medium">Pickup Address</Text>
              <Text className="text-[#1b1c1c] text-[15px] font-semibold">
                {(post as any).address || 'No address provided'}
              </Text>
            </View>
          </View>
        </View>

        {/* Contact & Access Notes */}
        <View className="bg-white p-5 rounded-2xl shadow-sm border border-[#ECECEC] mb-6">
          <Text className="text-[#1E5631] text-[12px] font-bold tracking-wider mb-4">CONTACT & ACCESS</Text>
          
          <View className="flex-row items-center mb-4 border-b border-[#F0F0F0] pb-4">
            <Feather name="phone" size={18} color="#6D7A6E" />
            <Text className="text-[#1b1c1c] text-[15px] ml-3 flex-1">{pickup.contact_number || 'No contact provided'}</Text>
          </View>
          
          <View className="flex-row items-start">
            <Feather name="key" size={18} color="#6D7A6E" className="mt-1" />
            <Text className="text-[#1b1c1c] text-[15px] ml-3 flex-1 leading-5">{pickup.access_notes || 'No access notes provided'}</Text>
          </View>
        </View>

      </ScrollView>

      {/* Action Buttons based on Role & Status */}
      <View className="px-6 py-4 border-t border-[#F0F0F0] bg-white">
        
        {currentUserRole === 'CITIZEN' && (pickup.status === PickupStatus.PENDING || pickup.status === PickupStatus.ASSIGNED) && (
          <TouchableOpacity 
            onPress={() => setCancelModalVisible(true)}
            className="w-full h-[56px] bg-white border-2 border-[#E74C3C] rounded-full flex-row items-center justify-center"
          >
            <Text className="text-[#E74C3C] font-bold text-[16px]">Cancel Pickup</Text>
          </TouchableOpacity>
        )}

        {currentUserRole === 'COLLECTOR' && pickup.status === PickupStatus.ASSIGNED && (
          <TouchableOpacity 
            onPress={handleStartTransit}
            disabled={loading}
            className="w-full bg-[#2ECC71] h-[56px] rounded-full flex-row items-center justify-center shadow-sm"
          >
            {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-[16px]">Start Pickup (In Transit)</Text>}
          </TouchableOpacity>
        )}

        {currentUserRole === 'COLLECTOR' && pickup.status === PickupStatus.IN_TRANSIT && (
          <TouchableOpacity 
            onPress={() => router.push(`/pickups/confirm?id=${pickup.id}`)}
            className="w-full bg-[#1E5631] h-[56px] rounded-full flex-row items-center justify-center shadow-sm"
          >
            <Text className="text-white font-bold text-[16px]">Complete Pickup</Text>
            <Feather name="check-circle" size={20} color="white" className="ml-2" />
          </TouchableOpacity>
        )}

        {pickup.status === PickupStatus.COMPLETED && (
          <TouchableOpacity className="w-full h-[56px] bg-[#E8F8EE] rounded-full flex-row items-center justify-center">
            <Text className="text-[#1E5631] font-bold text-[16px]">View Receipt</Text>
          </TouchableOpacity>
        )}

      </View>

      <CancelPickupModal 
        visible={cancelModalVisible}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={handleCancelConfirm}
      />
    </View>
  );
}
