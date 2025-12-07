import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput, Modal } from 'react-native';
import { Grid, List, ChevronRight, Plus, X, Trash2 } from 'lucide-react-native';
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
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');
  const subscriptionRef = useRef<any>(null);

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
      setNewFolderIcon('📁');
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
          {selectedFolder ? selectedFolder.name : 'Collections'}
        </Text>
        {!selectedFolder && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.primary }]}
              onPress={() => setCreateModalVisible(true)}
            >
              <Plus size={18} color="#FFFFFF" />
            </TouchableOpacity>
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
                    <View style={styles.folderTop}>
                      <Text style={styles.folderIcon}>{folder.icon}</Text>
                      {!folder.is_auto_generated && viewMode === 'grid' && (
                        <TouchableOpacity onPress={() => deleteFolder(folder.id)}>
                          <Trash2 size={16} color={theme.textTertiary} />
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
                      {folder.is_auto_generated && (
                        <View style={[styles.autoTag, { backgroundColor: theme.surface }]}>
                          <Text style={[styles.autoTagText, { color: theme.textTertiary }]}>Auto</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {viewMode === 'list' && !folder.is_auto_generated && (
                    <TouchableOpacity onPress={() => deleteFolder(folder.id)}>
                      <Trash2 size={16} color={theme.textTertiary} />
                    </TouchableOpacity>
                  )}
                  {viewMode === 'list' && folder.is_auto_generated && (
                    <ChevronRight size={20} color={theme.textTertiary} />
                  )}
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
              {['📁', '📂', '🗂️', '📚', '💼', '🎨', '🎬', '🎮', '🏋️', '✈️'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.iconOption,
                    { backgroundColor: newFolderIcon === emoji ? theme.primary : theme.surface },
                  ]}
                  onPress={() => setNewFolderIcon(emoji)}
                >
                  <Text style={styles.iconEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
    flex: 1,
  },
  folderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  folderIcon: {
    fontSize: 32,
  },
  folderInfo: {
    flex: 1,
  },
  autoTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  autoTagText: {
    fontSize: 11,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  iconPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  iconOption: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
