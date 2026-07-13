import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { usePickups } from '../../../hooks/usePickups';

const CATEGORIES = ['All', 'Plastic', 'Glass', 'Paper', 'Metal', 'Organic'];

export default function AvailablePickupsScreen() {
  const router = useRouter();
  const { pickups, loading, error, fetchAllPickups, assignCollector } = usePickups();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAllPickups();
  }, [fetchAllPickups]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllPickups();
    setRefreshing(false);
  };

  const handleAccept = async (id: number) => {
    setAcceptingId(id);
    try {
      await assignCollector(id);
    } catch (err: any) {
      alert('Failed to accept pickup: ' + err.message);
    } finally {
      setAcceptingId(null);
    }
  };

  // Only show pending pickups for collectors to accept
  const pendingPickups = pickups.filter(p => p.status === 'PENDING' || p.status === 'OPEN'); // Prisma might use OPEN as default or PENDING. Our code uses PENDING.

  // Mock distance for display purposes since we don't have geo yet
  const mockDistance = (id: number) => `${(id % 5) + 1.2} km`;

  return (
    <View className="flex-1 bg-[#F9F9F9]">
      {/* Header */}
      <View className="px-5 pt-12 pb-4 bg-white border-b border-[#ECECEC]">
        <Text className="text-[24px] font-bold text-[#1b1c1c] mb-4">Available Pickups</Text>
        
        {/* Search */}
        <View className="flex-row items-center bg-[#F4F4F4] rounded-2xl px-4 h-[48px] mb-4">
          <Feather name="search" size={20} color="#8A8F87" />
          <TextInput
            className="flex-1 text-[#1b1c1c] text-[16px] ml-3"
            placeholder="Search by address or post..."
            placeholderTextColor="#B0B0B0"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat}
              onPress={() => setActiveCategory(cat)}
              className={`mr-3 px-4 py-2 rounded-full border ${activeCategory === cat ? 'bg-[#2ECC71] border-[#2ECC71]' : 'bg-white border-[#ECECEC]'}`}
            >
              <Text className={`${activeCategory === cat ? 'text-white font-bold' : 'text-[#6D7A6E] font-medium'}`}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {error ? (
        <View className="p-4 items-center mt-4">
          <Text className="text-red-500 font-medium">{error}</Text>
        </View>
      ) : null}

      {/* List */}
      <FlatList
        data={pendingPickups}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2ECC71" />}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.9}
            className="bg-white p-5 rounded-[20px] shadow-sm mb-4 border border-[#ECECEC]"
            onPress={() => router.push(`/pickups/${item.id}`)}
          >
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-row items-center bg-[#E8F8EE] px-3 py-1.5 rounded-lg">
                <MaterialCommunityIcons name="recycle" size={16} color="#1E5631" />
                <Text className="text-[13px] text-[#1E5631] font-bold ml-1">
                  Post #{item.post_id}
                </Text>
              </View>
              
              <View className="flex-row items-center bg-[#F4F4F4] px-2 py-1 rounded-full">
                <Ionicons name="location-outline" size={14} color="#6D7A6E" />
                <Text className="text-[12px] font-bold text-[#6D7A6E] ml-1">{mockDistance(item.id)}</Text>
              </View>
            </View>

            <View className="flex-row items-center mb-2">
              <Feather name="calendar" size={16} color="#2ECC71" />
              <Text className="text-[15px] text-[#1b1c1c] ml-3 font-semibold">
                {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString() : 'ASAP'}
              </Text>
            </View>

            <View className="flex-row items-center mb-4">
              <Feather name="clock" size={16} color="#2ECC71" />
              <Text className="text-[15px] text-[#6D7A6E] ml-3">
                {item.start_time ? `${item.start_time} - ${item.end_time}` : 'Anytime'}
              </Text>
            </View>

            <View className="flex-row items-center border-t border-[#F0F0F0] pt-4 mt-1 flex-1">
              <TouchableOpacity 
                className="flex-1 border border-[#ECECEC] rounded-xl py-3 items-center mr-2"
                onPress={() => router.push(`/pickups/${item.id}`)}
              >
                <Text className="text-[#6D7A6E] font-bold">Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className={`flex-1 rounded-xl py-3 items-center ${acceptingId === item.id ? 'bg-[#7fc796]' : 'bg-[#2ECC71]'}`}
                onPress={() => handleAccept(item.id)}
                disabled={acceptingId === item.id}
              >
                {acceptingId === item.id ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-bold">Accept Pickup</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center mt-20">
              <MaterialCommunityIcons name="truck-outline" size={64} color="#ECECEC" />
              <Text className="text-[#6D7A6E] font-medium text-[16px] mt-4">No available pickups nearby.</Text>
            </View>
          ) : (
            <View className="mt-20"><ActivityIndicator size="large" color="#2ECC71" /></View>
          )
        }
      />
    </View>
  );
}
