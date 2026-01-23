import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { X, Clock, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';

interface ReminderPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  itemTitle?: string;
}

export function ReminderPickerModal({
  visible,
  onClose,
  onSelectDate,
  itemTitle,
}: ReminderPickerModalProps) {
  const { theme } = useTheme();

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSelectPreset = (days: number) => {
    triggerHaptic();
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + days);
    reminderDate.setHours(9, 0, 0, 0);
    onSelectDate(reminderDate);
    onClose();
  };

  const presets = [
    { label: 'Tomorrow', days: 1, icon: '🌅' },
    { label: 'In 3 Days', days: 3, icon: '📅' },
    { label: 'Next Week', days: 7, icon: '🗓️' },
    { label: 'In 2 Weeks', days: 14, icon: '📆' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={[styles.modal, { backgroundColor: theme.cardBackground }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <Clock size={20} color={theme.warning} />
              <Text style={[styles.title, { color: theme.text }]}>
                Set Reminder
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                triggerHaptic();
                onClose();
              }}
            >
              <X size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {itemTitle && (
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: theme.textSecondary }]} numberOfLines={2}>
                {itemTitle}
              </Text>
            </View>
          )}

          <View style={styles.content}>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Choose when to be reminded:
            </Text>

            <View style={styles.presetsContainer}>
              {presets.map((preset) => (
                <TouchableOpacity
                  key={preset.days}
                  style={[
                    styles.presetButton,
                    { backgroundColor: theme.surface, borderColor: theme.border }
                  ]}
                  onPress={() => handleSelectPreset(preset.days)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetIcon}>{preset.icon}</Text>
                  <Text style={[styles.presetLabel, { color: theme.text }]}>
                    {preset.label}
                  </Text>
                  <Text style={[styles.presetDays, { color: theme.textTertiary }]}>
                    {preset.days === 1 ? '1 day' : `${preset.days} days`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: theme.surface }]}
            onPress={() => {
              triggerHaptic();
              onClose();
            }}
          >
            <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
    } : {
      elevation: 24,
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  itemInfo: {
    padding: 16,
    paddingBottom: 8,
  },
  itemTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  content: {
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  presetsContainer: {
    gap: 10,
  },
  presetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  presetIcon: {
    fontSize: 24,
  },
  presetLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  presetDays: {
    fontSize: 13,
  },
  cancelButton: {
    margin: 16,
    marginTop: 0,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
