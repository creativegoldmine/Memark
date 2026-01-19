import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';

interface Tab {
  id: string;
  label: string;
  count?: number;
  isSpecial?: boolean;
}

interface TopicTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TopicTabs({ tabs, activeTab, onTabChange }: TopicTabsProps) {
  const { theme } = useTheme();
  const indicatorPosition = useSharedValue(0);

  const handleTabPress = (tabId: string, index: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onTabChange(tabId);
  };

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: withSpring(indicatorPosition.value, { damping: 20, stiffness: 200 }) }],
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                isActive && styles.activeTab
              ]}
              onPress={() => handleTabPress(tab.id, index)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? theme.text : theme.textTertiary },
                  isActive && styles.activeTabText,
                  tab.isSpecial && { color: isActive ? theme.primary : theme.textTertiary }
                ]}
              >
                {tab.label}
              </Text>
              {tab.count !== undefined && tab.count > 0 && (
                <View style={[
                  styles.countBadge,
                  {
                    backgroundColor: tab.isSpecial
                      ? (isActive ? theme.warning : theme.surfaceSecondary)
                      : (isActive ? theme.surface : theme.surfaceSecondary)
                  }
                ]}>
                  <Text style={[
                    styles.countText,
                    {
                      color: tab.isSpecial
                        ? (isActive ? theme.cardBackground : theme.textTertiary)
                        : (isActive ? theme.text : theme.textTertiary)
                    }
                  ]}>
                    {tab.count > 999 ? '999+' : tab.count}
                  </Text>
                </View>
              )}
              {isActive && (
                <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 0,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  activeTab: {},
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 3,
    borderRadius: 1.5,
  },
});
