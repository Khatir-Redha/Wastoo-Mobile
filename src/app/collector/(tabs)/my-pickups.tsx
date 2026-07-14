import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  ScrollView, RefreshControl, SafeAreaView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import PickupService, { Pickup } from '../../../../services/pickup.service';

const STATUS_FILTERS = ['ALL', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'CANCELED'];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'ASSIGNED':   return { bg: '#EFF6FF', text: '#3B82F6' };
    case 'IN_TRANSIT': return { bg: '#F5F3FF', text: '#8B5CF6' };
    case 'COMPLETED':  return { bg: '#E8F8EE', text: '#1E5631' };
    case 'CANCELED':   return { bg: '#FEF2F2', text: '#EF4444' };
    default:           return { bg: '#F4F4F4', text: '#6D7A6E' };
  }
};

const formatStatus = (s: string) => s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function MyPickupsScreen() {
  const router = useRouter();
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const fetchMyPickups = useCallback(async () => {
    try {
      setError(null);
      const data = await PickupService.getMyPickups();
      // Collector's own accepted pickups — NOT unassigned or other's
      setPickups(data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load pickups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchMyPickups(); }, [fetchMyPickups]);

  const onRefresh = () => { setRefreshing(true); fetchMyPickups(); };

  const filtered = pickups.filter(p => activeFilter === 'ALL' || p.status === activeFilter);

  const counts: Record<string, number> = {};
  STATUS_FILTERS.forEach(f => {
    counts[f] = f === 'ALL' ? pickups.length : pickups.filter(p => p.status === f).length;
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8F6]" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-0 bg-white border-b border-[#ECECEC]">
        <Text className="text-[24px] font-bold text-[#1b1c1c] mb-4">My Pickups</Text>

        {/* Status filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-3">
          {STATUS_FILTERS.map(filter => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`mr-2 px-4 py-2 rounded-full border ${activeFilter === filter ? 'bg-[#1E5631] border-[#1E5631]' : 'bg-white border-[#ECECEC]'}`}
            >
              <Text className={`text-[13px] font-semibold ${activeFilter === filter ? 'text-white' : 'text-[#6D7A6E]'}`}>
                {filter === 'ALL' ? 'All' : formatStatus(filter)} ({counts[filter]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2ECC71" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Feather name="wifi-off" size={48} color="#ECECEC" />
          <Text className="text-[#1b1c1c] font-bold text-[18px] mt-4">Something went wrong</Text>
          <Text className="text-[#6D7A6E] text-[14px] mt-2 text-center">{error}</Text>
          <TouchableOpacity onPress={fetchMyPickups} className="mt-6 bg-[#2ECC71] px-6 py-3 rounded-full">
            <Text className="text-white font-bold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2ECC71" />}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-24">
              <MaterialCommunityIcons name="clipboard-list-outline" size={64} color="#ECECEC" />
              <Text className="text-[#1b1c1c] font-bold text-[18px] mt-4">No Pickups Yet</Text>
              <Text className="text-[#6D7A6E] text-[14px] mt-2 text-center px-8">
                Accept pickups from the Available tab to see them here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const style = getStatusStyle(item.status);
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push(`/collector/pickup/${item.id}`)}
                className="bg-white border border-[#ECECEC] rounded-[20px] p-5 mb-4"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}
              >
                {/* Top row */}
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-[#E8F8EE] rounded-full items-center justify-center mr-3">
                      <MaterialCommunityIcons name="truck-delivery-outline" size={20} color="#1E5631" />
                    </View>
                    <Text className="font-bold text-[16px] text-[#1b1c1c]">Pickup #{item.id}</Text>
                  </View>
                  <View style={{ backgroundColor: style.bg }} className="px-3 py-1 rounded-full">
                    <Text style={{ color: style.text }} className="text-[11px] font-bold tracking-wide">
                      {formatStatus(item.status)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center mb-2">
                  <Feather name="package" size={14} color="#8A8F87" />
                  <Text className="text-[13px] text-[#6D7A6E] ml-2">Post #{item.post_id}</Text>
                </View>

                <View className="flex-row items-center mb-2">
                  <Feather name="calendar" size={14} color="#8A8F87" />
                  <Text className="text-[13px] text-[#6D7A6E] ml-2">
                    {item.scheduled_date
                      ? new Date(item.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Not scheduled'}
                  </Text>
                </View>

                {item.start_time && (
                  <View className="flex-row items-center mb-2">
                    <Feather name="clock" size={14} color="#8A8F87" />
                    <Text className="text-[13px] text-[#6D7A6E] ml-2">
                      {item.start_time} – {item.end_time}
                    </Text>
                  </View>
                )}

                <View className="flex-row items-center justify-end mt-2 pt-3 border-t border-[#F0F0F0]">
                  <Text className="text-[#2ECC71] font-bold text-[13px] mr-1">View Details</Text>
                  <Feather name="chevron-right" size={16} color="#2ECC71" />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
