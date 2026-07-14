import React, { useEffect, useState } from 'react';
import {
  View, Text, ActivityIndicator, TouchableOpacity, Alert,
  ScrollView, Image, SafeAreaView, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import PickupService, { Pickup, PickupStatus } from '../../../../services/pickup.service';
import PostService, { Post } from '../../../../services/post.service';
import api from '../../../../lib/api';

// Timeline steps
const TIMELINE = [
  { key: 'PENDING',    label: 'Requested' },
  { key: 'ASSIGNED',  label: 'Assigned' },
  { key: 'IN_TRANSIT',label: 'In Transit' },
  { key: 'COMPLETED', label: 'Completed' },
];

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

export default function CollectorPickupDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch all pickups and find by id (no single-pickup endpoint)
        const all: Pickup[] = await PickupService.getAllPickups();
        const found = all.find(p => p.id.toString() === id?.toString());
        if (found) {
          setPickup(found);
          const postData = await PostService.getPostById(found.post_id);
          setPost(postData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const handleStartTransit = async () => {
    setActionLoading(true);
    try {
      await PickupService.updateStatus(Number(id));
      setPickup(prev => prev ? { ...prev, status: PickupStatus.IN_TRANSIT } : prev);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err.message || 'Failed to start transit');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#F7F8F6] items-center justify-center">
        <ActivityIndicator size="large" color="#2ECC71" />
      </View>
    );
  }

  if (!pickup) {
    return (
      <SafeAreaView className="flex-1 bg-[#F7F8F6] items-center justify-center">
        <MaterialCommunityIcons name="truck-alert-outline" size={56} color="#ECECEC" />
        <Text className="text-[#1b1c1c] font-bold text-[18px] mt-4">Pickup not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-[#2ECC71] px-6 py-3 rounded-full">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusStyle = getStatusStyle(pickup.status);
  const currentStep = TIMELINE.findIndex(s => s.key === pickup.status);
  const progressRatio = Math.max(currentStep, 0) / (TIMELINE.length - 1);

  const imageUrl = post?.images?.[0]?.url?.trim()
    ? post.images[0].url.replace('http://', 'https://')
    : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80';

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8F6]" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 bg-white border-b border-[#ECECEC]">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Feather name="arrow-left" size={24} color="#1b1c1c" />
        </TouchableOpacity>
        <Text className="text-[20px] font-bold text-[#1b1c1c] ml-2 flex-1">Pickup #{pickup.id}</Text>
        <View style={{ backgroundColor: statusStyle.bg }} className="px-3 py-1.5 rounded-full">
          <Text style={{ color: statusStyle.text }} className="text-[12px] font-bold tracking-wide">
            {formatStatus(pickup.status)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── Timeline ── */}
        {pickup.status !== PickupStatus.CANCELED && (
          <View className="bg-white rounded-[20px] p-5 mb-4 border border-[#ECECEC]">
            <Text className="text-[#1E5631] text-[12px] font-bold tracking-widest mb-4">PROGRESS</Text>
            <View className="relative flex-row justify-between items-center">
              {/* Track */}
              <View className="absolute top-3 left-4 right-4 h-1 bg-[#EAEAEA] rounded-full" />
              <View
                className="absolute top-3 left-4 h-1 bg-[#2ECC71] rounded-full"
                style={{ width: `${progressRatio * 92}%` }}
              />
              {TIMELINE.map((step, idx) => {
                const done = currentStep >= idx;
                return (
                  <View key={step.key} className="items-center z-10 flex-1">
                    <View className={`w-6 h-6 rounded-full items-center justify-center ${done ? 'bg-[#2ECC71]' : 'bg-[#EAEAEA]'}`}>
                      {done && <Feather name="check" size={12} color="white" />}
                    </View>
                    <Text className={`text-[10px] font-bold text-center mt-1.5 ${done ? 'text-[#1E5631]' : 'text-[#B0B0B0]'}`}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {pickup.status === PickupStatus.CANCELED && (
          <View className="bg-red-50 border border-red-100 rounded-[20px] p-4 mb-4 flex-row items-center">
            <Feather name="x-circle" size={22} color="#EF4444" />
            <Text className="text-[#C0392B] font-bold text-[15px] ml-3">This pickup was cancelled by the citizen.</Text>
          </View>
        )}

        {/* ── Post / Waste Info ── */}
        <View className="bg-white rounded-[20px] p-5 mb-4 border border-[#ECECEC]">
          <Text className="text-[#1E5631] text-[12px] font-bold tracking-widest mb-4">WASTE DETAILS</Text>
          {post ? (
            <View className="flex-row mb-4">
              <Image source={{ uri: imageUrl }} className="w-20 h-20 rounded-[14px] bg-[#EAEAEA]" resizeMode="cover" />
              <View className="flex-1 ml-4">
                <Text className="font-bold text-[16px] text-[#1b1c1c] mb-1" numberOfLines={2}>
                  {(post as any).title || 'Untitled Post'}
                </Text>
                <Text className="text-[13px] text-[#6D7A6E] mb-1">
                  {post.category}  •  {(post as any).quantity || 'N/A'} kg
                </Text>
                {(post as any).address && (
                  <View className="flex-row items-center">
                    <Feather name="map-pin" size={13} color="#8A8F87" />
                    <Text className="text-[13px] text-[#6D7A6E] ml-1 flex-1" numberOfLines={1}>
                      {(post as any).address}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <Text className="text-[#6D7A6E]">Post #{pickup.post_id}</Text>
          )}

          {post?.description && (
            <Text className="text-[#6D7A6E] text-[14px] leading-5">{post.description}</Text>
          )}
        </View>

        {/* ── Schedule ── */}
        <View className="bg-white rounded-[20px] p-5 mb-4 border border-[#ECECEC]">
          <Text className="text-[#1E5631] text-[12px] font-bold tracking-widest mb-4">SCHEDULE</Text>
          <View className="flex-row items-center mb-3">
            <View className="w-9 h-9 bg-[#E8F8EE] rounded-full items-center justify-center mr-3">
              <Feather name="calendar" size={16} color="#1E5631" />
            </View>
            <View>
              <Text className="text-[#6D7A6E] text-[11px] font-medium">Date</Text>
              <Text className="text-[#1b1c1c] text-[15px] font-semibold">
                {pickup.scheduled_date
                  ? new Date(pickup.scheduled_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : 'ASAP'}
              </Text>
            </View>
          </View>
          {pickup.start_time && (
            <View className="flex-row items-center">
              <View className="w-9 h-9 bg-[#E8F8EE] rounded-full items-center justify-center mr-3">
                <Feather name="clock" size={16} color="#1E5631" />
              </View>
              <View>
                <Text className="text-[#6D7A6E] text-[11px] font-medium">Time Window</Text>
                <Text className="text-[#1b1c1c] text-[15px] font-semibold">
                  {pickup.start_time} – {pickup.end_time}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Citizen Contact & Access ── */}
        <View className="bg-white rounded-[20px] p-5 mb-4 border border-[#ECECEC]">
          <Text className="text-[#1E5631] text-[12px] font-bold tracking-widest mb-4">CITIZEN CONTACT</Text>
          <View className="flex-row items-center pb-4 border-b border-[#F0F0F0] mb-4">
            <View className="w-9 h-9 bg-[#E8F8EE] rounded-full items-center justify-center mr-3">
              <Feather name="phone" size={16} color="#1E5631" />
            </View>
            <View>
              <Text className="text-[#6D7A6E] text-[11px] font-medium">Contact Number</Text>
              <Text className="text-[#1b1c1c] text-[15px] font-semibold">
                {pickup.contact_number || 'Not provided'}
              </Text>
            </View>
          </View>
          <View className="flex-row items-start">
            <View className="w-9 h-9 bg-[#E8F8EE] rounded-full items-center justify-center mr-3 mt-0.5">
              <Feather name="key" size={16} color="#1E5631" />
            </View>
            <View className="flex-1">
              <Text className="text-[#6D7A6E] text-[11px] font-medium mb-1">Access Notes</Text>
              <Text className="text-[#1b1c1c] text-[14px] leading-5">
                {pickup.access_notes || 'No access notes provided.'}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* ── Actions (collector-specific, no Cancel) ── */}
      <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-white border-t border-[#ECECEC]">
        {pickup.status === PickupStatus.ASSIGNED && (
          <TouchableOpacity
            onPress={handleStartTransit}
            disabled={actionLoading}
            className={`w-full h-[56px] rounded-full flex-row items-center justify-center ${actionLoading ? 'bg-[#7fc796]' : 'bg-[#2ECC71]'}`}
            style={{ shadowColor: '#2ECC71', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
          >
            {actionLoading
              ? <ActivityIndicator color="white" />
              : <>
                  <MaterialCommunityIcons name="truck-fast-outline" size={22} color="white" />
                  <Text className="text-white font-bold text-[17px] ml-2">Start Pickup (In Transit)</Text>
                </>
            }
          </TouchableOpacity>
        )}

        {pickup.status === PickupStatus.IN_TRANSIT && (
          <TouchableOpacity
            onPress={() => router.push(`/collector/pickup/confirm?id=${pickup.id}`)}
            className="w-full h-[56px] bg-[#1E5631] rounded-full flex-row items-center justify-center"
            style={{ shadowColor: '#1E5631', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
          >
            <Feather name="check-circle" size={22} color="white" />
            <Text className="text-white font-bold text-[17px] ml-2">Complete Pickup</Text>
          </TouchableOpacity>
        )}

        {pickup.status === PickupStatus.COMPLETED && (
          <TouchableOpacity className="w-full h-[56px] bg-[#E8F8EE] rounded-full flex-row items-center justify-center">
            <Feather name="file-text" size={22} color="#1E5631" />
            <Text className="text-[#1E5631] font-bold text-[17px] ml-2">View Receipt</Text>
          </TouchableOpacity>
        )}

        {(pickup.status === PickupStatus.PENDING || pickup.status === PickupStatus.CANCELED) && (
          <View className="w-full h-[56px] bg-[#F4F4F4] rounded-full flex-row items-center justify-center">
            <Text className="text-[#8A8F87] font-medium text-[16px]">
              {pickup.status === PickupStatus.PENDING ? 'Accept this pickup first' : 'Pickup was cancelled'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
