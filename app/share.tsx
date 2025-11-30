import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LoadingLogo } from '@/components/LoadingLogo';

export default function ShareHandler() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(true);
  const [message, setMessage] = useState('Saving to MeMark...');

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    handleIncomingShare();
  }, [user]);

  const handleIncomingShare = async () => {
    try {
      const url = await Linking.getInitialURL();

      if (!url) {
        setMessage('No content to save');
        setTimeout(() => router.replace('/'), 2000);
        return;
      }

      const parsedUrl = Linking.parse(url);
      const sharedContent = parsedUrl.queryParams?.url as string ||
                           parsedUrl.queryParams?.text as string;

      if (!sharedContent) {
        setMessage('No content found');
        setTimeout(() => router.replace('/'), 2000);
        return;
      }

      const { data: item, error } = await supabase
        .from('items')
        .insert({
          user_id: user!.id,
          raw_content: sharedContent,
          status: 'active',
          review_stage: 1,
          next_review_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/categorize-item`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              itemId: item.id,
              content: sharedContent,
              userId: user!.id,
            }),
          }
        );
      }

      setMessage('Saved successfully!');
      setTimeout(() => router.replace('/'), 1500);
    } catch (error) {
      console.error('Share handling error:', error);
      setMessage('Failed to save');
      setTimeout(() => router.replace('/'), 2000);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {processing && <LoadingLogo size={60} />}
        <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
  },
});
