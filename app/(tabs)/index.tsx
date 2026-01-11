import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { Flame, Plus } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Item } from '@/lib/supabase';
import { ItemCard } from '@/components/ItemCard';
import { LinkPreviewModal } from '@/components/LinkPreviewModal';
import { LogoHeader } from '@/components/LogoHeader';
import { ItemCardSkeleton } from '@/components/SkeletonLoader';
import { ViewModeToggle } from '@/components/ViewModeToggle';

export default function Home() {
  const { theme, themeMode } = useTheme();
  const { user, dbUser } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [stats, setStats] = useState({
    todayCount: 0,
    reviewCount: 0,
    streak: 0,
  });
  const subscriptionRef = useRef<any>(null);

  const fetchItems = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const sortedItems = sortItemsIntelligently(data);
      setItems(sortedItems);
      calculateStats(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  const sortItemsIntelligently = (items: Item[]): Item[] => {
    return items.sort((a, b) => {
      const aReviewDate = a.next_review_date ? new Date(a.next_review_date) : null;
      const bReviewDate = b.next_review_date ? new Date(b.next_review_date) : null;
      const now = new Date();

      const aScore = a.score || 0;
      const bScore = b.score || 0;

      const aCreatedAt = new Date(a.created_at);
      const bCreatedAt = new Date(b.created_at);

      if (aReviewDate && aReviewDate <= now && (!bReviewDate || bReviewDate > now)) {
        return -1;
      }
      if (bReviewDate && bReviewDate <= now && (!aReviewDate || aReviewDate > now)) {
        return 1;
      }

      if (aReviewDate && bReviewDate && aReviewDate <= now && bReviewDate <= now) {
        return aReviewDate.getTime() - bReviewDate.getTime();
      }

      if (Math.abs(aScore - bScore) > 15) {
        return bScore - aScore;
      }

      return bCreatedAt.getTime() - aCreatedAt.getTime();
    });
  };

  const calculateStats = (items: Item[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = items.filter(
      (item) => new Date(item.created_at) >= today
    ).length;

    const reviewCount = items.filter(
      (item) => new Date(item.next_review_date) <= new Date()
    ).length;

    setStats({
      todayCount,
      reviewCount,
      streak: 0,
    });
  };

  const onRefresh = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setRefreshing(true);
    fetchItems();
  };

  const handleItemPress = (item: Item) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleViewModeChange = async (mode: 'grid' | 'list') => {
    setViewMode(mode);
    if (user?.id) {
      await supabase
        .from('users')
        .update({ view_mode: mode })
        .eq('id', user.id);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  const handleItemUpdate = (updatedItem: Item) => {
    setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  useEffect(() => {
    if (user?.id) {
      fetchItems();
    }
  }, [user?.id, fetchItems]);

  useEffect(() => {
    if (!user?.id) return;

    subscriptionRef.current = supabase
      .channel('items_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'items',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newItem = payload.new as Item;
          if (newItem.status === 'active' && !newItem.is_archived) {
            setItems(prev => {
              const updated = sortItemsIntelligently([newItem, ...prev].slice(0, 50));
              calculateStats(updated);
              return updated;
            });
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedItem = payload.new as Item;
          setItems(prev => {
            const updated = sortItemsIntelligently(
              prev.map(item => item.id === updatedItem.id ? updatedItem : item)
            );
            calculateStats(updated);
            return updated;
          });
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => {
            const updated = prev.filter(item => item.id !== payload.old.id);
            calculateStats(updated);
            return updated;
          });
        }
      })
      .subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [user?.id]);

  const todayItems = items.filter((item) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(item.created_at) >= today;
  });

  const videoItems = items.filter((item) => item.type === 'video');
  const articleItems = items.filter((item) => item.type === 'article');

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LogoHeader pageTitle="HOME" />
        <View style={[styles.subHeader, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
          <Text style={[styles.greeting, { color: theme.text }]}>Welcome</Text>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }]} disabled>
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <ItemCardSkeleton />
          <ItemCardSkeleton />
          <ItemCardSkeleton />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LogoHeader pageTitle="HOME" />
      <View style={[styles.subHeader, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.text }]}>
            {dbUser?.name ? `Hi, ${dbUser.name.split(' ')[0]}` : 'Welcome'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <ViewModeToggle mode={viewMode} onModeChange={handleViewModeChange} />
          <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }]}>
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{stats.todayCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Today's Captures</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.statValue, { color: theme.warning }]}>{stats.reviewCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Needs Review</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={styles.streakRow}>
              <Flame size={20} color={theme.error} />
              <Text style={[styles.statValue, { color: theme.error }]}>{stats.streak}</Text>
            </View>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Day Streak</Text>
          </View>
        </View>

        {todayItems.length > 0 && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Items</Text>
            {todayItems.map((item, index) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(index * 100).duration(400)}>
                <ItemCard item={item} onPress={() => handleItemPress(item)} viewMode={viewMode} />
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {videoItems.length > 0 && (
          <Animated.View entering={FadeIn.duration(400).delay(200)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Videos to Watch</Text>
            {videoItems.slice(0, 3).map((item, index) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(200 + index * 100).duration(400)}>
                <ItemCard item={item} onPress={() => handleItemPress(item)} viewMode={viewMode} />
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {articleItems.length > 0 && (
          <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Articles to Read</Text>
            {articleItems.slice(0, 3).map((item, index) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(400 + index * 100).duration(400)}>
                <ItemCard item={item} onPress={() => handleItemPress(item)} viewMode={viewMode} />
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Your brain is clear</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Send something to yourself to get started
            </Text>
          </View>
        )}
      </ScrollView>

      <LinkPreviewModal
        visible={modalVisible}
        item={selectedItem}
        onClose={handleModalClose}
        onUpdate={() => selectedItem && handleItemUpdate(selectedItem)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
