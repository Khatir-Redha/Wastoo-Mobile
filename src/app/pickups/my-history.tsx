import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePickups } from '../../../hooks/usePickups';
import { PickupStatus } from '../../../services/pickup.service';

const FILTERS = ['ALL', 'PENDING', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'CANCELED'];

export default function MyPickupsHistoryScreen() {
  const { pickups, loading, error, fetchMyPickups } = usePickups();
  const router = useRouter();
  
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMyPickups();
  }, [fetchMyPickups]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyPickups();
    setRefreshing(false);
  };

  const filteredPickups = pickups.filter(p => {
    if (activeFilter === 'ALL') return true;
    return p.status === activeFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800';
      case 'IN_TRANSIT': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F9F9F9]">
        <ActivityIndicator size="large" color="#2ECC71" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F9F9F9]">
      {/* Header */}
      <View className="px-5 pt-12 pb-4 bg-white border-b border-[#ECECEC] flex-row items-center justify-between z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Feather name="arrow-left" size={24} color="#1b1c1c" />
        </TouchableOpacity>
        <Text className="text-[20px] font-bold text-[#1b1c1c]">My Pickups</Text>
        <View className="w-10" />
      </View>

      {/* Filters */}
      <View className="bg-white border-b border-[#ECECEC]">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 py-3">
          {FILTERS.map(filter => (
            <TouchableOpacity 
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`mr-3 px-4 py-2 rounded-full border ${activeFilter === filter ? 'bg-[#2ECC71] border-[#2ECC71]' : 'bg-white border-[#ECECEC]'}`}
            >
              <Text className={`${activeFilter === filter ? 'text-white font-bold' : 'text-[#6D7A6E] font-medium'}`}>
                {filter === 'ALL' ? 'All' : formatStatus(filter)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {error ? (
        <View className="p-4 items-center mt-10">
          <Text className="text-red-500 font-medium text-center">{error}</Text>
        </View>
      ) : null}

      {/* List */}
      <FlatList
        data={filteredPickups}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2ECC71" />}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.8}
            className="bg-white p-5 rounded-[20px] shadow-sm mb-4 border border-[#ECECEC]"
            onPress={() => router.push(`/pickups/${item.id}`)}
          >
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-row items-center bg-[#F4F4F4] px-3 py-1.5 rounded-lg">
                <MaterialCommunityIcons name="recycle" size={14} color="#6D7A6E" />
                <Text className="text-[12px] text-[#1b1c1c] font-bold ml-1 uppercase">
                  Post #{item.post_id}
                </Text>
              </View>
              
              <View className={`px-3 py-1 rounded-full ${getStatusColor(item.status).split(' ')[0]}`}>
                <Text className={`text-[11px] font-bold tracking-wider ${getStatusColor(item.status).split(' ')[1]}`}>
                  {formatStatus(item.status)}
                </Text>
              </View>
            </View>

            <View className="mb-3">
              <View className="flex-row items-center mb-1">
                <Feather name="calendar" size={14} color="#8A8F87" />
                <Text className="text-[14px] text-[#1b1c1c] ml-2 font-medium">
                  {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString() : 'Not scheduled'}
                </Text>
              </View>
              {item.start_time && (
                <View className="flex-row items-center mb-1">
                  <Feather name="clock" size={14} color="#8A8F87" />
                  <Text className="text-[14px] text-[#6D7A6E] ml-2">
                    {item.start_time} - {item.end_time}
                  </Text>
                </View>
              )}
            </View>

            {item.collector_id && (
              <View className="flex-row items-center border-t border-[#F0F0F0] pt-3 mt-2">
                <View className="w-6 h-6 bg-[#EAEAEA] rounded-full items-center justify-center mr-2">
                  <Feather name="user" size={12} color="#8A8F87" />
                </View>
                <Text className="text-[13px] text-[#6D7A6E]">Assigned to Collector #{item.collector_id}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center mt-20">
            <MaterialCommunityIcons name="clipboard-text-outline" size={64} color="#ECECEC" />
            <Text className="text-[#6D7A6E] font-medium text-[16px] mt-4">No pickup requests found.</Text>
          </View>
        }
      />
    </View>
  );
}
