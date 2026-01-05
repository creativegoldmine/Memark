import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface LogoHeaderProps {
  pageTitle: string;
}

export function LogoHeader({ pageTitle }: LogoHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
      <View style={styles.logoContainer}>
        <View style={styles.logoWrapper}>
          <Text style={[styles.logoText, { color: theme.primary }]}>MeMark</Text>
          {Platform.OS === 'web' && (
            <View style={[styles.logoShadow, {
              shadowColor: theme.primary,
              backgroundColor: theme.primary + '10',
            }]} />
          )}
        </View>
      </View>
      <Text style={[styles.pageTitle, { color: theme.textSecondary }]}>{pageTitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    } : {
      elevation: 2,
    }),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logoWrapper: {
    position: 'relative',
  },
  logoText: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1.5,
    ...(Platform.OS === 'web' ? {
      textShadowColor: 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    } : {}),
  },
  logoShadow: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 3,
    opacity: 0.3,
    zIndex: -1,
  },
  pageTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.7,
  },
});
