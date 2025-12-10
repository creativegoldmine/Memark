import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TextInput, TouchableOpacity, ScrollView, Switch } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LoadingLogo } from '@/components/LoadingLogo';
import { ArrowLeft, Save, AlertCircle, Star, FileText, Calendar } from 'lucide-react-native';

export default function ShareHandler() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sharedContent, setSharedContent] = useState('');
  const [ready, setReady] = useState(false);

  const [userNotes, setUserNotes] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [importance, setImportance] = useState<'normal' | 'important' | 'extremely_important'>('normal');
  const [contentType, setContentType] = useState('');
  const [needsReview, setNeedsReview] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    loadSharedContent();
  }, [user]);

  const loadSharedContent = async () => {
    try {
      const url = await Linking.getInitialURL();

      if (!url) {
        router.replace('/');
        return;
      }

      const parsedUrl = Linking.parse(url);
      const content = parsedUrl.queryParams?.url as string ||
                     parsedUrl.queryParams?.text as string;

      if (!content) {
        router.replace('/');
        return;
      }

      setSharedContent(content);
      setReady(true);
    } catch (error) {
      console.error('Error loading shared content:', error);
      router.replace('/');
    }
  };

  const handleSave = async () => {
    if (!sharedContent || !user) return;

    setLoading(true);
    try {
      const { data: item, error } = await supabase
        .from('items')
        .insert({
          user_id: user.id,
          raw_content: sharedContent,
          user_notes: userNotes || null,
          priority,
          importance,
          content_type: contentType || null,
          needs_review: needsReview,
          status: 'active',
          review_stage: 1,
          next_review_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/categorize-item`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              itemId: item.id,
              content: sharedContent,
              userId: user.id,
              metadata: {
                userNotes,
                priority,
                importance,
                contentType,
                needsReview,
              },
            }),
          }
        );
      }

      router.replace('/');
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LoadingLogo size={60} />
      </View>
    );
  }

  const priorityOptions: Array<'low' | 'medium' | 'high' | 'urgent'> = ['low', 'medium', 'high', 'urgent'];
  const importanceOptions: Array<'normal' | 'important' | 'extremely_important'> = ['normal', 'important', 'extremely_important'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Save to MeMark</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
          disabled={loading}
        >
          {loading ? (
            <LoadingLogo size={24} />
          ) : (
            <Save size={24} color={theme.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.contentPreview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <FileText size={20} color={theme.textSecondary} />
          <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>Content</Text>
          <Text style={[styles.previewText, { color: theme.text }]} numberOfLines={3}>
            {sharedContent}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Add Context</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="Add notes to help with categorization (e.g., 'place in Education', 'work project', etc.)"
            placeholderTextColor={theme.textTertiary}
            value={userNotes}
            onChangeText={setUserNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Content Type</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="e.g., Education, Work, Personal, Entertainment"
            placeholderTextColor={theme.textTertiary}
            value={contentType}
            onChangeText={setContentType}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Priority</Text>
          <View style={styles.optionsRow}>
            {priorityOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  { borderColor: theme.border },
                  priority === option && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}
                onPress={() => setPriority(option)}
              >
                <Text style={[
                  styles.optionText,
                  { color: priority === option ? '#FFFFFF' : theme.text }
                ]}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Importance</Text>
          <View style={styles.optionsColumn}>
            {importanceOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.importanceButton,
                  { borderColor: theme.border },
                  importance === option && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}
                onPress={() => setImportance(option)}
              >
                {option === 'extremely_important' && <Star size={18} color={importance === option ? '#FFFFFF' : theme.primary} />}
                <Text style={[
                  styles.optionText,
                  { color: importance === option ? '#FFFFFF' : theme.text }
                ]}>
                  {option === 'extremely_important' ? 'Extremely Important' :
                   option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <AlertCircle size={20} color={theme.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Needs Review</Text>
            </View>
            <Switch
              value={needsReview}
              onValueChange={setNeedsReview}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text style={[styles.helpText, { color: theme.textSecondary }]}>
            Set a flag to review this item later
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveMainButton, { backgroundColor: theme.primary }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveMainButtonText}>
            {loading ? 'Saving...' : 'Save to MeMark'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  contentPreview: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  notesInput: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionsColumn: {
    gap: 8,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  importanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
  },
  saveMainButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  saveMainButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
