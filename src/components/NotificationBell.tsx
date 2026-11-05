import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { isAxiosError } from 'axios';
import api from '../../lib/api';

export default function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    const startedAt = Date.now();
    console.info('[Notifications] API_REQUEST_STARTED', {
      endpoint: '/notification/unread-count',
    });
    try {
      const response = await api.get('/notification/unread-count');
      console.info('[Notifications] API_REQUEST_SUCCESS', {
        endpoint: '/notification/unread-count',
        status: response.status,
        durationMs: Date.now() - startedAt,
        authorizationHeaderPresent: Boolean(
          response.config.headers.get('Authorization'),
        ),
      });
      setUnreadCount(Number(response.data) || 0);
    } catch (error) {
      console.error('[Notifications] API_REQUEST_FAILED', {
        endpoint: '/notification/unread-count',
        status: isAxiosError(error) ? error.response?.status : undefined,
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [])
  );

  const handlePress = () => {
    const targetRoute = '/notifications';
    console.info('[Notifications] NOTIFICATION_BUTTON_PRESSED');
    console.info('[Notifications] NAVIGATION_STARTED');
    console.info('[Notifications] TARGET_ROUTE', targetRoute);
    router.push(targetRoute as any);
  };

  const displayCount = unreadCount > 9 ? '9+' : unreadCount.toString();

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      className="relative w-10 h-10 items-center justify-center"
      activeOpacity={0.7}
    >
      <Feather name="bell" size={24} color="#1b1c1c" />
      {unreadCount > 0 && (
        <View className="absolute top-1 right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
          <Text className="text-white text-[10px] font-bold">{displayCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
