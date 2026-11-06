import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import api from '../../lib/api';
import * as SecureStore from 'expo-secure-store';

// Set global notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const router = useRouter();
  
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        // Did not grant permission. OS will prevent repeated prompts anyway.
        return null;
      }
      
      try {
        // Get raw FCM/APNS token as per requirements
        const tokenData = await Notifications.getDevicePushTokenAsync();
        token = tokenData.data;
      } catch (e) {
        console.warn("Could not get device push token", e);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  };

  const initPushNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      
      if (token) {
        setDeviceToken(token);
        await SecureStore.setItemAsync("push_device_token", token);
        
        try {
          await api.post('/notification/device-token', {
            token,
            platform: Platform.OS.toUpperCase()
          });
        } catch (err: any) {
          // Silently ignore 409 already registered
          if (err?.response?.status !== 409) {
            console.log('Failed to register device token', err);
          }
        }
      } else {
        console.log('No push token available (Firebase not yet configured). Continuing without push notifications.');
      }
    } catch (e) {
      console.warn('Push notification initialization failed gracefully:', e);
    }
  };

  useEffect(() => {
    // Listener for receiving notifications while in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // You can handle foreground UI updates here if needed
    });

    // Listener for tapping a notification (background/killed state)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const actionUrl = data?.actionUrl;
      
      if (actionUrl && typeof actionUrl === 'string' && actionUrl.startsWith('/')) {
        router.push(actionUrl as any);
      }
    });

    // Listener for FCM token rotation — re-register the new token
    const pushTokenListener = Notifications.addPushTokenListener(async (tokenResponse) => {
      const newToken = tokenResponse.data;
      if (!newToken) return;

      try {
        await api.post('/notification/device-token', {
          token: newToken,
          platform: Platform.OS.toUpperCase(),
        });
        await SecureStore.setItemAsync("push_device_token", newToken);
        setDeviceToken(newToken);
      } catch (err: any) {
        if (err?.response?.status !== 409) {
          console.log('Failed to re-register rotated push token', err);
        }
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      pushTokenListener?.remove();
    };
  }, []);

  return {
    deviceToken,
    initPushNotifications
  };
}
