import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export function ShareHandler() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const handleIncomingURL = async (event: { url: string }) => {
      try {
        const { path, queryParams } = Linking.parse(event.url);

        if (!path) return;

        if (path === 'share') {
          if (!user?.id) {
            Alert.alert('Please log in', 'You need to be logged in to save shared content');
            return;
          }

          const content = queryParams?.content as string;
          const type = queryParams?.type as string;
          const title = queryParams?.title as string;

          if (content) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              Alert.alert('Please log in', 'You need to be logged in to save shared content');
              router.push('/login');
              return;
            }

            try {
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/share-to-memark`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({
                    content,
                    type,
                    title,
                  }),
                }
              );

              if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
              }

              const result = await response.json();

              if (result.success) {
                if (Platform.OS !== 'web') {
                  await import('expo-haptics').then((Haptics) =>
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                  );
                }

                Alert.alert(
                  'Saved!',
                  result.preview ? `${result.preview.title || 'Content'} saved with preview` : 'Content saved to your Memark',
                  [
                    {
                      text: 'View',
                      onPress: () => router.push(`/item-detail?id=${result.item.id}`),
                    },
                    { text: 'OK' },
                  ]
                );
              } else {
                Alert.alert('Error', result.error || 'Failed to save');
              }
            } catch (error) {
              console.error('Share error:', error);
              Alert.alert('Error', 'Failed to save content. Please try again.');
            }
          }
        }

        if (path === 'profile' && queryParams?.ref && user?.id) {
          const referrerId = queryParams.ref as string;
          if (referrerId && referrerId !== user.id) {
            await fetch(
              `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/track-referral`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  referrer_user_id: referrerId,
                  new_user_id: user.id,
                  action: 'complete',
                }),
              }
            );
          }
        }
      } catch (error) {
        console.error('Error handling incoming URL:', error);
      }
    };

    const subscription = Linking.addEventListener('url', handleIncomingURL);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleIncomingURL({ url });
      }
    }).catch((error) => {
      console.error('Error getting initial URL:', error);
    });

    return () => {
      subscription.remove();
    };
  }, [user?.id, router]);

  return null;
}
