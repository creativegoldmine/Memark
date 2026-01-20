import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, Platform, useWindowDimensions, ScrollView } from 'react-native';
import { Flame, Plus, Eye, Clock, Archive, Star, Check, LayoutGrid, List, Grid, X } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Item } from '@/lib/supabase';
import { ItemCard } from '@/components/ItemCard';
import { SocialEmbedCard } from '@/components/SocialEmbedCard';
import { LinkPreviewModal } from '@/components/LinkPreviewModal';
import { LogoHeader } from '@/components/LogoHeader';
import { TopicTabs } from '@/components/TopicTabs';
import { ReviewCarousel } from '@/components/ReviewCarousel';
import { ItemCardSkeleton } from '@/components/SkeletonLoader';
import { InAppBrowser } from '@/components/InAppBrowser';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function Home() {
  const { theme } = useTheme();
  const { user, dbUser } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'compact' | 'grid' | 'list'>('list');
  const [browserVisible, setBrowserVisible] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({
    todayCount: 0,
    unreviewed: 0,
    streak: 0,
    totalItems: 0,
  });
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 20;
  const subscriptionRef = useRef<any>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const fetchItems = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);

    if (error) {
      setError(error.message);
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      return;
    }

    if (data) {
      setError(null);
      if (append) {
        setItems(prev => [...prev, ...data]);
      } else {
        setItems(data);
        calculateStats(data);
      }
      setHasMore(data.length === ITEMS_PER_PAGE);
    }
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, [user?.id]);

  const calculateStats = (allItems: Item[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = allItems.filter(
      (item) => new Date(item.created_at) >= today
    ).length;

    const unreviewed = allItems.filter(
      (item) => !(item as any).last_reviewed_at
    ).length;

    setStats({
      todayCount,
      unreviewed,
      streak: dbUser?.review_streak || 0,
      totalItems: allItems.length,
    });
  };

  const onRefresh = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setRefreshing(true);
    setPage(0);
    fetchItems(0, false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      fetchItems(nextPage, true);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 200;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      loadMore();
    }
  };

  const handleItemPress = (item: Item) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleOpenUrl = (url: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setBrowserUrl(url);
    setBrowserVisible(true);
  };

  const handleMarkReviewed = async (item: Item) => {
    if (!user?.id) return;
    const now = new Date().toISOString();

    await supabase
      .from('items')
      .update({
        last_reviewed_at: now,
        review_count: ((item as any).review_count || 0) + 1
      })
      .eq('id', item.id);

    await supabase.from('review_history').insert({
      user_id: user.id,
      item_id: item.id,
      action_type: 'reviewed'
    });

    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, last_reviewed_at: now, review_count: ((i as any).review_count || 0) + 1 } as Item : i
    ));
    setStats(prev => ({ ...prev, unreviewed: Math.max(0, prev.unreviewed - 1) }));
  };

  const handleArchive = async (item: Item) => {
    if (!user?.id) return;

    await supabase
      .from('items')
      .update({ is_archived: true })
      .eq('id', item.id);

    await supabase.from('review_history').insert({
      user_id: user.id,
      item_id: item.id,
      action_type: 'archived'
    });

    setItems(prev => prev.filter(i => i.id !== item.id));
    setStats(prev => ({
      ...prev,
      totalItems: prev.totalItems - 1,
      unreviewed: (item as any).last_reviewed_at ? prev.unreviewed : prev.unreviewed - 1
    }));
  };

  const handleStar = async (item: Item) => {
    if (!user?.id) return;
    const isStarred = !(item as any).is_starred;

    await supabase
      .from('items')
      .update({ is_starred: isStarred })
      .eq('id', item.id);

    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, is_starred: isStarred } as Item : i
    ));
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
            setItems(prev => [newItem, ...prev].slice(0, 50));
            setStats(prev => ({
              ...prev,
              todayCount: prev.todayCount + 1,
              totalItems: prev.totalItems + 1,
              unreviewed: prev.unreviewed + 1
            }));
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedItem = payload.new as Item;
          setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(item => item.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [user?.id]);

  const topicTabs = useMemo(() => {
    const tabs = [
      { id: 'all', label: 'All', count: stats.totalItems },
      { id: 'unreviewed', label: 'Unreviewed', count: stats.unreviewed, isSpecial: true },
      { id: 'starred', label: 'Starred', count: items.filter(i => (i as any).is_starred).length },
      { id: 'articles', label: 'Articles', count: items.filter(i => i.type === 'article').length },
      { id: 'videos', label: 'Videos', count: items.filter(i => i.type === 'video').length },
    ];
    return tabs;
  }, [items, stats]);

  const filteredItems = useMemo(() => {
    switch (activeTab) {
      case 'unreviewed':
        return items.filter(i => !(i as any).last_reviewed_at);
      case 'starred':
        return items.filter(i => (i as any).is_starred);
      case 'articles':
        return items.filter(i => i.type === 'article');
      case 'videos':
        return items.filter(i => i.type === 'video');
      default:
        return items;
    }
  }, [items, activeTab]);

  const unreviewedItems = useMemo(() => {
    return items.filter(i => !(i as any).last_reviewed_at).slice(0, 10);
  }, [items]);

  const renderItemCard = (item: Item, onPress: () => void, onOpenUrl: (url: string) => void) => {
    const platformType = (item as any).platform_type;
    const embedHtml = (item as any).embed_html;
    const hasMetadata = item.og_image || item.og_title || item.og_description;
    const shouldUseSocialEmbed = platformType && ['youtube', 'twitter', 'instagram', 'tiktok', 'vimeo', 'facebook'].includes(platformType) && (embedHtml || hasMetadata);

    if (shouldUseSocialEmbed && viewMode !== 'compact') {
      return (
        <SocialEmbedCard
          item={item}
          onPress={onPress}
          onOpenUrl={onOpenUrl}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
        />
      );
    }

    return (
      <ItemCard
        item={item}
        onPress={onPress}
        onOpenUrl={onOpenUrl}
        viewMode={viewMode}
        showActions={true}
        onMarkReviewed={handleMarkReviewed}
        onArchive={handleArchive}
        onStar={handleStar}
      />
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LogoHeader />
        <View style={styles.skeletonContainer}>
          <ItemCardSkeleton />
          <ItemCardSkeleton />
          <ItemCardSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LogoHeader />

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: theme.error + '15', borderColor: theme.error }]}>
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <X size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      )}

      <TopicTabs
        tabs={topicTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <View style={[styles.subHeader, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statPill, { backgroundColor: stats.unreviewed > 0 ? theme.warning + '20' : theme.surface }]}
            onPress={() => setActiveTab('unreviewed')}
          >
            <Eye size={14} color={stats.unreviewed > 0 ? theme.warning : theme.textTertiary} />
            <Text style={[styles.statPillText, { color: stats.unreviewed > 0 ? theme.warning : theme.textTertiary }]}>
              {stats.unreviewed} to review
            </Text>
          </TouchableOpacity>
          <View style={[styles.statPill, { backgroundColor: theme.surface }]}>
            <Clock size={14} color={theme.textTertiary} />
            <Text style={[styles.statPillText, { color: theme.textTertiary }]}>
              {stats.todayCount} today
            </Text>
          </View>
          {stats.streak > 0 && (
            <View style={[styles.statPill, { backgroundColor: theme.error + '15' }]}>
              <Flame size={14} color={theme.error} />
              <Text style={[styles.statPillText, { color: theme.error }]}>
                {stats.streak}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === 'compact' && { backgroundColor: theme.surface }]}
              onPress={() => setViewMode('compact')}
            >
              <LayoutGrid size={16} color={viewMode === 'compact' ? theme.primary : theme.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === 'list' && { backgroundColor: theme.surface }]}
              onPress={() => setViewMode('list')}
            >
              <List size={16} color={viewMode === 'list' ? theme.primary : theme.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <AnimatedScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {unreviewedItems.length > 0 && activeTab === 'all' && (
          <ReviewCarousel
            items={unreviewedItems}
            title="Review These"
            subtitle={`${stats.unreviewed} items need attention`}
            onItemPress={handleItemPress}
            onMarkReviewed={handleMarkReviewed}
            onArchive={handleArchive}
            onStar={handleStar}
            onSeeAll={() => setActiveTab('unreviewed')}
          />
        )}

        <View style={styles.feedSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {activeTab === 'all' ? 'Recent' : activeTab === 'unreviewed' ? 'Needs Review' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </Text>
            <Text style={[styles.sectionCount, { color: theme.textTertiary }]}>
              {filteredItems.length} items
            </Text>
          </View>

          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {activeTab === 'unreviewed' ? 'All caught up!' : 'No items yet'}
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {activeTab === 'unreviewed'
                  ? 'You have reviewed all your marks'
                  : 'Send something to yourself to get started'}
              </Text>
            </View>
          ) : (
            filteredItems.map((item, index) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(index * 50).duration(300)}>
                {renderItemCard(item, () => handleItemPress(item), handleOpenUrl)}
              </Animated.View>
            ))
          )}
        </View>

        {loadingMore && (
          <View style={styles.loadingMore}>
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading more...</Text>
          </View>
        )}

        {!hasMore && filteredItems.length > 0 && (
          <View style={styles.endMessage}>
            <Text style={[styles.endMessageText, { color: theme.textTertiary }]}>
              You've reached the end
            </Text>
          </View>
        )}
      </AnimatedScrollView>

      <LinkPreviewModal
        visible={modalVisible}
        item={selectedItem}
        onClose={() => {
          setModalVisible(false);
          setSelectedItem(null);
        }}
        onUpdate={() => selectedItem && handleMarkReviewed(selectedItem)}
      />

      <InAppBrowser
        url={browserUrl}
        visible={browserVisible}
        onClose={() => setBrowserVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  skeletonContainer: {
    padding: 16,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 2,
  },
  viewButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  feedSection: {
    paddingHorizontal: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
  },
  endMessage: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endMessageText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
