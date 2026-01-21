import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput, Modal, Platform, Dimensions, useWindowDimensions } from 'react-native';
import { Grid, List, ChevronRight, Plus, X, Trash2, Search as SearchIcon, LayoutGrid, Sparkles } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler, FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Item } from '@/lib/supabase';
import { LogoHeader } from '@/components/LogoHeader';
import { TopicTabs } from '@/components/TopicTabs';
import { LoadingLogo } from '@/components/LoadingLogo';
import { ItemCard } from '@/components/ItemCard';
import { SocialEmbedCard } from '@/components/SocialEmbedCard';
import { LinkPreviewModal } from '@/components/LinkPreviewModal';
import { InAppBrowser } from '@/components/InAppBrowser';
import { SmartFolderSuggestions } from '@/components/SmartFolderSuggestions';
import { AIInsights } from '@/components/AIInsights';
import { TopicExplorer } from '@/components/TopicExplorer';
import { collectionIconNames, collectionIconDisplayNames } from '@/constants/theme';
import {
  getCollectionIcon,
  RecipeIcon,
  BookIcon,
  VideoIcon,
  MusicIcon,
  PaletteIcon,
  BriefcaseIcon,
  DumbbellIcon,
  PlaneIcon,
  GameIcon,
  FolderIcon,
  LibraryIcon,
  HeartIcon,
  ShoppingIcon,
  HomeIcon,
} from '@/components/CollectionIcons';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

interface Folder {
  id: string;
  name: string;
  path: string;
  icon: string;
  color: string;
  is_auto_generated: boolean;
  parent_folder_id: string | null;
  itemCount?: number;
}

