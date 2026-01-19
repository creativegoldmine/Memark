import { Tabs } from 'expo-router';
import { Home, FolderOpen, Search, Settings } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.cardBackground,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: 'Folders',
          tabBarIcon: ({ size, color }) => <FolderOpen size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai-search"
        options={{
          title: 'Search',
          tabBarIcon: ({ size, color }) => <Search size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => <Settings size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
