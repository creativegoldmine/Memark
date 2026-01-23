import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Calendar,
  TrendingUp,
  Flame,
  Target,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Item } from '@/lib/supabase';
import { ItemCard } from './ItemCard';
import { LoadingLogo } from './LoadingLogo';
import { ReminderPickerModal } from './ReminderPickerModal';
import { createReminder, getPendingRemindersForItems } from '@/lib/reminders';

interface ReviewItem extends Item {
  days_overdue?: number;
  review_priority?: number;
}

interface ReviewFeedProps {
  onItemPress?: (item: Item) => void;
  limit?: number;
}

export function ReviewFeed({ onItemPress, limit = 20 }: ReviewFeedProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewStats, setReviewStats] = useState({
    due_today: 0,
    overdue: 0,
    total_reviewed: 0,
    streak: 0,
  });
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedReminderItem, setSelectedReminderItem] = useState<Item | null>(null);
  const [itemReminders, setItemReminders] = useState<Record<string, boolean>>({});

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const loadReviewItems = async (isRefresh = false) => {
    if (!user?.id) return;

    try {
      const now = new Date().toISOString();

      const { data: reviewItems, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .lte('next_review_date', now)
        .order('next_review_date', { ascending: true })
        .limit(limit);

      if (error) throw error;

      const enrichedItems = (reviewItems || []).map((item) => {
        const nextReview = new Date(item.next_review_date);
        const daysOverdue = Math.floor((Date.now() - nextReview.getTime()) / (1000 * 60 * 60 * 24));
        const priority = calculatePriority(item, daysOverdue);

        return {
          ...item,
          days_overdue: daysOverdue,
          review_priority: priority,
        };
      });

      enrichedItems.sort((a, b) => (b.review_priority || 0) - (a.review_priority || 0));

      setItems(enrichedItems);

      const { data: stats } = await supabase
        .from('items')
        .select('next_review_date, last_reviewed_at')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (stats) {
        const dueToday = stats.filter((item) => {
          const reviewDate = new Date(item.next_review_date);
          const today = new Date();
          return (
            reviewDate.toDateString() === today.toDateString() ||
            reviewDate < today
          );
        }).length;

        const overdue = stats.filter((item) => {
          const reviewDate = new Date(item.next_review_date);
          return reviewDate < new Date();
        }).length;

        const reviewed = stats.filter((item) => item.last_reviewed_at).length;

        const streak = await calculateStreak(user.id);

        setReviewStats({
          due_today: dueToday,
          overdue: overdue,
          total_reviewed: reviewed,
          streak,
        });
      }
    } catch (error) {
      console.error('Error loading review items:', error);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const calculatePriority = (item: Item, daysOverdue: number): number => {
    let priority = 100;

    priority += daysOverdue * 10;

    priority += (item.review_stage || 1) * 5;

    const relevanceScore = (item as any).relevance_score;
    if (relevanceScore) {
      priority += relevanceScore * 2;
    }

    const timesReviewed = (item as any).times_reviewed;
    if (timesReviewed && timesReviewed > 3) {
      priority -= 20;
    }

    if (item.last_reviewed_at) {
      const daysSinceReview = Math.floor(
        (Date.now() - new Date(item.last_reviewed_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceReview > 30) {
        priority += 15;
      }
    }

    return Math.max(0, priority);
  };

  const calculateStreak = async (userId: string): Promise<number> => {
    try {
      const { data } = await supabase
        .from('items')
        .select('last_reviewed_at')
        .eq('user_id', userId)
        .not('last_reviewed_at', 'is', null)
        .order('last_reviewed_at', { ascending: false })
        .limit(100);

      if (!data || data.length === 0) return 0;

      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      for (let i = 0; i < 365; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const hasReview = data.some((item) => {
          if (!item.last_reviewed_at) return false;
          const reviewDate = new Date(item.last_reviewed_at).toISOString().split('T')[0];
          return reviewDate === dateStr;
        });

        if (hasReview) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          if (i === 0) {
            currentDate.setDate(currentDate.getDate() - 1);
            continue;
          }
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  };

  const handleMarkReviewed = async (item: ReviewItem) => {
    triggerHaptic();

    try {
      const nextStage = Math.min((item.review_stage || 1) + 1, 7);
      const daysUntilNext = getNextReviewInterval(nextStage);
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + daysUntilNext);

      const timesReviewed = (item as any).times_reviewed || 0;
      const { error } = await supabase
        .from('items')
        .update({
          last_reviewed_at: new Date().toISOString(),
          review_stage: nextStage,
          next_review_date: nextReviewDate.toISOString(),
          times_reviewed: timesReviewed + 1,
        })
        .eq('id', item.id);

      if (error) throw error;

      setItems((prev) => prev.filter((i) => i.id !== item.id));

      setReviewStats((prev) => ({
        ...prev,
        due_today: Math.max(0, prev.due_today - 1),
        total_reviewed: prev.total_reviewed + 1,
      }));

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error marking as reviewed:', error);
    }
  };

  const handleSkip = async (item: ReviewItem) => {
    triggerHaptic();

    try {
      const nextReviewDate = new Date();
      nextReviewDate.setHours(nextReviewDate.getHours() + 2);

      const { error } = await supabase
        .from('items')
        .update({
          next_review_date: nextReviewDate.toISOString(),
        })
        .eq('id', item.id);

      if (error) throw error;

      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (error) {
      console.error('Error skipping item:', error);
    }
  };

  const handleSnooze = async (item: ReviewItem, days: number) => {
    triggerHaptic();

    try {
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + days);

      const { error } = await supabase
        .from('items')
        .update({
          next_review_date: nextReviewDate.toISOString(),
        })
        .eq('id', item.id);

      if (error) throw error;

      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (error) {
      console.error('Error snoozing item:', error);
    }
  };

  const getNextReviewInterval = (stage: number): number => {
    const intervals = [1, 3, 7, 14, 30, 60, 120];
    return intervals[Math.min(stage - 1, intervals.length - 1)];
  };

  const handleCopyUrl = async (item: Item) => {
    triggerHaptic();
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
    triggerHaptic();
    setSelectedReminderItem(item);
    setReminderModalVisible(true);
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
    loadReviewItems();
  }, [user?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadReviewItems(true);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <LoadingLogo size={40} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View entering={FadeInDown.duration(300)} style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
          <View style={[styles.statIcon, { backgroundColor: theme.primary + '20' }]}>
            <Target size={20} color={theme.primary} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: theme.text }]}>{reviewStats.due_today}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Due Today</Text>
          </View>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
          <View style={[styles.statIcon, { backgroundColor: theme.warning + '20' }]}>
            <Clock size={20} color={theme.warning} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: theme.text }]}>{reviewStats.overdue}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Overdue</Text>
          </View>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
          <View style={[styles.statIcon, { backgroundColor: theme.success + '20' }]}>
            <CheckCircle size={20} color={theme.success} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: theme.text }]}>{reviewStats.total_reviewed}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Reviewed</Text>
          </View>
        </View>

        {reviewStats.streak > 0 && (
          <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.statIcon, { backgroundColor: '#FF6B35' + '20' }]}>
              <Flame size={20} color="#FF6B35" />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: theme.text }]}>{reviewStats.streak}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Day Streak</Text>
            </View>
          </View>
        )}
      </Animated.View>

      {items.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.success + '20' }]}>
            <CheckCircle size={48} color={theme.success} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>All Caught Up!</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            No items due for review right now. Great job staying on top of your knowledge vault!
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50)}>
              <View style={styles.reviewItemContainer}>
                <ItemCard
                  item={item}
                  onPress={() => onItemPress?.(item)}
                  showReviewBadge
                  showActions={true}
                  onCopyUrl={handleCopyUrl}
                  onSetReminder={handleSetReminder}
                  hasReminder={itemReminders[item.id] || false}
                />

                <View style={styles.reviewActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.skipButton, { backgroundColor: theme.surface }]}
                    onPress={() => handleSkip(item)}
                  >
                    <XCircle size={18} color={theme.textSecondary} />
                    <Text style={[styles.actionText, { color: theme.textSecondary }]}>Skip</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.snoozeButton, { backgroundColor: theme.surface }]}
                    onPress={() => handleSnooze(item, 7)}
                  >
                    <RotateCcw size={18} color={theme.warning} />
                    <Text style={[styles.actionText, { color: theme.warning }]}>7d</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.reviewedButton, { backgroundColor: theme.success }]}
                    onPress={() => handleMarkReviewed(item)}
                  >
                    <CheckCircle size={18} color="#FFFFFF" />
                    <Text style={[styles.actionText, { color: '#FFFFFF' }]}>Reviewed</Text>
                  </TouchableOpacity>
                </View>

                {item.days_overdue !== undefined && item.days_overdue > 0 && (
                  <View style={[styles.overdueTag, { backgroundColor: theme.error + '15' }]}>
                    <Clock size={12} color={theme.error} />
                    <Text style={[styles.overdueText, { color: theme.error }]}>
                      {item.days_overdue} day{item.days_overdue !== 1 ? 's' : ''} overdue
                    </Text>
                  </View>
                )}

                {item.review_stage && (
                  <View style={styles.stageInfo}>
                    <Text style={[styles.stageText, { color: theme.textTertiary }]}>
                      Stage {item.review_stage}/7 • Next review: {getNextReviewInterval(item.review_stage + 1)}d
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <ReminderPickerModal
        visible={reminderModalVisible}
        onClose={() => {
          setReminderModalVisible(false);
          setSelectedReminderItem(null);
        }}
        onSelectDate={handleSelectReminderDate}
        itemTitle={selectedReminderItem?.og_title || selectedReminderItem?.title || selectedReminderItem?.raw_content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    flex: 1,
    minWidth: 140,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  reviewItemContainer: {
    marginBottom: 20,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  skipButton: {
    flex: 0.8,
  },
  snoozeButton: {
    flex: 0.8,
  },
  reviewedButton: {
    flex: 1.4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  overdueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  overdueText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stageInfo: {
    marginTop: 6,
  },
  stageText: {
    fontSize: 11,
  },
});
