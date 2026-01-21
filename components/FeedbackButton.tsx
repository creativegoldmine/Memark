import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { MessageSquare, X, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface FeedbackButtonProps {
  itemId: string;
  context?: 'categorization' | 'search' | 'recommendation' | 'general';
}

export function FeedbackButton({ itemId, context = 'general' }: FeedbackButtonProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const feedbackOptions = [
    { type: 'wrong_category', label: 'Wrong Category', icon: '🏷️' },
    { type: 'wrong_topic', label: 'Wrong Topic', icon: '📚' },
    { type: 'missing_keywords', label: 'Missing Keywords', icon: '🔍' },
    { type: 'good_categorization', label: 'Good Categorization', icon: '✅' },
  ];

  const submitFeedback = async () => {
    if (!feedbackType || !user?.id) return;

    setSubmitting(true);

    try {
      await supabase.from('user_feedback').insert({
        user_id: user.id,
        item_id: itemId,
        feedback_type: feedbackType,
        notes: notes.trim() || null,
        context: { source: context },
      });

      Alert.alert('Thank you!', 'Your feedback helps improve AI categorization.');
      setModalVisible(false);
      setFeedbackType(null);
      setNotes('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.feedbackButton, { backgroundColor: theme.surface }]}
        onPress={() => setModalVisible(true)}
      >
        <MessageSquare size={16} color={theme.textSecondary} />
        <Text style={[styles.feedbackButtonText, { color: theme.textSecondary }]}>
          Feedback
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Provide Feedback
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
              Help us improve AI categorization by sharing your feedback
            </Text>

            <View style={styles.optionsContainer}>
              {feedbackOptions.map(option => (
                <TouchableOpacity
                  key={option.type}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor:
                        feedbackType === option.type ? '#8B5CF6' : theme.surface,
                      borderColor: feedbackType === option.type ? '#8B5CF6' : theme.border,
                    },
                  ]}
                  onPress={() => setFeedbackType(option.type)}
                >
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: feedbackType === option.type ? '#fff' : theme.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Additional details (optional)"
              placeholderTextColor={theme.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                !feedbackType && styles.submitButtonDisabled,
              ]}
              onPress={submitFeedback}
              disabled={!feedbackType || submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  feedbackButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 20,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionIcon: {
    fontSize: 18,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 80,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
