import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, RefreshControl } from 'react-native';
import { Folder, ChevronRight, Plus, X, Edit2, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Item } from '@/lib/supabase';
import { LogoHeader } from '@/components/LogoHeader';
import { LoadingLogo } from '@/components/LoadingLogo';
import { ItemCard } from '@/components/ItemCard';
import { LinkPreviewModal } from '@/components/LinkPreviewModal';

interface FolderType {
  id: string;
  name: string;
  path: string;
  icon: string;
  color: string;
  is_auto_generated: boolean;
  parent_folder_id: string | null;
  itemCount?: number;
}

export default function Folders() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [folderItems, setFolderItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemModalVisible, setItemModalVisible] = useState(false);

  const fetchFolders = async () => {
    if (!user) return;

    const { data: foldersData, error } = await supabase
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

  const createFolder = async () => {
    if (!user || !newFolderName.trim()) return;

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
      fetchFolders();
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
        setFolderItems([]);
      }
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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LogoHeader pageTitle="FOLDERS" />
        <View style={styles.loadingContainer}>
          <LoadingLogo size={48} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LogoHeader pageTitle="FOLDERS" />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFolders(); }} />}
      >
        {!selectedFolder ? (
          <>
            <View style={styles.header}>
              <Text style={[styles.headerText, { color: theme.text }]}>Your Folders</Text>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: theme.primary }]}
                onPress={() => setCreateModalVisible(true)}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>New Folder</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.folderGrid}>
              {folders.map((folder) => (
                <TouchableOpacity
                  key={folder.id}
                  style={[styles.folderCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                  onPress={() => setSelectedFolder(folder)}
                >
                  <View style={styles.folderTop}>
                    <Text style={styles.folderIcon}>{folder.icon}</Text>
                    {!folder.is_auto_generated && (
                      <TouchableOpacity onPress={() => deleteFolder(folder.id)}>
                        <Trash2 size={16} color={theme.textTertiary} />
                      </TouchableOpacity>
                    )}
                  </View>
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
                </TouchableOpacity>
              ))}
            </View>
          </>
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

            <View style={styles.folderHeader}>
              <Text style={styles.folderHeaderIcon}>{selectedFolder.icon}</Text>
              <Text style={[styles.folderHeaderName, { color: theme.text }]}>{selectedFolder.name}</Text>
            </View>

            {folderItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No items yet</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Items will appear here automatically{'\n'}as they're categorized
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
                      setItemModalVisible(true);
                    }}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>New Folder</Text>
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
              placeholder="Folder name"
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
              <Text style={styles.submitButtonText}>Create Folder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <LinkPreviewModal
        visible={itemModalVisible}
        item={selectedItem}
        onClose={() => {
          setItemModalVisible(false);
          setSelectedItem(null);
        }}
        onUpdate={() => fetchFolderItems(selectedFolder!.id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: '700',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  folderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  folderCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 120,
  },
  folderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  folderIcon: {
    fontSize: 32,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  folderCount: {
    fontSize: 14,
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
  },
  folderHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  folderHeaderIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  folderHeaderName: {
    fontSize: 24,
    fontWeight: '700',
  },
  itemsList: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
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
