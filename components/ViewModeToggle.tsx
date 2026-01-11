import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Grid3x3, List } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';

interface ViewModeToggleProps {
  mode: 'grid' | 'list';
  onModeChange: (mode: 'grid' | 'list') => void;
}

export function ViewModeToggle({ mode, onModeChange }: ViewModeToggleProps) {
  const { theme } = useTheme();

  const handlePress = (newMode: 'grid' | 'list') => {
    if (newMode === mode) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onModeChange(newMode);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <TouchableOpacity
        style={[
          styles.button,
          mode === 'list' && { backgroundColor: theme.primary }
        ]}
        onPress={() => handlePress('list')}
        activeOpacity={0.7}
      >
        <List size={18} color={mode === 'list' ? '#FFFFFF' : theme.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.button,
          mode === 'grid' && { backgroundColor: theme.primary }
        ]}
        onPress={() => handlePress('grid')}
        activeOpacity={0.7}
      >
        <Grid3x3 size={18} color={mode === 'grid' ? '#FFFFFF' : theme.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
  },
  button: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
});
