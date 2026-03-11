import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, Platform, useWindowDimensions, ScrollView, Alert } from 'react-native';
import { Flame, Plus, Eye, Clock, Archive, Star, Check, LayoutGrid, List, Grid2x2 as Grid, X, MessageSquare, Copy, Sparkles, ArrowRight, Crown, TrendingUp } from 'lucide-react-native';
import * as ClipboardLib from 'expo-clipboard';
import { PLAN_LIMITS, getItemLimitPercent, isPaidPlan } from '@/lib/stripe';
import { UpgradeModal } from '@/components/UpgradeModal';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
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
import { AIChatAssistant, AIChatButton } from '@/components/AIChatAssistant';
import { AddMarkModal } from '@/components/AddMarkModal';
import { ReminderPickerModal } from '@/components/ReminderPickerModal';
import { createReminder, getPendingRemindersForItems } from '@/lib/reminders';

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
  const [chatVisible, setChatVisible] = useState(false);
  const [addMarkVisible, setAddMarkVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedReminderItem, setSelectedReminderItem] = useState<Item | null>(null);
  const [itemReminders, setItemReminders] = useState<Record<string, boolean>>({});
  const [smsCopied, setSmsCopied] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
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

  const handleCopyUrl = async (item: Item) => {
    const url = item.raw_content?.startsWith('http')
      ? item.raw_content
      : item.raw_content?.match(/https?:\/\/[^\s]+/)?.[0];

    if (url) {
      await Clipboard.setStringAsync(url);
      Alert.alert('Copied!', 'Link copied to clipboard');
    } else {
      Alert.alert('No URL', 'This item does not have a URL to copy');
    }
  };

  const handleSetReminder = (item: Item) => {
    setSelectedReminderItem(item);
    setReminderModalVisible(true);
  };

  const handleCopySmsNumber = async () => {
    await ClipboardLib.setStringAsync('+18623553847');
    setSmsCopied(true);
    if (Platform.OS !== 'web') {
      const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');
      impactAsync(ImpactFeedbackStyle.Light);
    }
    setTimeout(() => setSmsCopied(false), 3000);
  };

  const handleSelectReminderDate = async (date: Date) => {
    if (!user?.id || !selectedReminderItem) return;

    const { data, error } = await createReminder(user.id, selectedReminderItem.id, date);

    if (error) {
      Alert.alert('Error', 'Failed to set reminder. Please try again.');
      return;
    }

    if (data) {
      setItemReminders(prev => ({ ...prev, [selectedReminderItem.id]: true }));
      Alert.alert(
        'Reminder Set!',
        `You'll be reminded about this on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      );
    }

    setReminderModalVisible(false);
    setSelectedReminderItem(null);
  };

  const fetchReminders = useCallback(async () => {
    if (!user?.id || items.length === 0) return;

    const itemIds = items.map(i => i.id);
    const { data } = await getPendingRemindersForItems(user.id, itemIds);

    if (data) {
      setItemReminders(data);
    }
  }, [user?.id, items]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

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
    const manualCount = items.filter(i => (i as any).is_manual).length;
    const tabs = [
      { id: 'all', label: 'All', count: stats.totalItems },
      { id: 'unreviewed', label: 'Unreviewed', count: stats.unreviewed, isSpecial: true },
      { id: 'starred', label: 'Starred', count: items.filter(i => (i as any).is_starred).length },
      { id: 'manual', label: 'Manual', count: manualCount },
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
      case 'manual':
        return items.filter(i => (i as any).is_manual);
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
        onCopyUrl={handleCopyUrl}
        onSetReminder={handleSetReminder}
        hasReminder={itemReminders[item.id] || false}
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

      {(() => {
        if (!dbUser || isPaidPlan(dbUser.plan_type)) return null;
        const pct = getItemLimitPercent(dbUser.plan_type, stats.totalItems);
        if (pct < 80) return null;
        const isAtLimit = pct >= 100;
        return (
          <TouchableOpacity
            style={[
              styles.limitBanner,
              { backgroundColor: isAtLimit ? theme.error + '15' : theme.warning + '15', borderColor: isAtLimit ? theme.error + '40' : theme.warning + '40' }
            ]}
            onPress={() => setUpgradeModalVisible(true)}
          >
            <TrendingUp size={16} color={isAtLimit ? theme.error : theme.warning} />
            <Text style={[styles.limitBannerText, { color: isAtLimit ? theme.error : theme.warning }]}>
              {isAtLimit
                ? `You've hit your 100 item limit. Upgrade to save more.`
                : `${stats.totalItems}/100 free items used. Upgrade for unlimited.`}
            </Text>
            <Crown size={16} color={isAtLimit ? theme.error : theme.warning} />
          </TouchableOpacity>
        );
      })()}

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
        {stats.totalItems >= 3 && activeTab === 'all' && (
          <TouchableOpacity
            style={[styles.askLibraryCard, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}
            onPress={() => setChatVisible(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.askLibraryIcon, { backgroundColor: theme.primary + '20' }]}>
              <Sparkles size={22} color={theme.primary} />
            </View>
            <View style={styles.askLibraryText}>
              <Text style={[styles.askLibraryTitle, { color: theme.text }]}>Ask My Library</Text>
              <Text style={[styles.askLibrarySubtitle, { color: theme.textSecondary }]}>
                "What do I know about startups?" or "Find my coding tutorials"
              </Text>
            </View>
            <ArrowRight size={18} color={theme.primary} />
          </TouchableOpacity>
        )}

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
            activeTab === 'unreviewed' ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>All caught up!</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>You have reviewed all your marks</Text>
              </View>
            ) : (
              <View style={[styles.activationCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={[styles.activationIconRow, { backgroundColor: theme.primary + '15' }]}>
                  <MessageSquare size={32} color={theme.primary} />
                </View>
                <Text style={[styles.activationTitle, { color: theme.text }]}>
                  Your knowledge vault is ready
                </Text>
                <Text style={[styles.activationSubtitle, { color: theme.textSecondary }]}>
                  Text any link, article, video, or thought to your Memark number. AI organizes it instantly.
                </Text>

                <View style={[styles.activationNumberBox, { backgroundColor: theme.surface, borderColor: theme.primary + '40' }]}>
                  <View style={styles.activationNumberTop}>
                    <View style={[styles.activationBadge, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.activationBadgeText, { color: theme.primary }]}>YOUR MEMARK NUMBER</Text>
                    </View>
                  </View>
                  <Text style={[styles.activationNumber, { color: theme.primary }]}>+1 (862) 355-3847</Text>
                  <TouchableOpacity
                    style={[styles.activationCopyBtn, { backgroundColor: smsCopied ? theme.success : theme.primary }]}
                    onPress={handleCopySmsNumber}
                  >
                    {smsCopied ? (
                      <>
                        <Check size={16} color="#FFFFFF" />
                        <Text style={styles.activationCopyBtnText}>Copied to clipboard!</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={16} color="#FFFFFF" />
                        <Text style={styles.activationCopyBtnText}>Copy number</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {smsCopied && (
                    <Text style={[styles.activationCopiedHint, { color: theme.success }]}>
                      Now paste it in Messages and text a link!
                    </Text>
                  )}
                </View>

                <View style={styles.activationSteps}>
                  {[
                    { emoji: '1', text: 'Copy the number above' },
                    { emoji: '2', text: 'Text it any link or thought' },
                    { emoji: '3', text: 'AI organizes & reminds you' },
                  ].map((step, i) => (
                    <View key={i} style={styles.activationStep}>
                      <View style={[styles.activationStepNum, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.activationStepNumText, { color: theme.primary }]}>{step.emoji}</Text>
                      </View>
                      <Text style={[styles.activationStepText, { color: theme.textSecondary }]}>{step.text}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.activationAddBtn, { borderColor: theme.border }]}
                  onPress={() => setAddMarkVisible(true)}
                >
                  <Plus size={16} color={theme.textSecondary} />
                  <Text style={[styles.activationAddBtnText, { color: theme.textSecondary }]}>Or add a mark manually</Text>
                  <ArrowRight size={14} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>
            )
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
        onUpdate={(updatedItem) => {
          setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
          setSelectedItem(updatedItem);
        }}
        onDelete={() => {
          if (selectedItem) {
            setItems(prev => prev.filter(i => i.id !== selectedItem.id));
            setStats(prev => ({
              ...prev,
              totalItems: prev.totalItems - 1,
              unreviewed: (selectedItem as any).last_reviewed_at ? prev.unreviewed : prev.unreviewed - 1
            }));
          }
        }}
      />

      <InAppBrowser
        url={browserUrl}
        visible={browserVisible}
        onClose={() => setBrowserVisible(false)}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          setAddMarkVisible(true);
        }}
        activeOpacity={0.7}
      >
        <Plus size={32} color={theme.primary} strokeWidth={2.5} />
      </TouchableOpacity>

      <AIChatButton onPress={() => setChatVisible(true)} />

      <AIChatAssistant
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
      />

      <AddMarkModal
        visible={addMarkVisible}
        onClose={() => setAddMarkVisible(false)}
        onSuccess={() => {
          setPage(0);
          fetchItems(0, false);
        }}
      />

      <ReminderPickerModal
        visible={reminderModalVisible}
        onClose={() => {
          setReminderModalVisible(false);
          setSelectedReminderItem(null);
        }}
        onSelectDate={handleSelectReminderDate}
        itemTitle={selectedReminderItem?.og_title || selectedReminderItem?.title || selectedReminderItem?.raw_content}
      />

      <UpgradeModal
        visible={upgradeModalVisible}
        onClose={() => setUpgradeModalVisible(false)}
        feature="Unlimited saves"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  askLibraryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  askLibraryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  askLibraryText: {
    flex: 1,
  },
  askLibraryTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  askLibrarySubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  limitBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
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
  activationCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  activationIconRow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  activationTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  activationSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  activationNumberBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  activationNumberTop: {
    marginBottom: 12,
  },
  activationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  activationNumber: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 16,
  },
  activationCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  activationCopyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  activationCopiedHint: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  activationSteps: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  activationStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activationStepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activationStepNumText: {
    fontSize: 14,
    fontWeight: '700',
  },
  activationStepText: {
    fontSize: 14,
    flex: 1,
  },
  activationAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    width: '100%',
    justifyContent: 'center',
  },
  activationAddBtnText: {
    fontSize: 14,
    flex: 1,
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
  addButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
});
