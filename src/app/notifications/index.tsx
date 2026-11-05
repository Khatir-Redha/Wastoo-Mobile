import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  SafeAreaView,
  Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { isAxiosError } from 'axios';
import { useAuth } from '../../../context/AuthProvider';
import api from '../../../lib/api';

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  read: boolean;
  metadata?: unknown;
  created_at: string;
};

type NotificationListResponse = {
  notification: NotificationItem[];
  count: number;
};

const isNotificationItem = (value: unknown): value is NotificationItem => {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'number' &&
    Number.isSafeInteger(item.id) &&
    typeof item.type === 'string' &&
    typeof item.title === 'string' &&
    typeof item.body === 'string' &&
    typeof item.read === 'boolean' &&
    typeof item.created_at === 'string'
  );
};

// Map of notification types to icons and colors
const TYPE_MAPPING: Record<string, { icon: any, color: string, bg: string }> = {
  PICKUP: { icon: 'truck', color: '#2ECC71', bg: '#E8F8EE' },
  WALLET: { icon: 'dollar-sign', color: '#F1C40F', bg: '#FEF9E7' },
  BADGE: { icon: 'award', color: '#9B59B6', bg: '#F5EEF8' },
  CHALLENGE: { icon: 'target', color: '#E67E22', bg: '#FDF2E9' },
  MARKETPLACE: { icon: 'shopping-bag', color: '#3498DB', bg: '#EBF5FB' },
  CHARITY: { icon: 'heart', color: '#E74C3C', bg: '#FDEDEC' },
  SYSTEM: { icon: 'info', color: '#34495E', bg: '#EAECEE' },
  ADMIN: { icon: 'shield', color: '#E74C3C', bg: '#FDEDEC' },
  BADGE_AWARDED: { icon: 'award', color: '#9B59B6', bg: '#F5EEF8' },
};

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
};

