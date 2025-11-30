import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView, Linking } from 'react-native';
import { X, ExternalLink, Clock, Archive, Bell } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Item } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

interface LinkPreviewModalProps {
  visible: boolean;
  item: Item | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export function LinkPreviewModal({ visible, item, onClose, onUpdate }: LinkPreviewModalProps) {
  const { theme } = useTheme();

  if (!item) return null;

  const hasLink = item.raw_content?.includes('http');

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

      await Linking.openURL(urlMatch[0]);
      onUpdate?.();
    }
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

    onClose();
  };

  const handleArchive = async () => {
    await supabase
      .from('items')
      .update({ is_archived: true })
      .eq('id', item.id);

    onUpdate?.();
    onClose();
  };

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
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {item.type?.charAt(0).toUpperCase() + item.type?.slice(1)}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {item.image_preview && (
              <Image source={{ uri: item.image_preview }} style={styles.previewImage} resizeMode="cover" />
            )}

            <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>

            {item.summary && (
              <Text style={[styles.summary, { color: theme.textSecondary }]}>{item.summary}</Text>
            )}

            {item.tags && item.tags.length > 0 && (
              <View style={styles.tags}>
                {item.tags.map((tag, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.tagText, { color: theme.primary }]}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {item.last_viewed_at && (
              <Text style={[styles.viewInfo, { color: theme.textTertiary }]}>
                Last viewed {new Date(item.last_viewed_at).toLocaleDateString()}
                {item.view_count && item.view_count > 1 && ` • ${item.view_count} views`}
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
                <Clock size={20} color={theme.textSecondary} />
                <Text style={[styles.iconButtonText, { color: theme.textSecondary }]}>Tomorrow</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.surface }]}
                onPress={() => handleSetReminder(7)}
              >
                <Bell size={20} color={theme.textSecondary} />
                <Text style={[styles.iconButtonText, { color: theme.textSecondary }]}>Week</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.surface }]}
                onPress={handleArchive}
              >
                <Archive size={20} color={theme.textSecondary} />
                <Text style={[styles.iconButtonText, { color: theme.textSecondary }]}>Archive</Text>
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
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 32,
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewInfo: {
    fontSize: 14,
    marginBottom: 8,
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
    gap: 12,
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
});