export default function Collections() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [folderItems, setFolderItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'compact' | 'grid' | 'list'>('compact');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('folder');
  const [searchQuery, setSearchQuery] = useState('');
  const [browserVisible, setBrowserVisible] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showInsights, setShowInsights] = useState(true);
  const [topicExplorerVisible, setTopicExplorerVisible] = useState(false);
  const subscriptionRef = useRef<any>(null);

  const numColumns = screenWidth < 400 ? 3 : screenWidth < 600 ? 4 : 5;
  const cardGap = 8;
  const containerPadding = 12;
  const cardWidth = (screenWidth - containerPadding * 2 - cardGap * (numColumns - 1)) / numColumns;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleOpenUrl = (url: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setBrowserUrl(url);
    setBrowserVisible(true);
  };

  const handleFolderPress = (folder: Folder) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedFolder(folder);
  };

  const handleIconSelect = (iconName: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setNewFolderIcon(iconName);
  };

  const fetchFolders = useCallback(async () => {
    if (!user?.id) return;

    const { data: foldersData } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (foldersData) {
      const foldersWithCount = await Promise.all(
        foldersData.map(async (folder) => {
          const { count } = await supabase
            .from('item_folders')
            .select('*', { count: 'exact', head: true })
            .eq('folder_id', folder.id);

          return { ...folder, itemCount: count || 0 };
        })
      );

      setFolders(foldersWithCount);
    }

    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  const fetchFolderItems = useCallback(async (folderId: string) => {
    if (!user?.id) return;

    const { data: itemFolders } = await supabase
      .from('item_folders')
      .select('item_id')
      .eq('folder_id', folderId);

    if (itemFolders && itemFolders.length > 0) {
      const itemIds = itemFolders.map((if_) => if_.item_id);

      const { data: items } = await supabase
        .from('items')
        .select('*')
        .in('id', itemIds)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (items) {
        setFolderItems(items);
      }
    } else {
      setFolderItems([]);
    }
  }, [user?.id]);

  const createFolder = async () => {
    if (!user?.id || !newFolderName.trim()) return;

    const { error } = await supabase.from('folders').insert({
      user_id: user.id,
      name: newFolderName.trim(),
      path: newFolderName.trim(),
      icon: newFolderIcon,
      is_auto_generated: false,
      sort_order: folders.length,
    });

    if (!error) {
      setNewFolderName('');
      setNewFolderIcon('folder');
      setCreateModalVisible(false);
      fetchFolders();
    }
  };

  const deleteFolder = async (folderId: string) => {
    const { error } = await supabase.from('folders').delete().eq('id', folderId);

    if (!error) {
      setFolders(prev => prev.filter(f => f.id !== folderId));
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
        setFolderItems([]);
      }
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchFolders();
    }
  }, [user?.id, fetchFolders]);

  useEffect(() => {
    if (selectedFolder?.id) {
      fetchFolderItems(selectedFolder.id);
    }
  }, [selectedFolder?.id, fetchFolderItems]);

  useEffect(() => {
    if (!user?.id) return;

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = supabase
      .channel(`folders_changes_${user.id}_${selectedFolder?.id || 'none'}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'folders',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchFolders();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'item_folders'
      }, () => {
        if (selectedFolder?.id) {
          fetchFolderItems(selectedFolder.id);
        }
      })
      .subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [user?.id, selectedFolder?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedFolder) {
      fetchFolderItems(selectedFolder.id);
      setRefreshing(false);
    } else {
      fetchFolders();
    }
  };

  const renderItemCard = (item: Item, onPress: () => void, onOpenUrl: (url: string) => void, viewMode: 'grid' | 'list') => {
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
          viewMode={viewMode}
        />
      );
    }

    return (
      <ItemCard
        item={item}
        onPress={onPress}
        onOpenUrl={onOpenUrl}
        viewMode={viewMode}
      />
    );
  };

  const groupedFolders = useMemo(() => {
    const grouped: Record<string, Folder[]> = {};
    folders.forEach((folder) => {
      const category = folder.is_auto_generated ? 'Smart Folders' : 'My Collections';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(folder);
    });
    return grouped;
  }, [folders]);

  const filteredFolders = useMemo(() => {
    if (!searchQuery) return folders;
    const query = searchQuery.toLowerCase();
    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(query) ||
      folder.path.toLowerCase().includes(query)
    );
  }, [folders, searchQuery]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return folderItems;
    const query = searchQuery.toLowerCase();
    return folderItems.filter((item) =>
      item.title?.toLowerCase().includes(query) ||
      item.summary?.toLowerCase().includes(query) ||
      item.raw_content?.toLowerCase().includes(query) ||
      item.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [folderItems, searchQuery]);

  const topicTabs = useMemo(() => {
    const tabs = [
      { id: 'all', label: 'All', count: folders.length },
      { id: 'smart', label: 'Smart', count: folders.filter(f => f.is_auto_generated).length, isSpecial: true },
      { id: 'manual', label: 'My Collections', count: folders.filter(f => !f.is_auto_generated).length },
    ];
    return tabs;
  }, [folders]);

  const displayFolders = useMemo(() => {
    let filtered = filteredFolders;
    if (activeTab === 'smart') {
      filtered = filtered.filter(f => f.is_auto_generated);
    } else if (activeTab === 'manual') {
      filtered = filtered.filter(f => !f.is_auto_generated);
    }
    return filtered;
  }, [filteredFolders, activeTab]);

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
      <LogoHeader />

      {!selectedFolder && (
        <View>
          <TopicTabs
            tabs={topicTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          <TouchableOpacity
            style={[styles.topicExplorerButton, { backgroundColor: theme.surface }]}
            onPress={() => setTopicExplorerVisible(true)}
          >
            <Sparkles size={16} color="#8B5CF6" />
            <Text style={[styles.topicExplorerText, { color: theme.text }]}>
              Explore by Topic
            </Text>
            <ChevronRight size={16} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.subHeader, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <View style={styles.subHeaderLeft}>
          {selectedFolder && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setSelectedFolder(null);
                setFolderItems([]);
                setSearchQuery('');
              }}
            >
              <ChevronRight size={20} color={theme.primary} style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerText, { color: theme.text }]}>
            {selectedFolder ? selectedFolder.name : `${displayFolders.length} Folders`}
          </Text>
        </View>
        {!selectedFolder && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.primary }]}
              onPress={() => setCreateModalVisible(true)}
            >
              <Plus size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewButton, viewMode === 'compact' && { backgroundColor: theme.surface }]}
                onPress={() => setViewMode('compact')}
              >
                <LayoutGrid size={18} color={viewMode === 'compact' ? theme.primary : theme.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewButton, viewMode === 'grid' && { backgroundColor: theme.surface }]}
                onPress={() => setViewMode('grid')}
              >
                <Grid size={18} color={viewMode === 'grid' ? theme.primary : theme.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewButton, viewMode === 'list' && { backgroundColor: theme.surface }]}
                onPress={() => setViewMode('list')}
              >
                <List size={18} color={viewMode === 'list' ? theme.primary : theme.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SearchIcon size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={selectedFolder ? "Search items..." : "Search folders..."}
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <AnimatedScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: containerPadding }]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {!selectedFolder ? (
          <>
            {showInsights && <AIInsights />}
            {displayFolders.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  {folders.length === 0 ? 'No folders yet' : 'No results found'}
                </Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {folders.length === 0
                    ? 'Go to Settings and tap "AI Recategorize All"\nto create smart folders'
                    : 'Try adjusting your search'}
                </Text>
              </View>
            ) : (
              <View style={[
                viewMode === 'compact' ? styles.foldersCompact : viewMode === 'grid' ? styles.foldersGrid : styles.foldersList,
                { gap: cardGap }
              ]}>
              {displayFolders.map((folder, index) => {
                const IconComponent = getCollectionIcon(folder.icon || folder.name);

                if (viewMode === 'compact') {
                  return (
                    <Animated.View
                      key={folder.id}
                      entering={FadeInDown.delay(index * 30).duration(200)}
                      style={{ width: cardWidth }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.folderCardCompact,
                          { backgroundColor: theme.cardBackground, borderColor: theme.border }
                        ]}
                        onPress={() => handleFolderPress(folder)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.compactIconWrap, { backgroundColor: theme.surface }]}>
                          <IconComponent size={20} color={theme.primary} />
                        </View>
                        <Text style={[styles.compactName, { color: theme.text }]} numberOfLines={1}>
                          {folder.name}
                        </Text>
                        <Text style={[styles.compactCount, { color: theme.textTertiary }]}>
                          {folder.itemCount}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                }

                if (viewMode === 'grid') {
                  return (
                    <Animated.View
                      key={folder.id}
                      entering={FadeInDown.delay(index * 30).duration(200)}
                    >
                      <TouchableOpacity
                        style={[
                          styles.folderCardGrid,
                          { backgroundColor: theme.cardBackground, borderColor: theme.border }
                        ]}
                        onPress={() => handleFolderPress(folder)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.folderContent}>
                          <View style={styles.folderTop}>
                            <View style={styles.folderIconContainer}>
                              <IconComponent size={28} color={theme.primary} />
                            </View>
                            {!folder.is_auto_generated && (
                              <TouchableOpacity onPress={() => deleteFolder(folder.id)}>
                                <Trash2 size={14} color={theme.textTertiary} />
                              </TouchableOpacity>
                            )}
                          </View>
                          <View style={styles.folderInfo}>
                            <Text style={[styles.folderName, { color: theme.text }]} numberOfLines={1}>
                              {folder.name}
                            </Text>
                            <Text style={[styles.folderCount, { color: theme.textSecondary }]}>
                              {folder.itemCount} items
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                }

                return (
                  <Animated.View
                    key={folder.id}
                    entering={FadeInDown.delay(index * 30).duration(200)}
                  >
                    <TouchableOpacity
                      style={[
                        styles.folderCardList,
                        { backgroundColor: theme.cardBackground, borderColor: theme.border }
                      ]}
                      onPress={() => handleFolderPress(folder)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.listLeft}>
                        <View style={[styles.listIconWrap, { backgroundColor: theme.surface }]}>
                          <IconComponent size={20} color={theme.primary} />
                        </View>
                        <View>
                          <Text style={[styles.folderName, { color: theme.text }]} numberOfLines={1}>
                            {folder.name}
                          </Text>
                          <Text style={[styles.folderCount, { color: theme.textSecondary }]}>
                            {folder.itemCount} items
                          </Text>
                        </View>
                      </View>
                      {!folder.is_auto_generated ? (
                        <TouchableOpacity onPress={() => deleteFolder(folder.id)}>
                          <Trash2 size={16} color={theme.textTertiary} />
                        </TouchableOpacity>
                      ) : (
                        <ChevronRight size={18} color={theme.textTertiary} />
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
            )}
          </>
        ) : (
          <>

            {filteredItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  {folderItems.length === 0 ? 'No items yet' : 'No results found'}
                </Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {folderItems.length === 0
                    ? 'Items will appear here automatically'
                    : 'Try adjusting your search'}
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {filteredItems.map((item) => (
                  <View key={item.id}>
                    {renderItemCard(
                      item,
                      () => {
                        setSelectedItem(item);
                        setModalVisible(true);
                      },
                      handleOpenUrl,
                      viewMode === 'compact' ? 'list' : viewMode
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </AnimatedScrollView>

      <LinkPreviewModal
        visible={modalVisible}
        item={selectedItem}
        onClose={() => {
          setModalVisible(false);
          setSelectedItem(null);
        }}
        onUpdate={() => {
          if (selectedFolder?.id) {
            setFolderItems(prev =>
              prev.map(item => item.id === selectedItem?.id ? { ...item, ...selectedItem } : item)
            );
          }
        }}
      />

      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>New Collection</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.iconPicker}>
              {collectionIconNames.map((iconName) => {
                const IconMap: Record<string, any> = {
                  recipe: RecipeIcon,
                  book: BookIcon,
                  video: VideoIcon,
                  music: MusicIcon,
                  art: PaletteIcon,
                  work: BriefcaseIcon,
                  fitness: DumbbellIcon,
                  travel: PlaneIcon,
                  game: GameIcon,
                  folder: FolderIcon,
                  library: LibraryIcon,
                  favorite: HeartIcon,
                  shopping: ShoppingIcon,
                  home: HomeIcon,
                };
                const IconComponent = IconMap[iconName];
                const isSelected = newFolderIcon === iconName;

                return (
                  <TouchableOpacity
                    key={iconName}
                    style={[
                      styles.iconOption,
                      {
                        backgroundColor: isSelected ? theme.primary + '20' : theme.surface,
                        borderColor: isSelected ? theme.primary : theme.border,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => handleIconSelect(iconName)}
                  >
                    <IconComponent size={24} color={isSelected ? theme.primary : theme.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
              placeholder="Collection name"
              placeholderTextColor={theme.textTertiary}
              value={newFolderName}
              onChangeText={setNewFolderName}
              maxLength={50}
            />

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={createFolder}
              disabled={!newFolderName.trim()}
            >
              <Text style={styles.submitButtonText}>Create Collection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <InAppBrowser
        url={browserUrl}
        visible={browserVisible}
        onClose={() => setBrowserVisible(false)}
      />

      <TopicExplorer
        visible={topicExplorerVisible}
        onClose={() => setTopicExplorerVisible(false)}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 100,
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  topicExplorerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  topicExplorerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  subHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  viewButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foldersCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  foldersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  foldersList: {},
  folderCardCompact: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  compactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  compactCount: {
    fontSize: 10,
    fontWeight: '500',
  },
  folderCardGrid: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  folderCardList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  listIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderContent: {
    flex: 1,
  },
  folderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  folderIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  folderCount: {
    fontSize: 12,
  },
  itemsList: {
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  iconPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 12,
  },
  submitButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
