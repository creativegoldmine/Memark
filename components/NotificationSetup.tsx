import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function NotificationSetup() {
  const { user } = useAuth();
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications();

      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response:', response);
        handleNotificationResponse(response);
      });

      return () => {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
        if (responseListener.current) {
          responseListener.current.remove();
        }
      };
    }
  }, [user?.id]);

  const registerForPushNotifications = async () => {
    if (!user?.id) return;

    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web');
      return;
    }

    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification');
        return;
      }

      try {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Push token:', token);

        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('push_tokens')
          .eq('user_id', user.id)
          .single();

        const existingTokens = prefs?.push_tokens || [];
        if (!existingTokens.includes(token)) {
          await supabase
            .from('notification_preferences')
            .upsert({
              user_id: user.id,
              push_tokens: [...existingTokens, token],
              enable_push_notifications: true,
            });
        }
      } catch (tokenError: any) {
        if (tokenError?.message?.includes('projectId')) {
          console.warn('Push notifications require EAS project setup. Skipping for now.');
        } else {
          console.error('Error getting push token:', tokenError);
        }
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8B5CF6',
        });
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    if (data?.item_ids) {
      console.log('Navigate to items:', data.item_ids);
    } else if (data?.folder_id) {
      console.log('Navigate to folder:', data.folder_id);
    }
  };

  return null;
}
