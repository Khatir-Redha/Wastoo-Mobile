import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  TextInput, ScrollView, RefreshControl, SafeAreaView, Platform, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import PickupService, { Pickup } from '../../../../services/pickup.service';
import { useAuth } from '../../../../context/AuthProvider';

const CATEGORIES = ['All', 'PLASTIC', 'GLASS', 'PAPER', 'METAL', 'ORGANIC', 'TEXTILE', 'MIXED'];

const CATEGORY_ICONS: Record<string, string> = {
  PLASTIC: 'bottle-soda-outline',
  GLASS: 'bottle-wine-outline',
  PAPER: 'file-outline',
  METAL: 'nail',
  ORGANIC: 'leaf',
  TEXTILE: 'hanger',
  HAZARDOUS: 'biohazard',
  MIXED: 'recycle',
};

// Mock distance (until geo endpoint is available)
const mockDistance = (id: number) => `${((id % 8) + 0.5).toFixed(1)} km`;

export default function AvailablePickupsScreen() {
  const router = useRouter();
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  const fetchPickups = useCallback(async (reset = false) => {
    try {
      if (reset) { setLoading(true); setError(null); }
      const data: Pickup[] = await PickupService.getAllPickups();
      // Only PENDING (unassigned) pickups visible to collectors
      const pending = data.filter(p => p.status === 'PENDING' && !p.deleted_at);
      setPickups(pending);
      setHasMore(pending.length >= PAGE_SIZE);
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

    setAcceptingId(pickup.id);
    try {
      await PickupService.assignCollector(pickup.id);
      setPickups(prev => prev.filter(p => p.id !== pickup.id));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to accept pickup');
    } finally {
      setAcceptingId(null);
    }
  };

  // Client-side filter
  const filtered = pickups.filter(p => {
    const matchCat = activeCategory === 'All'; // category not in pickup model, post has it
    const matchSearch = search.trim() === '' || p.id.toString().includes(search);
    return (matchCat || true) && matchSearch;
  });

  const displayed = filtered.slice(0, page * PAGE_SIZE);

  const renderEmpty = () => {
    if (loading) return null;
    if (error) return (
      <View className="flex-1 items-center justify-center mt-24 px-8">
        <Feather name="wifi-off" size={48} color="#ECECEC" />
        <Text className="text-[#1b1c1c] font-bold text-[18px] mt-4">Connection Error</Text>
        <Text className="text-[#6D7A6E] text-[14px] mt-2 text-center">{error}</Text>
        <TouchableOpacity onPress={() => fetchPickups(true)} className="mt-6 bg-[#2ECC71] px-6 py-3 rounded-full">
          <Text className="text-white font-bold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
    return (
      <View className="items-center justify-center mt-24">
        <MaterialCommunityIcons name="truck-check-outline" size={64} color="#ECECEC" />
        <Text className="text-[#1b1c1c] font-bold text-[18px] mt-4">No Available Pickups</Text>
        <Text className="text-[#6D7A6E] text-[14px] mt-2 text-center px-8">
          All nearby pickups have been accepted. Check back soon!
        </Text>
      </View>
    );
  };

  const renderCard = ({ item }: { item: Pickup }) => (
    <View className="bg-white border border-[#ECECEC] rounded-[20px] p-5 mb-4"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
      {/* Top row */}
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-row items-center bg-[#E8F8EE] px-3 py-1.5 rounded-xl">
          <MaterialCommunityIcons name="recycle" size={16} color="#1E5631" />
          <Text className="text-[13px] font-bold text-[#1E5631] ml-1">Post #{item.post_id}</Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="location-outline" size={14} color="#6D7A6E" />
          <Text className="text-[13px] font-bold text-[#6D7A6E] ml-0.5">{mockDistance(item.id)}</Text>
        </View>
      </View>

      {/* Schedule */}
      <View className="flex-row items-center mb-2">
        <Feather name="calendar" size={15} color="#2ECC71" />
        <Text className="text-[14px] text-[#1b1c1c] font-semibold ml-2">
          {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'ASAP'}
        </Text>
      </View>
      <View className="flex-row items-center mb-4">
        <Feather name="clock" size={15} color="#2ECC71" />
        <Text className="text-[14px] text-[#6D7A6E] ml-2">
          {item.start_time ? `${item.start_time} – ${item.end_time}` : 'Flexible time'}
        </Text>
      </View>

      {/* Actions */}
      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={() => router.push(`/collector/pickup/${item.id}`)}
          className="flex-1 h-[44px] border-2 border-[#ECECEC] rounded-xl items-center justify-center"
        >
          <Text className="text-[#6D7A6E] font-bold text-[14px]">Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleAccept(item)}
          disabled={acceptingId === item.id}
          className={`flex-1 h-[44px] rounded-xl items-center justify-center ${acceptingId === item.id ? 'bg-[#7fc796]' : 'bg-[#2ECC71]'}`}
          style={{ shadowColor: '#2ECC71', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 }}
        >
          {acceptingId === item.id
            ? <ActivityIndicator color="white" size="small" />
            : <Text className="text-white font-bold text-[14px]">Accept Pickup</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8F6]" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-white border-b border-[#ECECEC]">
        <Text className="text-[24px] font-bold text-[#1b1c1c] mb-4">Available Pickups</Text>

        {/* Search */}
        <View className="flex-row items-center bg-[#F4F4F4] rounded-2xl px-4 h-[48px] mb-4">
          <Feather name="search" size={18} color="#8A8F87" />
          <TextInput
            className="flex-1 text-[#1b1c1c] text-[15px] ml-2"
            placeholder="Search by pickup ID or post..."
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

        {/* Category Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              className={`mr-2 px-4 py-2 rounded-full border ${activeCategory === cat ? 'bg-[#1E5631] border-[#1E5631]' : 'bg-white border-[#ECECEC]'}`}
            >
              <Text className={`text-[13px] font-semibold ${activeCategory === cat ? 'text-white' : 'text-[#6D7A6E]'}`}>
                {cat === 'All' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2ECC71" />
          <Text className="text-[#6D7A6E] mt-3">Finding nearby pickups...</Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item.id.toString()}
          renderItem={renderCard}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2ECC71" />}
          ListFooterComponent={
            displayed.length < filtered.length ? (
              <TouchableOpacity
                onPress={() => setPage(p => p + 1)}
                className="py-4 items-center"
              >
                <Text className="text-[#2ECC71] font-bold text-[15px]">Load More</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
