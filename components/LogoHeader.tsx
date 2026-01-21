import { View, Image, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { NotificationCenter } from '@/components/NotificationCenter';

export function LogoHeader() {
  const { theme, themeMode } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.header,
      {
        backgroundColor: theme.cardBackground,
        borderBottomColor: theme.border,
        paddingTop: Math.max(insets.top, 0)
      }
    ]}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/copy_of_memark.png')}
          style={[
            styles.logo,
            themeMode === 'purple' && { tintColor: '#FFFFFF' }
          ]}
          resizeMode="contain"
        />
      </View>
      <View style={styles.notificationContainer}>
        <NotificationCenter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius:12,
    } : {
      elevation: 4,
    }),
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: -90,
  },
  logo: {
    width: 242,
    height: 61,
  },
  notificationContainer: {
    justifyContent: 'center',
  },
});
