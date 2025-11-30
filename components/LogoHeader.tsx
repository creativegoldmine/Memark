import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface LogoHeaderProps {
  pageTitle: string;
}

export function LogoHeader({ pageTitle }: LogoHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/MeMark.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.pageTitle, { color: theme.textSecondary }]}>{pageTitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 375,
    height: 125,
  },
  pageTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
