import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LoadingLogo } from '@/components/LoadingLogo';

export default function Index() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/welcome');
      }
    }
  }, [session, loading]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LoadingLogo size={80} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
