import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Grid, List, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Item } from '@/lib/supabase';
import { LogoHeader } from '@/components/LogoHeader';
import { LoadingLogo } from '@/components/LoadingLogo';
import { ItemCard } from '@/components/ItemCard';
import { LinkPreviewModal } from '@/components/LinkPreviewModal';

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
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [folderItems, setFolderItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchFolders = async () => {
    if (!user) return;

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
  };

  const fetchFolderItems = async (folderId: string) => {
    if (!user) return;

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
  };

  useEffect(() => {
    fetchFolders();
  }, [user]);

  useEffect(() => {
    if (selectedFolder) {
      fetchFolderItems(selectedFolder.id);
    }
  }, [selectedFolder]);

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedFolder) {
      fetchFolderItems(selectedFolder.id);
      setRefreshing(false);
    } else {
      fetchFolders();
    }
  };

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
      <LogoHeader pageTitle="COLLECTIONS" />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerText, { color: theme.text }]}>
          {selectedFolder ? selectedFolder.name : 'Your Folders'}
        </Text>
        {!selectedFolder && (
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === 'list' && { backgroundColor: theme.surface }]}
              onPress={() => setViewMode('list')}
            >
              <List size={20} color={viewMode === 'list' ? theme.primary : theme.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === 'grid' && { backgroundColor: theme.surface }]}
              onPress={() => setViewMode('grid')}
            >
              <Grid size={20} color={viewMode === 'grid' ? theme.primary : theme.textTertiary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {!selectedFolder ? (
          folders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No folders yet</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Go to Settings and tap "AI Recategorize All"{'\n'}to create smart folders
              </Text>
            </View>
          ) : (
            <View style={viewMode === 'grid' ? styles.foldersGrid : styles.foldersList}>
              {folders.map((folder) => (
                <TouchableOpacity
                  key={folder.id}
                  style={[
                    viewMode === 'grid' ? styles.folderCardGrid : styles.folderCardList,
                    { backgroundColor: theme.cardBackground, borderColor: theme.border }
                  ]}
                  onPress={() => setSelectedFolder(folder)}
                >
                  <View style={styles.folderContent}>
                    <Text style={styles.folderIcon}>{folder.icon}</Text>
                    <View style={styles.folderInfo}>
                      <Text style={[styles.folderName, { color: theme.text }]} numberOfLines={1}>
                        {folder.name}
                      </Text>
                      <Text style={[styles.folderCount, { color: theme.textSecondary }]}>
                        {folder.itemCount} items
                      </Text>
                    </View>
                  </View>
                  {viewMode === 'list' && <ChevronRight size={20} color={theme.textTertiary} />}
                </TouchableOpacity>
              ))}
            </View>
          )
        ) : (
          <>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setSelectedFolder(null);
                setFolderItems([]);
              }}
            >
              <ChevronRight size={20} color={theme.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
              <Text style={[styles.backText, { color: theme.textSecondary }]}>Back to Folders</Text>
            </TouchableOpacity>

            {folderItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No items yet</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Items will appear here automatically
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {folderItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onPress={() => {
                      setSelectedItem(item);
                      setModalVisible(true);
                    }}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <LinkPreviewModal
        visible={modalVisible}
        item={selectedItem}
        onClose={() => {
          setModalVisible(false);
          setSelectedItem(null);
        }}
        onUpdate={() => {
          if (selectedFolder) {
            fetchFolderItems(selectedFolder.id);
          }
        }}
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foldersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  foldersList: {
    gap: 12,
  },
  folderCardGrid: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 100,
  },
  folderCardList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  folderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  folderIcon: {
    fontSize: 32,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  folderCount: {
    fontSize: 14,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
  },
  itemsList: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
