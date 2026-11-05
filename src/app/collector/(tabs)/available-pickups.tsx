import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  ScrollView, RefreshControl, SafeAreaView, Platform, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import PickupService, { Pickup } from '../../../../services/pickup.service';
import { useAuth } from '../../../../context/AuthProvider';
import NotificationBell from '../../../components/NotificationBell';
import { theme } from '../../../theme/tokens';
import { Button, Card, Input } from '../../../components/ui';

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

  const renderHeader = () => {
    const firstName = user?.name?.split(' ')[0] || 'Collector';
    return (
      <View style={{ paddingHorizontal: theme.spacing.xl, paddingTop: Platform.OS === 'ios' ? 20 : 44, paddingBottom: theme.spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back to posts"
          onPress={() => router.back()}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.sm }}
        >
          <Feather name="arrow-left" size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: theme.typography.fontSize['2xl'].size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text.primary, marginBottom: theme.spacing.xs }}>
            Hello, {firstName}!
          </Text>
          <Text style={{ fontSize: theme.typography.fontSize.md.size, color: theme.colors.text.secondary }}>
            Available waste to collect
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <NotificationBell />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas.secondary }}>
      {renderHeader()}
      
      <View style={{ marginHorizontal: theme.spacing.xl, marginBottom: theme.spacing.md }}>
        <Input
          placeholder="Search pickup ID..."
          value={search}
          onChangeText={setSearch}
          icon="search"
        />
      </View>

      <View style={{ marginBottom: theme.spacing.md, paddingBottom: theme.spacing.sm }}>
        <Text style={{ fontSize: theme.typography.fontSize.md.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text.primary, marginHorizontal: theme.spacing.xl, marginBottom: theme.spacing.md }}>
          Categories
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: theme.spacing.xl }}>
          {['All', 'PLASTIC', 'PAPER', 'METAL', 'GLASS', 'ORGANIC'].map(category => {
            const isActive = activeCategory === category;
            return (
              <TouchableOpacity
                key={category}
                onPress={() => setActiveCategory(category)}
                style={{
                  marginRight: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.lg,
                  borderRadius: theme.radius.md,
                  backgroundColor: isActive ? theme.colors.emerald[500] : theme.colors.canvas.primary,
                  borderWidth: isActive ? 0 : 1,
                  borderColor: theme.colors.border.default,
                  flexDirection: 'row',
                  alignItems: 'center',
                  ...theme.shadows.sm,
                }}
              >
                <Text style={{ fontSize: theme.typography.fontSize.md.size, color: isActive ? theme.colors.text.inverse : theme.colors.text.primary, fontFamily: theme.typography.fontFamily.medium }}>
                  {category === 'All' ? 'All' : category.charAt(0) + category.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {!loading && !error && pickups.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
          <View style={{ alignItems: 'center', paddingHorizontal: theme.spacing.xl }}>
            <MaterialCommunityIcons name="truck-check-outline" size={64} color={theme.colors.mint[500]} />
            <Text style={{ fontSize: theme.typography.fontSize.lg.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text.primary, marginTop: theme.spacing.lg, textAlign: 'center' }}>
              No Pickups Available
            </Text>
            <Text style={{ fontSize: theme.typography.fontSize.md.size, color: theme.colors.text.secondary, marginTop: theme.spacing.sm, textAlign: 'center' }}>
              Check back later for new collection opportunities
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.emerald[500]} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/collector/pickup/${item.id}`)}
              activeOpacity={0.8}
              style={{ marginBottom: theme.spacing.md }}
            >
              <Card variant="elevated" style={{ borderRadius: theme.radius.xl }}>
                <View style={{ padding: theme.spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.emerald[50], paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.sm }}>
                      <MaterialCommunityIcons name="recycle" size={16} color={theme.colors.emerald[500]} />
                      <Text style={{ fontSize: theme.typography.fontSize.sm.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.emerald[500], marginLeft: theme.spacing.xs }}>
                        Post #{item.post_id}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Feather name="map-pin" size={12} color={theme.colors.text.quaternary} />
                      <Text style={{ marginLeft: theme.spacing.xs, fontSize: theme.typography.fontSize.sm.size, color: theme.colors.text.secondary }}>
                        Nearby
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
                    <Feather name="calendar" size={14} color={theme.colors.emerald[500]} />
                    <Text style={{ marginLeft: theme.spacing.sm, fontSize: theme.typography.fontSize.base.size, color: theme.colors.text.primary }}>
                      Flexible pickup
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                    <Feather name="clock" size={14} color={theme.colors.text.tertiary} />
                    <Text style={{ marginLeft: theme.spacing.sm, fontSize: theme.typography.fontSize.base.size, color: theme.colors.text.secondary }}>
                      Scheduled time TBD
                    </Text>
                  </View>

                  <Button
                    title={!isVerified ? 'Verify to Accept' : 'Accept Pickup'}
                    variant={!isVerified ? 'secondary' : 'primary'}
                    size="md"
                    onPress={() => handleAccept(item)}
                    disabled={!isVerified}
                    fullWidth
                  />
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}

      {loading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator size="large" color={theme.colors.emerald[500]} />
          <Text style={{ marginTop: theme.spacing.md, fontSize: theme.typography.fontSize.md.size, color: theme.colors.text.secondary }}>Loading pickups...</Text>
        </View>
      )}

      {error && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: theme.spacing.xl }}>
          <Feather name="wifi-off" size={64} color={theme.colors.mint[500]} />
          <Text style={{ fontSize: theme.typography.fontSize.lg.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text.primary, marginTop: theme.spacing.lg, textAlign: 'center' }}>
            Connection Error
          </Text>
          <Text style={{ fontSize: theme.typography.fontSize.md.size, color: theme.colors.text.secondary, marginTop: theme.spacing.sm, textAlign: 'center' }}>
            {error}
          </Text>
          <Button
            title="Retry"
            variant="primary"
            size="md"
            onPress={fetchPickups}
            style={{ marginTop: theme.spacing.xl }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
