import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { Flame, Plus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Item } from '@/lib/supabase';
import { ItemCard } from '@/components/ItemCard';
import { LoadingLogo } from '@/components/LoadingLogo';
import { LinkPreviewModal } from '@/components/LinkPreviewModal';

export default function Home() {
  const { theme, themeMode } = useTheme();
  const { user, dbUser } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
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
      .limit(20);

    if (data) {
      setItems(data);
      calculateStats(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

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
    setRefreshing(true);
    fetchItems();
  };

  const handleItemPress = (item: Item) => {
    setSelectedItem(item);
    setModalVisible(true);
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
              const updated = [newItem, ...prev].slice(0, 20);
              calculateStats(updated);
              return updated;
            });
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedItem = payload.new as Item;
          setItems(prev => {
            const updated = prev.map(item => item.id === updatedItem.id ? updatedItem : item);
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
        <View style={styles.centered}>
          <LoadingLogo size={80} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <View style={styles.logoContainer}>
          <Text style={[styles.logoText, { color: theme.primary }]}>MeMark</Text>
        </View>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.pageTitle, { color: theme.textSecondary }]}>HOME</Text>
            <Text style={[styles.greeting, { color: theme.text }]}>
              {dbUser?.name ? `Hi, ${dbUser.name.split(' ')[0]}` : 'Welcome'}
            </Text>
          </View>
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
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Items</Text>
            {todayItems.map((item) => (
              <ItemCard key={item.id} item={item} onPress={() => handleItemPress(item)} />
            ))}
          </View>
        )}

        {videoItems.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Videos to Watch</Text>
            {videoItems.slice(0, 3).map((item) => (
              <ItemCard key={item.id} item={item} onPress={() => handleItemPress(item)} />
            ))}
          </View>
        )}

        {articleItems.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Articles to Read</Text>
            {articleItems.slice(0, 3).map((item) => (
              <ItemCard key={item.id} item={item} onPress={() => handleItemPress(item)} />
            ))}
          </View>
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
  header: {
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
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
    marginBottom: 12,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    ...(Platform.OS === 'web' ? {
      textShadowColor: 'rgba(0, 0, 0, 0.15)',
      textShadowOffset: { width: 0, height: 3 },
      textShadowRadius: 6,
    } : {}),
  },
  pageTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
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
