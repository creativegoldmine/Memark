import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface LogoHeaderProps {
  pageTitle: string;
}

export function LogoHeader({ pageTitle }: LogoHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
      <View style={styles.logoContainer}>
        <Text style={[styles.logoText, { color: theme.primary }]}>MeMark</Text>
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
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  pageTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
