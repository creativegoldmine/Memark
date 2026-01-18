import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { Search as SearchIcon, Filter, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Item } from '@/lib/supabase';
import { ItemCard } from '@/components/ItemCard';
import { SocialEmbedCard } from '@/components/SocialEmbedCard';
import { LogoHeader } from '@/components/LogoHeader';
import { InAppBrowser } from '@/components/InAppBrowser';
import { LinkPreviewModal } from '@/components/LinkPreviewModal';

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
  const [browserVisible, setBrowserVisible] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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

  const fetchItems = useCallback(async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setItems(data);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchItems();
    }
  }, [user?.id, fetchItems]);

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
    const shouldUseSocialEmbed = platformType && embedHtml && ['youtube', 'twitter', 'instagram', 'tiktok', 'vimeo', 'facebook'].includes(platformType);

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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LogoHeader />

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
            <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
              {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}
            </Text>
            {filteredItems.map((item) => (
              <View key={item.id}>
                {renderItemCard(item, () => handleItemPress(item), handleOpenUrl)}
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <SearchIcon size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {searchQuery || selectedType !== 'All' || selectedCategory !== 'All'
                ? 'No results found'
                : 'Start searching'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery || selectedType !== 'All' || selectedCategory !== 'All'
                ? 'Try adjusting your search or filters'
                : 'Search across all your saved content'}
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
    gap: 12,
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
    padding: 20,
  },
  resultsCount: {
    fontSize: 14,
    marginBottom: 12,
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
