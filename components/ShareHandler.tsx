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
      if (!user?.id) {
        Alert.alert('Please log in', 'You need to be logged in to save shared content');
        return;
      }

      const { path, queryParams } = Linking.parse(event.url);

      if (path === 'share') {
        const content = queryParams?.content as string;
        const type = queryParams?.type as string;
        const title = queryParams?.title as string;

        if (content) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              throw new Error('No active session');
            }

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

            const result = await response.json();

            if (result.success) {
              Alert.alert(
                'Saved!',
                'Content has been saved to your Memark',
                [
                  {
                    text: 'View',
                    onPress: () => router.push(`/item-detail?id=${result.item.id}`),
                  },
                  { text: 'OK' },
                ]
              );
            } else {
              throw new Error(result.error || 'Failed to save');
            }
          } catch (error) {
            console.error('Error saving shared content:', error);
            Alert.alert('Error', 'Failed to save shared content');
          }
        }
      }

      if (path === 'profile' && queryParams?.ref) {
        const referrerId = queryParams.ref as string;
        if (referrerId && referrerId !== user.id) {
          try {
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
          } catch (error) {
            console.error('Error tracking referral:', error);
          }
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleIncomingURL);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleIncomingURL({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user?.id]);

  return null;
}
