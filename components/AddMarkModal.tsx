import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { X, Link2, FileText, Image as ImageIcon, Video, Tag, Plus, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AddMarkModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type MarkType = 'note' | 'link' | 'article' | 'screenshot' | 'video';

const MARK_TYPES: { id: MarkType; label: string; icon: any }[] = [
  { id: 'note', label: 'Note', icon: FileText },
  { id: 'link', label: 'Link', icon: Link2 },
  { id: 'article', label: 'Article', icon: FileText },
  { id: 'screenshot', label: 'Image', icon: ImageIcon },
  { id: 'video', label: 'Video', icon: Video },
];

const SUGGESTED_TAGS = ['work', 'personal', 'read-later', 'important', 'inspiration', 'reference'];

export function AddMarkModal({ visible, onClose, onSuccess }: AddMarkModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [markType, setMarkType] = useState<MarkType>('note');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const resetForm = () => {
    setMarkType('note');
    setContent('');
    setUrl('');
    setTags([]);
    setCustomTag('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleTag = (tag: string) => {
    triggerHaptic();
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim().toLowerCase())) {
      triggerHaptic();
      setTags(prev => [...prev, customTag.trim().toLowerCase()]);
      setCustomTag('');
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      setError('You must be logged in');
      return;
    }

    if (!content.trim() && !url.trim()) {
      setError('Please add some content or a URL');
      return;
    }

    if ((markType === 'link' || markType === 'article' || markType === 'video') && !url.trim()) {
      setError('Please enter a URL for this type of mark');
      return;
    }

    setSaving(true);
    setError(null);
    triggerHaptic();

    try {
      const itemData: any = {
        user_id: user.id,
        type: markType,
        content: content.trim() || url.trim(),
        status: 'active',
        is_manual: true,
        tags: tags.length > 0 ? tags : null,
      };

      if (url.trim()) {
        itemData.url = url.trim();
        if (!itemData.url.startsWith('http://') && !itemData.url.startsWith('https://')) {
          itemData.url = 'https://' + itemData.url;
        }
      }

      const { data, error: insertError } = await supabase
        .from('items')
        .insert(itemData)
        .select()
        .single();

      if (insertError) throw insertError;

      if (data && itemData.url) {
        fetchMetadata(data.id, itemData.url);
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      handleClose();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to save mark');
    } finally {
      setSaving(false);
    }
  };

  const fetchMetadata = async (itemId: string, itemUrl: string) => {
    try {
      const { data } = await supabase.functions.invoke('fetch-link-metadata', {
        body: { url: itemUrl, itemId },
      });

      if (data?.metadata) {
        await supabase
          .from('items')
          .update({
            og_title: data.metadata.title,
            og_description: data.metadata.description,
            og_image: data.metadata.image,
            og_site_name: data.metadata.siteName,
          })
          .eq('id', itemId);
      }
    } catch (err) {
      console.log('Metadata fetch failed:', err);
    }
  };

  const showUrlField = markType === 'link' || markType === 'article' || markType === 'video' || markType === 'screenshot';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <Text style={[styles.title, { color: theme.text }]}>Add Mark</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <X size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Type</Text>
              <View style={styles.typeRow}>
                {MARK_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = markType === type.id;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeBtn,
                        { backgroundColor: isSelected ? theme.primary : theme.surface },
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        setMarkType(type.id);
                      }}
                    >
                      <Icon size={18} color={isSelected ? '#FFFFFF' : theme.textSecondary} />
                      <Text
                        style={[
                          styles.typeBtnText,
                          { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {showUrlField && (
                <>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>URL</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.surface,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="https://example.com"
                    placeholderTextColor={theme.textTertiary}
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </>
              )}

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                {markType === 'note' ? 'Note' : 'Description (optional)'}
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder={markType === 'note' ? 'Write your note here...' : 'Add a description...'}
                placeholderTextColor={theme.textTertiary}
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Tags</Text>
              <View style={styles.tagsContainer}>
                {SUGGESTED_TAGS.map((tag) => {
                  const isSelected = tags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagBtn,
                        {
                          backgroundColor: isSelected ? theme.primary + '20' : theme.surface,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => toggleTag(tag)}
                    >
                      {isSelected && <Check size={12} color={theme.primary} />}
                      <Text
                        style={[
                          styles.tagBtnText,
                          { color: isSelected ? theme.primary : theme.textSecondary },
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.customTagRow}>
                <TextInput
                  style={[
                    styles.customTagInput,
                    {
                      backgroundColor: theme.surface,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="Add custom tag"
                  placeholderTextColor={theme.textTertiary}
                  value={customTag}
                  onChangeText={setCustomTag}
                  onSubmitEditing={addCustomTag}
                />
                <TouchableOpacity
                  style={[styles.addTagBtn, { backgroundColor: theme.primary }]}
                  onPress={addCustomTag}
                >
                  <Plus size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {tags.length > 0 && (
                <View style={styles.selectedTags}>
                  <Text style={[styles.selectedTagsLabel, { color: theme.textTertiary }]}>
                    Selected:
                  </Text>
                  <View style={styles.selectedTagsList}>
                    {tags.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        style={[styles.selectedTag, { backgroundColor: theme.primary }]}
                        onPress={() => toggleTag(tag)}
                      >
                        <Text style={styles.selectedTagText}>{tag}</Text>
                        <X size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {error && (
                <View style={[styles.errorBox, { backgroundColor: theme.error + '15' }]}>
                  <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                onPress={handleClose}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Mark</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  customTagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  customTagInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  addTagBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTags: {
    marginTop: 12,
  },
  selectedTagsLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  selectedTagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectedTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