export default function NotificationCenterScreen() {
  const router = useRouter();
  const { authState, user } = useAuth();
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Note: Backend currently returns a hardcoded `take: 10` and doesn't accept pagination params.
  // The infinite scroll UI is implemented here, but will not fetch further until backend supports it.
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  useEffect(() => {
    console.info('[Notifications] SCREEN_MOUNTED');
    console.info('[Notifications] INITIALIZATION_STARTED');
    return () => console.info('[Notifications] SCREEN_UNMOUNTED');
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.info('[Notifications] SCREEN_FOCUSED');
      return () => console.info('[Notifications] SCREEN_BLURRED');
    }, []),
  );

  useEffect(() => {
    console.info('[Notifications] AUTH_STATE', {
      authState,
      role: user?.role ?? null,
      profileAvailable: Boolean(user),
    });
  }, [authState, user]);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    const endpoint = '/notification';
    const startedAt = Date.now();
    console.info('[Notifications] API_REQUEST_STARTED', { endpoint });
    setFetchError(null);
    try {
      if (isRefresh) {
        setPage(1);
      }
      
      const response = await api.get('/notification', { params: { page: isRefresh ? 1 : page } });
      const body = response.data as Partial<NotificationListResponse> | null;
      if (!body || !Array.isArray(body.notification)) {
        throw new Error('Notification response did not contain a notification list.');
      }
      const list = body.notification.filter(isNotificationItem);
      const invalidItemCount = body.notification.length - list.length;
      console.info('[Notifications] API_REQUEST_SUCCESS', {
        endpoint,
        status: response.status,
        durationMs: Date.now() - startedAt,
        responseKeys: Object.keys(body),
        notificationCount: list.length,
        invalidItemCount,
        totalCount: typeof body.count === 'number' ? body.count : null,
        authorizationHeaderPresent: Boolean(
          response.config.headers.get('Authorization'),
        ),
      });
      if (invalidItemCount > 0) {
        console.warn('[Notifications] Invalid notification payloads omitted', {
          invalidItemCount,
        });
      }
      
      if (isRefresh) {
        setNotifications(list);
      } else {
        setNotifications(prev => [...prev, ...list]);
      }
      
      setHasMore(false); 
      console.info('[Notifications] INITIALIZATION_COMPLETED');
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load notifications.';
      setFetchError(message);
      console.error('[Notifications] INITIALIZATION_FAILED', {
        message,
        stack: error instanceof Error ? error.stack : undefined,
      });
      console.error('[Notifications] API_REQUEST_FAILED', {
        endpoint,
        status: isAxiosError(error) ? error.response?.status : undefined,
        responseKeys:
          isAxiosError(error) &&
          typeof error.response?.data === 'object' &&
          error.response.data !== null
            ? Object.keys(error.response.data)
            : [],
        durationMs: Date.now() - startedAt,
        message,
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchNotifications(true);
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    const endpoint = '/notification/read-all';
    const startedAt = Date.now();
    console.info('[Notifications] API_REQUEST_STARTED', { endpoint });
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      const response = await api.patch(endpoint);
      console.info('[Notifications] API_REQUEST_SUCCESS', {
        endpoint,
        status: response.status,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      console.error('[Notifications] API_REQUEST_FAILED', {
        endpoint,
        status: isAxiosError(error) ? error.response?.status : undefined,
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Revert optimistic update on failure could be handled here
    }
  };

  const resolveDestination = (item: NotificationItem): string | null => {
    const actionUrl = item.actionUrl?.trim();
    if (actionUrl) {
      const routeRoot = actionUrl.split(/[/?#]/)[1];
      const supportedRoots = new Set([
        'citizen',
        'collector',
        'notifications',
        'pickups',
      ]);
      if (
        actionUrl.startsWith('/') &&
        !actionUrl.startsWith('//') &&
        !actionUrl.split('/').includes('..') &&
        routeRoot &&
        supportedRoots.has(routeRoot)
      ) {
        return actionUrl;
      }
      console.warn('[Notifications] Invalid notification destination', {
        notificationId: item.id,
        type: item.type,
        actionUrl,
      });
      return null;
    }

    if (item.type === 'PICKUP') return '/pickups';
    if (item.type === 'BADGE_AWARDED' && user?.role === 'CITIZEN') {
      return '/citizen/gamification';
    }
    return null;
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    if (!Number.isSafeInteger(item.id) || item.id <= 0) {
      console.warn('[Notifications] Invalid notification payload', {
        type: item.type,
        hasId: Number.isSafeInteger(item.id),
      });
      return;
    }

    if (!item.read) {
      setNotifications(prev => 
        prev.map(n => n.id === item.id ? { ...n, read: true } : n)
      );
      const endpoint = `/notification/${item.id}/read`;
      const startedAt = Date.now();
      console.info('[Notifications] API_REQUEST_STARTED', { endpoint });
      try {
        const response = await api.patch(endpoint);
        console.info('[Notifications] API_REQUEST_SUCCESS', {
          endpoint,
          status: response.status,
          durationMs: Date.now() - startedAt,
        });
      } catch (error) {
        console.error('[Notifications] API_REQUEST_FAILED', {
          endpoint,
          status: isAxiosError(error) ? error.response?.status : undefined,
          durationMs: Date.now() - startedAt,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }

    const targetRoute = resolveDestination(item);
    if (targetRoute) {
      console.info('[Notifications] NAVIGATION_STARTED', {
        notificationId: item.id,
        type: item.type,
      });
      console.info('[Notifications] TARGET_ROUTE', targetRoute);
      router.push(targetRoute as any);
    } else {
      console.info('[Notifications] No destination available for notification', {
        notificationId: item.id,
        type: item.type,
        hasActionUrl: Boolean(item.actionUrl),
        hasMetadata: Boolean(item.metadata),
      });
    }
  };

  const handleDelete = async (id: number) => {
    // Optimistically remove from list
    setNotifications(prev => prev.filter(n => n.id !== id));
    const endpoint = `/notification/${id}`;
    const startedAt = Date.now();
    console.info('[Notifications] API_REQUEST_STARTED', { endpoint });
    try {
      const response = await api.delete(endpoint);
      console.info('[Notifications] API_REQUEST_SUCCESS', {
        endpoint,
        status: response.status,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      console.error('[Notifications] API_REQUEST_FAILED', {
        endpoint,
        status: isAxiosError(error) ? error.response?.status : undefined,
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  const renderRightActions = (id: number) => {
    return (
      <TouchableOpacity
        onPress={() => handleDelete(id)}
        className="bg-red-500 w-[80px] h-full items-center justify-center rounded-r-xl"
      >
        <Feather name="trash-2" size={24} color="white" />
      </TouchableOpacity>
    );
  };

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => {
    const isSystem = item.type === 'SYSTEM';
    const config = TYPE_MAPPING[item.type] || { icon: 'bell', color: '#6B7280', bg: '#F3F4F6' };
    
    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => handleNotificationPress(item)}
          className={`flex-row p-4 mb-3 rounded-xl border ${
            item.read ? 'bg-white border-[#F3F4F6]' : 'bg-[#F9FAFB] border-[#E5E7EB]'
          } ${isSystem && !item.read ? 'border-[#34495E] border-l-4' : ''}`}
        >
          {/* Icon */}
          <View 
            className="w-12 h-12 rounded-full items-center justify-center mr-4"
            style={{ backgroundColor: config.bg }}
          >
            <Feather name={config.icon} size={24} color={config.color} />
          </View>
          
          {/* Content */}
          <View className="flex-1">
            <View className="flex-row justify-between items-start mb-1">
              <Text 
                className={`flex-1 text-[16px] mr-2 ${item.read ? 'text-[#374151] font-medium' : 'text-[#111827] font-bold'}`}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text className="text-[12px] text-[#9CA3AF] mt-0.5">
                {getRelativeTime(item.created_at)}
              </Text>
            </View>
            
            <Text 
              className={`text-[14px] leading-5 ${item.read ? 'text-[#6B7280]' : 'text-[#4B5563]'}`}
              numberOfLines={2}
            >
              {item.body}
            </Text>
          </View>
          
          {/* Unread Indicator */}
          {!item.read && (
            <View className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-blue-500" />
          )}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  // Filtering
  const types = ['ALL', 'SYSTEM', 'PICKUP', 'WALLET', 'BADGE_AWARDED', 'CHALLENGE', 'MARKETPLACE', 'CHARITY', 'ADMIN'];
  const filteredNotifications = activeFilter === 'ALL' 
    ? notifications 
    : notifications.filter(n => n.type === activeFilter);

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#ECECEC]">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2">
            <Feather name="arrow-left" size={24} color="#1b1c1c" />
          </TouchableOpacity>
          <Text className="text-[20px] font-bold text-[#1b1c1c] ml-1">Notifications</Text>
        </View>
        
        {notifications.some(n => !n.read) && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text className="text-[#2ECC71] font-medium">Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View className="border-b border-[#ECECEC]">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={types}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveFilter(item)}
              className={`px-4 py-2 rounded-full mr-2 border ${
                activeFilter === item 
                  ? 'bg-[#1b1c1c] border-[#1b1c1c]' 
                  : 'bg-white border-[#E5E7EB]'
              }`}
            >
              <Text className={`font-medium text-[13px] ${
                activeFilter === item ? 'text-white' : 'text-[#6B7280]'
              }`}>
                {item === 'ALL' ? 'All' : item.charAt(0) + item.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      {loading && page === 1 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2ECC71" />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderNotificationItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2ECC71" />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => 
            hasMore ? <ActivityIndicator size="small" color="#2ECC71" className="my-4" /> : null
          }
          ListEmptyComponent={() => (
            <View className="flex-1 items-center justify-center pt-20">
              <View className="w-24 h-24 bg-[#F3F4F6] rounded-full items-center justify-center mb-6">
                <Feather name={fetchError ? 'alert-circle' : 'bell-off'} size={32} color="#9CA3AF" />
              </View>
              <Text className="text-[18px] font-bold text-[#111827] mb-2">
                {fetchError ? 'Could not load notifications' : 'No notifications yet'}
              </Text>
              <Text className="text-[#6B7280] text-center max-w-[250px]">
                {fetchError || "When you get updates about pickups, rewards, or system alerts, they'll show up here."}
              </Text>
              {fetchError ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => {
                    setLoading(true);
                    void fetchNotifications(true);
                  }}
                  className="mt-4 rounded-lg bg-[#087F5B] px-5 py-3"
                >
                  <Text className="font-semibold text-white">Retry</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
