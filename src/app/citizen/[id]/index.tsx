import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Platform, ActivityIndicator, SafeAreaView, Alert, Dimensions, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import PostService, { Post } from '../../../../services/post.service';
import RequestService, { Request, RequestStatus } from '../../../../services/request.service';
import PickupService, { Pickup } from '../../../../services/pickup.service';
import { useAuth } from '../../../../context/AuthProvider';
import { theme } from '../../../theme/tokens';
import { Button, Card } from '../../../components/ui';

const { width: windowWidth } = Dimensions.get('window');

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80';
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80';

const POST_STATUS_STYLES = {
  OPEN: { label: 'Open', bg: '#E8F8EE', text: '#1E5631' },
  CLAIMED: { label: 'In progress', bg: '#FFF8E1', text: '#F59E0B' },
  COMPLETED: { label: 'Completed', bg: '#E8F8EE', text: '#1E5631' },
  DELETED: { label: 'Deleted', bg: '#FEF2F2', text: '#EF4444' },
};

const getQuantityUnit = (category: string) => {
  const liquidCategories = ['ORGANIC', 'HAZARDOUS'];
  return liquidCategories.includes(category) ? 'L' : 'kg';
};

const getPostStatus = (post: Post) => {
  const total = post.quantity ?? 0;
  const reserved = post.reserved_quantity ?? 0;
  const collected = post.collected_quantity ?? 0;
  const available = Math.max(0, total - reserved - collected);

  if (post.status === 'DELETED') return 'DELETED';
  if (post.status === 'COMPLETED') return 'COMPLETED';
  if (available <= 0) return 'CLAIMED';
  if (reserved > 0 || collected > 0) return 'CLAIMED';
  return 'OPEN';
};

const REQUEST_STATUS_STYLES: Record<RequestStatus, { bg: string; text: string; icon: string }> = {
  PENDING: { bg: '#FFF8E1', text: '#F59E0B', icon: 'clock-outline' },
  ACCEPTED: { bg: '#EFF6FF', text: '#3B82F6', icon: 'check-circle-outline' },
  REJECTED: { bg: '#FEF2F2', text: '#EF4444', icon: 'close-circle-outline' },
  WITHDRAWN: { bg: '#F4F4F4', text: '#6D7A6E', icon: 'undo-outline' },
};

const PICKUP_STATUS_STYLES: Record<string, { bg: string; text: string, icon: string }> = {
  PENDING: { bg: '#FFF8E1', text: '#F59E0B', icon: 'clock-outline' },
  REQUESTED: { bg: '#E8F8EE', text: '#1E5631', icon: 'clipboard-outline' },
  ASSIGNED: { bg: '#EFF6FF', text: '#3B82F6', icon: 'truck-outline' },
  IN_TRANSIT: { bg: '#F5F3FF', text: '#8B5CF6', icon: 'truck-fast-outline' },
  COMPLETED: { bg: '#E8F8EE', text: '#1E5631', icon: 'check-circle-outline' },
  CANCELED: { bg: '#FEF2F2', text: '#EF4444', icon: 'cancel-outline' },
  COLLECTED_PENDING_VERIFICATION: { bg: '#E8F8EE', text: '#1E5631', icon: 'clipboard-check-outline' },
};

