import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView, Platform, Linking, TextInput, Alert, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { X, ExternalLink, Clock, Archive, Bell, ArrowLeft, Tag, Folder, Plus, Check, ChevronRight, Globe, Lock, Calendar, Trash2, Star, RotateCcw, FolderPlus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Item, supabase } from '@/lib/supabase';
import { getCollectionIcon } from './CollectionIcons';
import { collectionIconNames } from '@/constants/theme';

interface FolderData {
  id: string;
  name: string;
  icon: string;
  is_auto_generated: boolean;
}

interface LinkPreviewModalProps {
  visible: boolean;
  item: Item | null;
  onClose: () => void;
  onUpdate?: (updatedItem: Item) => void;
  onDelete?: () => void;
}

export function LinkPreviewModal({ visible, item, onClose, onUpdate, onDelete }: LinkPreviewModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [itemFolders, setItemFolders] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('folder');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [isReviewed, setIsReviewed] = useState(false);

  useEffect(() => {
    if (item) {
      setCurrentTags(item.tags || []);
      setIsPublic(item.is_public || false);
      setIsStarred(item.is_starred || false);
      setIsReviewed(!!item.last_reviewed_at);
      loadItemFolders();
    }
  }, [item]);

  useEffect(() => {
    if (visible && user?.id) {
      loadFolders();
    }
  }, [visible, user?.id]);

  const loadFolders = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('folders')
      .select('id, name, icon, is_auto_generated')
      .eq('user_id', user.id)
      .order('name');
    if (data) setFolders(data);
  };

  const loadItemFolders = async () => {
    if (!item?.id) return;
    const { data } = await supabase
      .from('item_folders')
      .select('folder_id')
      .eq('item_id', item.id);
    if (data) setItemFolders(data.map(f => f.folder_id));
  };

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (!item) return null;

  const hasLink = item.raw_content?.includes('http');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const handleOpenLink = async () => {
    if (!hasLink) return;

    const urlMatch = item.raw_content?.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      await supabase
        .from('items')
        .update({
          last_viewed_at: new Date().toISOString(),
          view_count: (item.view_count || 0) + 1,
        })
        .eq('id', item.id);

      if (Platform.OS === 'web') {
        Linking.openURL(urlMatch[0]);
      } else {
        setWebViewUrl(urlMatch[0]);
        setShowWebView(true);
      }
      onUpdate?.({ ...item, view_count: (item.view_count || 0) + 1 });
    }
  };

  const handleCloseWebView = () => {
    setShowWebView(false);
    setWebViewUrl('');
  };

  const handleSetReminder = async (days: number) => {
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + days);

    await supabase.from('reminders').insert({
      user_id: item.user_id,
      item_id: item.id,
      reminder_date: reminderDate.toISOString(),
      status: 'pending',
    });

    triggerHaptic();
    Alert.alert('Reminder Set', `We'll remind you in ${days} day${days > 1 ? 's' : ''}`);
  };

  const handleArchive = async () => {
    await supabase
      .from('items')
      .update({ is_archived: true })
      .eq('id', item.id);

    triggerHaptic();
    onUpdate?.({ ...item, is_archived: true });
    onClose();
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !item) return;
    const tag = newTag.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (currentTags.includes(tag)) {
      setNewTag('');
      return;
    }

    const updatedTags = [...currentTags, tag];
    setCurrentTags(updatedTags);
    setNewTag('');

    await supabase
      .from('items')
      .update({ tags: updatedTags })
      .eq('id', item.id);

    triggerHaptic();
    onUpdate?.({ ...item, tags: updatedTags });
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = currentTags.filter(t => t !== tagToRemove);
    setCurrentTags(updatedTags);

    await supabase
      .from('items')
      .update({ tags: updatedTags })
      .eq('id', item.id);

    triggerHaptic();
    onUpdate?.({ ...item, tags: updatedTags });
  };

  const handleToggleFolder = async (folderId: string) => {
    if (!item?.id) return;
    triggerHaptic();

    if (itemFolders.includes(folderId)) {
      await supabase
        .from('item_folders')
        .delete()
        .eq('item_id', item.id)
        .eq('folder_id', folderId);
      setItemFolders(prev => prev.filter(id => id !== folderId));
    } else {
      await supabase
        .from('item_folders')
        .insert({ item_id: item.id, folder_id: folderId });
      setItemFolders(prev => [...prev, folderId]);
    }
  };

  const handleTogglePublic = async () => {
    const newValue = !isPublic;
    setIsPublic(newValue);
    triggerHaptic();

    await supabase
      .from('items')
      .update({ is_public: newValue })
      .eq('id', item.id);

    onUpdate?.({ ...item, is_public: newValue });
  };

  const handleToggleStar = async () => {
    const newValue = !isStarred;
    setIsStarred(newValue);
    triggerHaptic();

    await supabase
      .from('items')
      .update({ is_starred: newValue })
      .eq('id', item.id);

    onUpdate?.({ ...item, is_starred: newValue } as any);
  };

  const handleMarkReviewed = async () => {
    const now = new Date().toISOString();
    setIsReviewed(true);
    triggerHaptic();

    const reviewCount = (item.review_count || 0) + 1;
    const nextReviewDays = Math.min(Math.pow(2, reviewCount), 30);
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + nextReviewDays);

    await supabase
      .from('items')
      .update({
        last_reviewed_at: now,
        review_count: reviewCount,
        next_review_date: nextReviewDate.toISOString(),
      })
      .eq('id', item.id);

    onUpdate?.({ ...item, last_reviewed_at: now, review_count: reviewCount } as any);
    Alert.alert('Marked as Reviewed', `Next review in ${nextReviewDays} days`);
  };

  const handleCreateFolder = async () => {
    if (!user?.id || !newFolderName.trim()) return;
    setCreatingFolder(true);

    try {
      const { data, error } = await supabase
        .from('folders')
        .insert({
          user_id: user.id,
          name: newFolderName.trim(),
          path: newFolderName.trim(),
          icon: newFolderIcon,
          is_auto_generated: false,
          sort_order: folders.length,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setFolders(prev => [...prev, data]);
        if (item?.id) {
          await supabase
            .from('item_folders')
            .insert({ item_id: item.id, folder_id: data.id });
          setItemFolders(prev => [...prev, data.id]);
        }
        setNewFolderName('');
        setNewFolderIcon('folder');
        setShowCreateFolder(false);
        triggerHaptic();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('items').delete().eq('id', item.id);
            triggerHaptic();
            onDelete?.();
            onClose();
          },
        },
      ]
    );
  };

  const getImageUrl = () => {
    if (item.og_image) return item.og_image;
    if (item.image_preview) return item.image_preview;
    if (item.preview_image_url) return item.preview_image_url;
    const mediaUrl = item.media_url;
    if (mediaUrl && /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(mediaUrl)) {
      return mediaUrl;
    }
    return null;
  };

  if (showWebView) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={handleCloseWebView}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.webViewHeader, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={handleCloseWebView} style={styles.backButton}>
              <ArrowLeft size={24} color={theme.text} />
              <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
            </TouchableOpacity>
          </View>
          <WebView
            source={{ uri: webViewUrl }}
            style={{ flex: 1 }}
            startInLoadingState
            allowsBackForwardNavigationGestures
          />
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {item.type?.charAt(0).toUpperCase() + item.type?.slice(1)}
              </Text>
              <View style={[styles.dateBadge, { backgroundColor: theme.surface }]}>
                <Calendar size={12} color={theme.textSecondary} />
                <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {getImageUrl() && (
              <Image
                source={{ uri: getImageUrl() || '' }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            )}

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.quickActionBtn, isStarred && { backgroundColor: theme.warning + '20' }]}
                onPress={handleToggleStar}
              >
                <Star size={20} color={isStarred ? theme.warning : theme.textSecondary} fill={isStarred ? theme.warning : 'transparent'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickActionBtn, isReviewed && { backgroundColor: theme.success + '20' }]}
                onPress={handleMarkReviewed}
              >
                <RotateCcw size={20} color={isReviewed ? theme.success : theme.textSecondary} />
                <Text style={[styles.quickActionText, { color: isReviewed ? theme.success : theme.textSecondary }]}>
                  {isReviewed ? 'Reviewed' : 'Mark Done'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.title, { color: theme.text }]}>
              {item.og_title || item.title || item.raw_content}
            </Text>

            {(item.og_description || item.summary) && (
              <Text style={[styles.summary, { color: theme.textSecondary }]}>
                {item.og_description || item.summary}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.sectionButton, { backgroundColor: theme.surface }]}
              onPress={() => setShowTagEditor(!showTagEditor)}
            >
              <View style={styles.sectionButtonLeft}>
                <Tag size={18} color={theme.primary} />
                <Text style={[styles.sectionButtonText, { color: theme.text }]}>
                  Tags{currentTags.length > 0 ? ` (${currentTags.length})` : ''}
                </Text>
              </View>
              <ChevronRight
                size={18}
                color={theme.textTertiary}
                style={{ transform: [{ rotate: showTagEditor ? '90deg' : '0deg' }] }}
              />
            </TouchableOpacity>

            {showTagEditor && (
              <View style={[styles.expandedSection, { backgroundColor: theme.surface }]}>
                <View style={styles.tagsContainer}>
                  {currentTags.map((tag, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.tagChip, { backgroundColor: theme.primary + '20' }]}
                      onPress={() => handleRemoveTag(tag)}
                    >
                      <Text style={[styles.tagChipText, { color: theme.primary }]}>#{tag}</Text>
                      <X size={12} color={theme.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.addTagRow}>
                  <TextInput
                    style={[styles.tagInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    placeholder="Add tag..."
                    placeholderTextColor={theme.textTertiary}
                    value={newTag}
                    onChangeText={setNewTag}
                    onSubmitEditing={handleAddTag}
                    autoCapitalize="none"
                    maxLength={30}
                  />
                  <TouchableOpacity
                    style={[styles.addTagButton, { backgroundColor: theme.primary }]}
                    onPress={handleAddTag}
                    disabled={!newTag.trim()}
                  >
                    <Plus size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.sectionButton, { backgroundColor: theme.surface }]}
              onPress={() => setShowFolderPicker(!showFolderPicker)}
            >
              <View style={styles.sectionButtonLeft}>
                <Folder size={18} color={theme.primary} />
                <Text style={[styles.sectionButtonText, { color: theme.text }]}>
                  Folders{itemFolders.length > 0 ? ` (${itemFolders.length})` : ''}
                </Text>
              </View>
              <ChevronRight
                size={18}
                color={theme.textTertiary}
                style={{ transform: [{ rotate: showFolderPicker ? '90deg' : '0deg' }] }}
              />
            </TouchableOpacity>

            {showFolderPicker && (
              <View style={[styles.expandedSection, { backgroundColor: theme.surface }]}>
                <TouchableOpacity
                  style={[styles.createFolderButton, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}
                  onPress={() => setShowCreateFolder(!showCreateFolder)}
                >
                  <FolderPlus size={18} color={theme.primary} />
                  <Text style={[styles.createFolderText, { color: theme.primary }]}>
                    Create New Folder
                  </Text>
                </TouchableOpacity>

                {showCreateFolder && (
                  <View style={[styles.createFolderForm, { borderColor: theme.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                      {collectionIconNames.map((iconName) => {
                        const IconComponent = getCollectionIcon(iconName);
                        const isSelected = newFolderIcon === iconName;
                        return (
                          <TouchableOpacity
                            key={iconName}
                            style={[
                              styles.iconOption,
                              {
                                backgroundColor: isSelected ? theme.primary + '20' : theme.background,
                                borderColor: isSelected ? theme.primary : theme.border,
                              },
                            ]}
                            onPress={() => {
                              triggerHaptic();
                              setNewFolderIcon(iconName);
                            }}
                          >
                            <IconComponent size={20} color={isSelected ? theme.primary : theme.textSecondary} />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <View style={styles.createFolderRow}>
                      <TextInput
                        style={[styles.folderInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                        placeholder="Folder name"
                        placeholderTextColor={theme.textTertiary}
                        value={newFolderName}
                        onChangeText={setNewFolderName}
                        maxLength={50}
                      />
                      <TouchableOpacity
                        style={[styles.createFolderBtn, { backgroundColor: theme.primary, opacity: creatingFolder || !newFolderName.trim() ? 0.5 : 1 }]}
                        onPress={handleCreateFolder}
                        disabled={creatingFolder || !newFolderName.trim()}
                      >
                        {creatingFolder ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Plus size={18} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {folders.length === 0 && !showCreateFolder ? (
                  <Text style={[styles.noFoldersText, { color: theme.textSecondary }]}>
                    No folders yet. Create one above!
                  </Text>
                ) : (
                  folders.map((folder) => {
                    const IconComponent = getCollectionIcon(folder.icon || folder.name);
                    return (
                      <TouchableOpacity
                        key={folder.id}
                        style={[
                          styles.folderOption,
                          { borderBottomColor: theme.border },
                          itemFolders.includes(folder.id) && { backgroundColor: theme.primary + '10' }
                        ]}
                        onPress={() => handleToggleFolder(folder.id)}
                      >
                        <View style={styles.folderOptionLeft}>
                          <IconComponent size={16} color={itemFolders.includes(folder.id) ? theme.primary : theme.textSecondary} />
                          <Text style={[
                            styles.folderOptionText,
                            { color: itemFolders.includes(folder.id) ? theme.primary : theme.text }
                          ]}>
                            {folder.name}
                          </Text>
                          {folder.is_auto_generated && (
                            <View style={[styles.smartBadge, { backgroundColor: theme.primary + '20' }]}>
                              <Text style={[styles.smartBadgeText, { color: theme.primary }]}>Smart</Text>
                            </View>
                          )}
                        </View>
                        {itemFolders.includes(folder.id) && (
                          <Check size={18} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.sectionButton, { backgroundColor: theme.surface }]}
              onPress={handleTogglePublic}
            >
              <View style={styles.sectionButtonLeft}>
                {isPublic ? (
                  <Globe size={18} color={theme.success} />
                ) : (
                  <Lock size={18} color={theme.textSecondary} />
                )}
                <Text style={[styles.sectionButtonText, { color: theme.text }]}>
                  {isPublic ? 'Public (visible on profile)' : 'Private'}
                </Text>
              </View>
              <View style={[
                styles.toggleIndicator,
                { backgroundColor: isPublic ? theme.success : theme.border }
              ]}>
                <View style={[
                  styles.toggleDot,
                  { transform: [{ translateX: isPublic ? 12 : 0 }] }
                ]} />
              </View>
            </TouchableOpacity>

            {item.last_viewed_at && (
              <Text style={[styles.viewInfo, { color: theme.textTertiary }]}>
                Last viewed {formatDate(item.last_viewed_at)}
                {item.view_count && item.view_count > 1 ? ` - ${item.view_count} views` : ''}
              </Text>
            )}
          </ScrollView>

          <View style={[styles.actions, { borderTopColor: theme.border }]}>
            {hasLink && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                onPress={handleOpenLink}
              >
                <ExternalLink size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Open Link</Text>
              </TouchableOpacity>
            )}

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.surface }]}
                onPress={() => handleSetReminder(1)}
              >
                <Clock size={18} color={theme.textSecondary} />
                <Text style={[styles.iconButtonText, { color: theme.textSecondary }]}>Tomorrow</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.surface }]}
                onPress={() => handleSetReminder(7)}
              >
                <Bell size={18} color={theme.textSecondary} />
                <Text style={[styles.iconButtonText, { color: theme.textSecondary }]}>Week</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.surface }]}
                onPress={handleArchive}
              >
                <Archive size={18} color={theme.textSecondary} />
                <Text style={[styles.iconButtonText, { color: theme.textSecondary }]}>Archive</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.error + '15' }]}
                onPress={handleDelete}
              >
                <Trash2 size={18} color={theme.error} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 28,
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  sectionButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  expandedSection: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    marginTop: -4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  addTagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  addTagButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  folderOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  folderOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  smartBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  smartBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  noFoldersText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  toggleIndicator: {
    width: 36,
    height: 20,
    borderRadius: 10,
    padding: 2,
  },
  toggleDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  viewInfo: {
    fontSize: 13,
    marginTop: 12,
  },
  actions: {
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  iconButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  webViewHeader: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 17,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  createFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  createFolderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  createFolderForm: {
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  iconScroll: {
    marginBottom: 10,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginRight: 8,
  },
  createFolderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  folderInput: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  createFolderBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
