import { View, Image, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export function LogoHeader() {
  const { theme } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/copy_of_memark_(1).png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    } : {
      elevation: 4,
    }),
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 220,
    height: 50,
  },
});