const formatStatus = (s: string) => s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function CitizenPostDetailScreen() {
  const { id, section } = useLocalSearchParams<{ id: string; section?: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [activePickups, setActivePickups] = useState<Pickup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingRequest, setRefreshingRequest] = useState<string | null>(null);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const isOwner = user?.id === post?.author_id;
  const status = post ? getPostStatus(post) : 'OPEN';
  const total = post?.quantity ?? 0;
  const reserved = post?.reserved_quantity ?? 0;
  const collected = post?.collected_quantity ?? 0;
  const available = Math.max(0, total - reserved - collected);
  const unit = post ? getQuantityUnit(post.category || '') : 'kg';

  const refreshAll = useCallback(async () => {
    if (!id || !post) return;
    const postId = Number(id);
    if (isNaN(postId)) return;

    try {
      // Refresh post
      const updatedPost = await PostService.getPostById(postId);
      setPost(updatedPost);

      // Refresh requests for this post
      const reqs = await RequestService.getRequestsForPost(postId);
      setRequests(reqs);

      // Refresh pickups for this post
      const allPickups = await PickupService.getAllPickups();
      const postPickups = allPickups.filter(p => p.post_id === postId);
      setActivePickups(postPickups);
    } catch (e) {
      console.log('Error refreshing data:', e);
    }
  }, [id, post]);

  // Fetch post details
  const fetchPostDetails = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const postId = Number(id);
      if (isNaN(postId)) throw new Error("Invalid Post ID");
      const data = await PostService.getPostById(postId);
      setPost(data);

      // Fetch requests for this post
      const reqs = await RequestService.getRequestsForPost(postId);
      setRequests(reqs);

      // Fetch pickups for this post
      const allPickups = await PickupService.getAllPickups();
      const postPickups = allPickups.filter(p => p.post_id === postId);
      setActivePickups(postPickups);
    } catch (error) {
      console.error('Error fetching post details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchPostDetails(); }, [fetchPostDetails]);

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [refreshAll])
  );

  const handleAccept = async (request: Request) => {
    Alert.alert(
      'Accept Request',
      `Accept ${request.collector?.name || 'collector'}'s request for ${request.requested_quantity} ${getQuantityUnit(request.post?.category || '')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setRefreshingRequest(request.id.toString());
            try {
              await RequestService.updateRequestStatus(request.id, RequestStatus.ACCEPTED);
              const updatedReqs = requests.map(r => r.id === request.id ? { ...r, status: RequestStatus.ACCEPTED } : r);
              setRequests(updatedReqs);
              await refreshAll();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to accept request');
            } finally {
              setRefreshingRequest(null);
            }
          }
        }
      ]
    );
  };

  const handleReject = async (request: Request) => {
    Alert.alert(
      'Reject Request',
      `Reject ${request.collector?.name || 'collector'}'s request? This will release the reserved quantity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setRefreshingRequest(request.id.toString());
            try {
              await RequestService.updateRequestStatus(request.id, RequestStatus.REJECTED);
              const updatedReqs = requests.map(r => r.id === request.id ? { ...r, status: RequestStatus.REJECTED } : r);
              setRequests(updatedReqs);
              await refreshAll();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to reject request');
            } finally {
              setRefreshingRequest(null);
            }
          }
        }
      ]
    );
  };

  const getImageUri = (url?: string) => {
    if (!url) return DEFAULT_IMAGE;
    const trimmed = url.trim();
    if (!trimmed) return DEFAULT_IMAGE;
    return trimmed.startsWith('http://') && trimmed.includes('cloudinary.com')
      ? trimmed.replace('http://', 'https://')
      : trimmed;
  };

  const imagesToDisplay = post?.images?.map(img => {
    if (typeof img === 'string') return img;
    if (img?.url) return getImageUri(img.url);
    return DEFAULT_IMAGE;
  }) || [DEFAULT_IMAGE];

  const avatarUrl = (post?.author?.avatar || (post as any)?.User?.avatar || DEFAULT_AVATAR) as string;
  const ownerName = (post?.author?.name || (post as any)?.User?.name || 'Supplier') as string;
  const categoryText = post?.category ? post.category.charAt(0).toUpperCase() + post.category.slice(1).toLowerCase() : 'General';
  const locationText = post?.address || post?.location || 'Location not specified';
  const hasCoordinates = !!post?.latitude && !!post?.longitude;

  // Scroll to requests section on mount if section param
  const requestsSectionRef = React.useRef<ScrollView>(null);
  useEffect(() => {
    if (section === 'requests' && requestsSectionRef.current) {
      requestsSectionRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [section]);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.emerald[500]} />
          <Text style={{ marginTop: theme.spacing.md, color: theme.colors.text.secondary, fontFamily: theme.typography.fontFamily.medium }}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error / Not Found
  if (!post) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas.primary, paddingHorizontal: theme.spacing.xl }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color={theme.colors.error} />
          <Text style={{ marginTop: theme.spacing.md, color: theme.colors.text.primary, fontFamily: theme.typography.fontFamily.bold, fontSize: theme.typography.fontSize.lg.size }}>Post Not Found</Text>
          <Text style={{ marginTop: theme.spacing.xs, color: theme.colors.text.secondary, textAlign: 'center' }}>The listing you are looking for might have been deleted or moved.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: theme.spacing.lg, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md, backgroundColor: theme.colors.emerald[500], borderRadius: theme.radius.full }}>
            <Text style={{ color: theme.colors.text.inverse, fontFamily: theme.typography.fontFamily.semiBold }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = POST_STATUS_STYLES[status as keyof typeof POST_STATUS_STYLES] || POST_STATUS_STYLES.OPEN;

  const renderQuantityBreakdown = () => (
    <Card variant="elevated" style={{ padding: theme.spacing.md, borderRadius: theme.radius.xl, marginBottom: theme.spacing.lg }}>
      <Text style={{ fontSize: theme.typography.fontSize.md.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text.primary, marginBottom: theme.spacing.md }}>
        Quantity Breakdown
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: theme.spacing.md }}>
        <View style={{ flex: 1, minWidth: 70, padding: theme.spacing.md, backgroundColor: theme.colors.mint[50], borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.mint[200] }}>
          <Text style={{ fontSize: theme.typography.fontSize.xs.size, color: theme.colors.text.tertiary, fontFamily: theme.typography.fontFamily.medium }}>Total</Text>
          <Text style={{ fontSize: theme.typography.fontSize.xl.size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text.primary, marginTop: theme.spacing.xs }}>{total} {unit}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 70, padding: theme.spacing.md, backgroundColor: '#FFF8E1', borderRadius: theme.radius.md, borderWidth: 1, borderColor: '#FFE082' }}>
          <Text style={{ fontSize: theme.typography.fontSize.xs.size, color: theme.colors.text.tertiary, fontFamily: theme.typography.fontFamily.medium }}>Reserved</Text>
          <Text style={{ fontSize: theme.typography.fontSize.xl.size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.warning, marginTop: theme.spacing.xs }}>{reserved} {unit}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 70, padding: theme.spacing.md, backgroundColor: '#E8F8EE', borderRadius: theme.radius.md, borderWidth: 1, borderColor: '#BBF7D0' }}>
          <Text style={{ fontSize: theme.typography.fontSize.xs.size, color: theme.colors.text.tertiary, fontFamily: theme.typography.fontFamily.medium }}>Collected</Text>
          <Text style={{ fontSize: theme.typography.fontSize.xl.size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.success, marginTop: theme.spacing.xs }}>{collected} {unit}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 70, padding: theme.spacing.md, backgroundColor: '#EFF6FF', borderRadius: theme.radius.md, borderWidth: 1, borderColor: '#BFDBFE' }}>
          <Text style={{ fontSize: theme.typography.fontSize.xs.size, color: theme.colors.text.tertiary, fontFamily: theme.typography.fontFamily.medium }}>Available</Text>
          <Text style={{ fontSize: theme.typography.fontSize.xl.size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.emerald[600], marginTop: theme.spacing.xs }}>{available} {unit}</Text>
        </View>
      </View>
    </Card>
  );

  const renderIncomingRequests = () => {
    const pendingRequests = requests.filter(r => r.status === RequestStatus.PENDING);

    return (
      <View style={{ paddingHorizontal: theme.spacing.xl, marginBottom: theme.spacing.lg }}>
        <Text style={{ fontSize: theme.typography.fontSize.lg.size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text.primary, marginBottom: theme.spacing.md }}>
          Incoming Requests
        </Text>
        {pendingRequests.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24, backgroundColor: theme.colors.canvas.primary, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border.default }}>
            <MaterialCommunityIcons name="clipboard-outline" size={48} color={theme.colors.text.tertiary} />
            <Text style={{ marginTop: theme.spacing.md, color: theme.colors.text.secondary, fontFamily: theme.typography.fontFamily.medium }}>
              No pending requests
            </Text>
          </View>
        ) : (
          pendingRequests.map(request => {
            const statusStyle = REQUEST_STATUS_STYLES[request.status];
            const unit = getQuantityUnit((request.post?.category as string || ''));
            const collectorName = request.collector?.name || 'Unknown Collector';
            const isActionLoading = refreshingRequest === request.id.toString();

            return (
              <View key={request.id} style={{ backgroundColor: theme.colors.canvas.primary, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border.default, marginBottom: theme.spacing.md, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', padding: theme.spacing.md, gap: theme.spacing.md }}>
                  <View style={{ width: 60, height: 60, borderRadius: theme.radius.md, backgroundColor: theme.colors.canvas.tertiary, justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="recycle" size={24} color={statusStyle.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: theme.typography.fontSize.md.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text.primary }}>
                      {collectorName}
                    </Text>
                    <Text style={{ fontSize: theme.typography.fontSize.sm.size, color: theme.colors.text.secondary, marginTop: theme.spacing.xs }}>
                      Requested: {request.requested_quantity} {unit}
                    </Text>
                    {request.message && (
                      <Text style={{ fontSize: theme.typography.fontSize.sm.size, color: theme.colors.text.tertiary, marginTop: theme.spacing.xs }}>
                        {request.message}
                      </Text>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs }}>
                      <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: theme.spacing.xs, paddingVertical: 2, borderRadius: theme.radius.sm }}>
                        <Text style={{ fontSize: theme.typography.fontSize.xs.size, color: statusStyle.text, fontFamily: theme.typography.fontFamily.medium }}>
                          {formatStatus(request.status)}
                        </Text>
                      </View>
                      {request.created_at && (
                        <Text style={{ marginLeft: theme.spacing.sm, fontSize: theme.typography.fontSize.xs.size, color: theme.colors.text.tertiary }}>
                          {new Date(request.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                {request.status === RequestStatus.PENDING && (
                  <View style={{ flexDirection: 'row', gap: theme.spacing.md, paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md }}>
                    <Button
                      title="Reject"
                      variant="secondary"
                      size="sm"
                      onPress={() => handleReject(request)}
                      disabled={isActionLoading}
                    />
                    <Button
                      title={isActionLoading ? 'Accepting...' : 'Accept'}
                      variant="primary"
                      size="sm"
                      onPress={() => handleAccept(request)}
                      disabled={isActionLoading}
                    />
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    );
  };

  const renderActivePickups = () => {
    // Only show for owner, and status COLLECTED_PENDING_VERIFICATION
    const verificationPickups = activePickups.filter(p => (p.status as string) === 'COLLECTED_PENDING_VERIFICATION');

    if (verificationPickups.length === 0) return null;

    return (
      <View style={{ paddingHorizontal: theme.spacing.xl, marginBottom: theme.spacing.lg }}>
        <Text style={{ fontSize: theme.typography.fontSize.lg.size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text.primary, marginBottom: theme.spacing.md }}>
          Awaiting Verification
        </Text>
        {verificationPickups.map(pickup => {
          const statusStyle = PICKUP_STATUS_STYLES[pickup.status as string] || PICKUP_STATUS_STYLES.PENDING;
          const collectedQty = pickup.collected_weight || 0;

          return (
            <View key={pickup.id} style={{ backgroundColor: theme.colors.canvas.primary, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border.default, marginBottom: theme.spacing.md, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', padding: theme.spacing.md, gap: theme.spacing.md }}>
                <View style={{ width: 60, height: 60, borderRadius: theme.radius.md, backgroundColor: theme.colors.canvas.tertiary, justifyContent: 'center', alignItems: 'center' }}>
                  <Feather name="truck" size={24} color={statusStyle.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: theme.typography.fontSize.md.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text.primary }}>
                    {pickup.post?.title || 'Pickup #' + pickup.id}
                  </Text>
                  <Text style={{ fontSize: theme.typography.fontSize.sm.size, color: theme.colors.text.secondary, marginTop: theme.spacing.xs }}>
                    Reported quantity: {collectedQty} {unit}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs }}>
                    <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: theme.spacing.xs, paddingVertical: 2, borderRadius: theme.radius.sm }}>
                      <Text style={{ fontSize: theme.typography.fontSize.xs.size, color: statusStyle.text, fontFamily: theme.typography.fontFamily.medium }}>
                        {formatStatus(pickup.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: theme.spacing.md, paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md }}>
                <Button
                  title="Verify"
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    // Navigate to pickup details for verification
                    router.push(`/pickups/${pickup.id}`);
                  }}
                />
                <Button
                  title="Reject"
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    Alert.alert('Reject Collection', 'Reject the reported collection?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Reject', style: 'destructive', onPress: () => {
                        // Would call PickupService to reject
                      }}
                    ]);
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas.primary }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.emerald[500]} />}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Image Header */}
        <View style={{ width: '100%', height: 350, position: 'relative' }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ width: '100%', height: '100%' }}
          >
            {imagesToDisplay.map((imgUrl: string, index: number) => (
              <Image
                key={index}
                source={{ uri: imgUrl }}
                style={{ width: windowWidth, height: 350 }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.1)' }} pointerEvents="none" />

          {/* Top Actions: Back Button Only (no heart) */}
          <View style={{ position: 'absolute', top: Platform.OS === 'ios' ? 50 : 60, left: theme.spacing.xl, right: theme.spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, backgroundColor: theme.colors.canvas.primary, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...theme.shadows.md }}>
              <Feather name="arrow-left" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Body */}
        <View style={{ backgroundColor: theme.colors.canvas.primary, borderTopLeftRadius: theme.radius['2xl'], borderTopRightRadius: theme.radius['2xl'], marginTop: -24, paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing['3xl'] }}>
          <View style={{ width: 40, height: 4, backgroundColor: theme.colors.border.default, borderRadius: 2, alignSelf: 'center', marginBottom: theme.spacing.lg }} />

          {/* Badges Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <View style={{ backgroundColor: theme.colors.warning, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full }}>
              <Text style={{ color: theme.colors.text.inverse, fontSize: theme.typography.fontSize.xs.size, fontFamily: theme.typography.fontFamily.bold }}>
                {available} {unit} available
              </Text>
            </View>
            <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full }}>
              <Text style={{ color: statusStyle.text, fontSize: theme.typography.fontSize.xs.size, fontFamily: theme.typography.fontFamily.bold }}>
                {statusStyle.label}
              </Text>
            </View>
          </View>

          {/* Title & Metadata */}
          <Text style={{ fontSize: theme.typography.fontSize['2xl'].size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text.primary, marginBottom: theme.spacing.sm }}>
            {post.title || 'Untitled Listing'}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <MaterialCommunityIcons name="recycle" size={18} color={theme.colors.emerald[600]} />
              <Text style={{ fontSize: theme.typography.fontSize.md.size, color: theme.colors.text.secondary, fontFamily: theme.typography.fontFamily.medium }}>{categoryText}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <Feather name="map-pin" size={16} color={theme.colors.text.tertiary} />
              <Text style={{ fontSize: theme.typography.fontSize.md.size, color: theme.colors.text.secondary, fontFamily: theme.typography.fontFamily.medium }}>{locationText}</Text>
            </View>
          </View>

          {/* Quantity Breakdown for Owner */}
          {isOwner && renderQuantityBreakdown()}

          {/* Incoming Requests Section */}
          {isOwner && renderIncomingRequests()}

          {/* Active Pickups Section */}
          {isOwner && renderActivePickups()}

          {/* Description Card */}
          <Card variant="elevated" style={{ marginBottom: theme.spacing.lg }}>
            <Text style={{ fontSize: theme.typography.fontSize.xs.size, color: theme.colors.text.tertiary, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 1, marginBottom: theme.spacing.sm }}>DESCRIPTION</Text>
            <Text style={{ fontSize: theme.typography.fontSize.md.size, color: theme.colors.text.secondary, lineHeight: 24 }}>
              {post.description || 'No description provided.'}
            </Text>
          </Card>

          {/* Mini Map - Only if coordinates exist */}
          {hasCoordinates && (
            <View style={{ width: '100%', height: 160, borderRadius: theme.radius.xl, overflow: 'hidden', backgroundColor: theme.colors.canvas.tertiary, marginBottom: theme.spacing.lg }}>
              <Image
                source={{
                  uri: `https://staticmap.openstreetmap.de/staticmap.php?center=${post.latitude},${post.longitude}&zoom=14&size=400x200&markers=${post.latitude},${post.longitude},red-pushpin`
                }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Seller Profile Box */}
          <Card variant="elevated" style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md }}>
            <Image source={{ uri: avatarUrl }} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.canvas.tertiary }} />
            <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
              <Text style={{ fontSize: theme.typography.fontSize.md.size, fontFamily: theme.typography.fontFamily.semiBold, color: theme.colors.text.primary }}>
                {ownerName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs }}>
                <Text style={{ fontSize: theme.typography.fontSize.sm.size, color: theme.colors.text.tertiary }}>Supplier</Text>
                <Text style={{ fontSize: theme.typography.fontSize.sm.size, color: theme.colors.text.quaternary, marginHorizontal: theme.spacing.xs }}>•</Text>
                <Ionicons name="star" size={14} color={theme.colors.warning} />
                <Text style={{ fontSize: theme.typography.fontSize.sm.size, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text.primary, marginLeft: theme.spacing.xs }}>4.8</Text>
              </View>
            </View>
            <TouchableOpacity style={{ width: 40, height: 40, borderWidth: 1, borderColor: theme.colors.border.default, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="message-text-outline" size={20} color={theme.colors.emerald[600]} />
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Bar - Owner only sees Update/Delete */}
      {isOwner && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.colors.canvas.primary, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border.default, paddingBottom: Platform.OS === 'ios' ? 34 : 16, flexDirection: 'row', gap: theme.spacing.md }}>
          <Button
            title={status === 'OPEN' ? 'Update Post' : 'View Details'}
            variant={status === 'OPEN' ? 'primary' : 'secondary'}
            size="md"
            onPress={() => router.push(`/citizen/${post!.id}/update-post`)}
            fullWidth
            icon={<Feather name="edit-2" size={20} color={theme.colors.text.inverse} />}
            iconPosition="left"
          />
        </View>
      )}
    </SafeAreaView>
  );
}