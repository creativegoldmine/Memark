import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ErrorMessageProps {
  message: string;
  visible?: boolean;
}

export function ErrorMessage({ message, visible = true }: ErrorMessageProps) {
  const { theme } = useTheme();

  if (!visible || !message) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: `${theme.error}15`, borderColor: theme.error }]}>
      <AlertCircle size={16} color={theme.error} strokeWidth={2} />
      <Text style={[styles.message, { color: theme.error }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
});
