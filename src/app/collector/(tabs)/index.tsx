import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  TextInput, ScrollView, RefreshControl, SafeAreaView, Platform, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import PickupService, { Pickup } from '../../../../services/pickup.service';
import { useAuth } from '../../../../context/AuthProvider';
import NotificationBell from '../../../components/NotificationBell';
import { theme } from '../../../theme/tokens';

export default function AvailablePickupsScreen() {
  const router = useRouter();
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const fetchPickups = useCallback(async (reset = false) => {
    try {
      if (reset) { setLoading(true); setError(null); }
      const data: Pickup[] = await PickupService.getAllPickups();
      // Only PENDING (unassigned) pickups visible to collectors
      const pending = data.filter(p => p.status === 'PENDING' && !p.deleted_at);
      setPickups(pending);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load pickups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPickups(true); }, [fetchPickups]);

  const onRefresh = () => { setRefreshing(true); fetchPickups(true); };

  const { user } = useAuth();
  const isVerified = user?.status === 'ACTIVE';

  const handleAccept = async (pickup: Pickup) => {
    if (!isVerified) {
      Alert.alert(
        'Verification Required',
        'You must complete your identity verification to accept pickups.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify Now', onPress: () => router.push('/collector/kyc' as any) }
        ]
      );
      return;
    }

    try {
      await PickupService.assignCollector(pickup.id);
      setPickups(prev => prev.filter(p => p.id !== pickup.id));
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to accept pickup');
    }
  };

  // Simplified filtering - removed mock distance and complex pagination
  const filtered = pickups.filter(pickup => {
    // Since we don't have category info in pickup model, we'll show all for now
    // TODO: Enhance when API supports category filtering
    const matchSearch = search.trim() === '' || pickup.id.toString().includes(search);
    return matchSearch;
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8F6]" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      {/* Header */}
      <View className="bg-white border-b border-[#ECECEC] px-5 pt-4 pb-3">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-[20px] font-bold text-[#1b1c1c]">Nearby Pickups</Text>
          <NotificationBell />
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-[#F4F4F4] rounded-2xl px-4 h-[48px] mb-4">
          <Feather name="search" size={18} color="#8A8F87" />
          <TextInput
            className="flex-1 text-[#1b1c1c] text-[15px] ml-2"
            placeholder="Search pickup ID..."
            placeholderTextColor="#B0B0B0"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x-circle" size={18} color="#B0B0B0" />
            </TouchableOpacity>
          )}
        </View>

        {/* Simple Category Filter */}
        <View className="flex-wrap gap-2 mb-4 px-5">
          {['All', 'PLASTIC', 'PAPER', 'METAL', 'GLASS', 'ORGANIC'].map(category => (
            <TouchableOpacity
              key={category}
              onPress={() => setActiveCategory(category)}
              className={`${activeCategory === category 
                ? 'bg-[#1E5631] border-[#1E5631]' 
                : 'bg-white border-[#ECECEC]'} 
                px-4 py-2 rounded-full`}
            >
              <Text className={`${activeCategory === category 
                ? 'text-white' 
                : 'text-[#6D7A6E]'} 
                font-medium text-[13px]`}>
                {category === 'All' ? 'All' : category.charAt(0) + category.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List Content */}
      {!loading && !error && pickups.length === 0 ? (
        <View className="flex-1 items-center justify-center mt-10">
          <MaterialCommunityIcons name="truck-check-outline" size={48} color="#ECECEC" />
          <Text className="text-[18px] font-bold text-[#1b1c1c] mt-3">No Pickups Available</Text>
          <Text className="text-[14px] text-[#6D7A6E] text-center px-6 mt-1">
            Check back later for new collection opportunities
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.emerald[500]} />}
          ListEmptyComponent={() => null}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/collector/pickup/${item.id}`)}
              activeOpacity={0.8}
              className="mb-4"
            >
              <View className="bg-white border border-[#ECECEC] rounded-xl p-4"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center bg-[#E8F8EE] px-3 py-1.5 rounded-md">
                    <MaterialCommunityIcons name="recycle" size={16} color="#1E5631" />
                    <Text className="text-[13px] font-medium text-[#1E5631] ml-1">
                      Post #{item.post_id}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Feather name="map-pin" size={14} color="#6D7A6E" />
                    <Text className="text-[13px] font-medium text-[#6D7A6E] ml-0.5">
                      Nearby
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row items-center mb-2">
                  <Feather name="calendar" size={14} color="#2ECC71" />
                  <Text className="text-[13px] text-[#1b1c1c] ml-2">
                    Flexible pickup
                  </Text>
                </View>
                
                <View className="flex-row items-center mb-2">
                  <Feather name="clock" size={14} color="#2ECC71" />
                  <Text className="text-[13px] text-[#6D7A6E] ml-2">
                    Scheduled time TBD
                  </Text>
                </View>
                
                <View className="flex-col">
                  <TouchableOpacity
                    onPress={() => handleAccept(item)}
                    disabled={!isVerified}
                    className={`w-full h-[48px] rounded-md flex items-center justify-center 
                      ${!isVerified 
                        ? 'bg-[#ECECEC]' 
                        : 'bg-[#2ECC71]'} 
                      border border-[${!isVerified 
                        ? '#ECECEC' 
                        : '#2ECC71'}]
                    `}
                  >
                    {!isVerified ? (
                      <Text className="text-[14px] font-medium text-[#6D7A6E]">
                        Verify to Accept
                      </Text>
                    ) : (
                      <Text className="text-[14px] font-medium text-white">
                        Accept Pickup
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      
      {loading && (
        <View className="flex-1 items-center justify-center mt-10">
          <ActivityIndicator size="large" color={theme.colors.emerald[500]} />
          <Text className="text-[14px] text-[#6D7A6E] mt-3">Loading pickups...</Text>
        </View>
      )}
      
      {error && (
        <View className="flex-1 items-center justify-center mt-10 px-6">
          <Feather name="wifi-off" size={48} color="#ECECEC" />
          <Text className="text-[18px] font-bold text-[#1b1c1c] mt-3">Connection Error</Text>
          <Text className="text-[14px] text-[#6D7A6E] text-center mt-1">
            {error}
          </Text>
          <TouchableOpacity onPress={fetchPickups} className="mt-4">
            <View className="w-[120px] h-[40px] bg-[#2ECC71] rounded-md flex items-center justify-center">
              <Text className="text-white font-medium">Retry</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
