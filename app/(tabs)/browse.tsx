import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { Search as SearchIcon, Filter, X, Calendar, SortDesc, SortAsc } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Item } from '@/lib/supabase';
import { ItemCard } from '@/components/ItemCard';
import { SocialEmbedCard } from '@/components/SocialEmbedCard';
import { LogoHeader } from '@/components/LogoHeader';
import { InAppBrowser } from '@/components/InAppBrowser';
import { LinkPreviewModal } from '@/components/LinkPreviewModal';
import { ItemCardSkeleton } from '@/components/SkeletonLoader';

const FILTER_TYPES = ['All', 'Article', 'Video', 'Note', 'Screenshot', 'Task'];
const FILTER_CATEGORIES = ['All', 'Work', 'Personal', 'Inspiration', 'Finance', 'Learning'];

export default function Browse() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [selectedType, setSelectedType] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [browserVisible, setBrowserVisible] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const subscriptionRef = useRef<any>(null);

  const handleOpenUrl = (url: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setBrowserUrl(url);
    setBrowserVisible(true);
  };

  const handleItemPress = (item: Item) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleItemUpdate = (updatedItem: Item) => {
    setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const toggleSortOrder = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (itemDate.getTime() === today.getTime()) return 'Today';
    if (itemDate.getTime() === yesterday.getTime()) return 'Yesterday';
    if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const fetchItems = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: sortOrder === 'asc' });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    if (data) {
      setError(null);
      setItems(data);
    }
    setLoading(false);
  }, [user?.id, sortOrder]);

  useEffect(() => {
    if (user?.id) {
      fetchItems();
    }
  }, [user?.id, fetchItems]);

  useEffect(() => {
    if (!user?.id) return;

    subscriptionRef.current = supabase
      .channel('browse_items_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'items',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newItem = payload.new as Item;
          setItems(prev => sortOrder === 'desc' ? [newItem, ...prev] : [...prev, newItem]);
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
  }, [user?.id, sortOrder]);

  const filteredItems = useMemo(() => {
    let filtered = items;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(query) ||
          item.summary?.toLowerCase().includes(query) ||
          item.raw_content?.toLowerCase().includes(query) ||
          item.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (selectedType !== 'All') {
      filtered = filtered.filter((item) => item.type === selectedType.toLowerCase());
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter((item) => item.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    return filtered;
  }, [items, searchQuery, selectedType, selectedCategory]);

  const groupedItems = useMemo(() => {
    const groups: { date: string; items: Item[] }[] = [];
    let currentDate = '';

    filteredItems.forEach((item) => {
      const dateKey = formatDateHeader(item.created_at);
      if (dateKey !== currentDate) {
        currentDate = dateKey;
        groups.push({ date: dateKey, items: [item] });
      } else {
        groups[groups.length - 1].items.push(item);
      }
    });

    return groups;
  }, [filteredItems]);

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedType('All');
    setSelectedCategory('All');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  }, [fetchItems]);

  const renderItemCard = (item: Item, onPress: () => void, onOpenUrl: (url: string) => void) => {
    const platformType = (item as any).platform_type;
    const embedHtml = (item as any).embed_html;
    const hasMetadata = item.og_image || item.og_title || item.og_description;

    const shouldUseSocialEmbed = platformType && ['youtube', 'twitter', 'instagram', 'tiktok', 'vimeo', 'facebook'].includes(platformType) && (embedHtml || hasMetadata);

    if (shouldUseSocialEmbed) {
      return (
        <SocialEmbedCard
          item={item}
          onPress={onPress}
          onOpenUrl={onOpenUrl}
          viewMode="list"
        />
      );
    }

    return (
      <ItemCard
        item={item}
        onPress={onPress}
        onOpenUrl={onOpenUrl}
        viewMode="list"
      />
    );
  };

  if (loading && items.length === 0) {
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

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SearchIcon size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search your content..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: theme.surface }]}
          onPress={toggleSortOrder}
        >
          {sortOrder === 'desc' ? (
            <SortDesc size={20} color={theme.textSecondary} />
          ) : (
            <SortAsc size={20} color={theme.textSecondary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: showFilters ? theme.primary : theme.surface }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={showFilters ? '#FFFFFF' : theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: theme.surface }]}>
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {FILTER_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: selectedType === type ? theme.primary : theme.background,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: selectedType === type ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {FILTER_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: selectedCategory === category ? theme.primary : theme.background,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: selectedCategory === category ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {(selectedType !== 'All' || selectedCategory !== 'All') && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Text style={[styles.clearButtonText, { color: theme.primary }]}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {filteredItems.length > 0 ? (
          <>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
                {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
              </Text>
              <Text style={[styles.sortLabel, { color: theme.textTertiary }]}>
                {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
              </Text>
            </View>
            {groupedItems.map((group, groupIndex) => (
              <View key={group.date}>
                <View style={[styles.dateHeader, { backgroundColor: theme.surface }]}>
                  <Calendar size={14} color={theme.primary} />
                  <Text style={[styles.dateHeaderText, { color: theme.text }]}>{group.date}</Text>
                  <Text style={[styles.dateCount, { color: theme.textTertiary }]}>
                    {group.items.length}
                  </Text>
                </View>
                {group.items.map((item, index) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeInDown.delay((groupIndex * group.items.length + index) * 30).duration(200)}
                  >
                    {renderItemCard(item, () => handleItemPress(item), handleOpenUrl)}
                  </Animated.View>
                ))}
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <SearchIcon size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {searchQuery || selectedType !== 'All' || selectedCategory !== 'All'
                ? 'No results found'
                : 'No items yet'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery || selectedType !== 'All' || selectedCategory !== 'All'
                ? 'Try adjusting your search or filters'
                : 'Send something to MeMark to get started'}
            </Text>
          </View>
        )}
      </ScrollView>

      <InAppBrowser
        url={browserUrl}
        visible={browserVisible}
        onClose={() => setBrowserVisible(false)}
      />

      <LinkPreviewModal
        visible={modalVisible}
        item={selectedItem}
        onClose={() => {
          setModalVisible(false);
          setSelectedItem(null);
        }}
        onUpdate={() => selectedItem && handleItemUpdate(selectedItem)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeletonContainer: {
    padding: 16,
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
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  sortButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersPanel: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  filterSection: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  sortLabel: {
    fontSize: 12,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
    marginTop: 8,
  },
  dateHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  dateCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
