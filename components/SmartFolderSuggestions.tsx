import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Sparkles, Check, X, Folder } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface FolderRecommendation {
  id: string;
  suggested_folder_name: string;
  suggested_icon: string;
  suggested_description: string;
  topic_keywords: string[];
  matching_item_ids: string[];
  item_count: number;
  confidence: number;
  reasoning: string;
}

export function SmartFolderSuggestions() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<FolderRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, [user?.id]);

  const fetchSuggestions = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('folder_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .gte('item_count', 3)
        .order('confidence', { ascending: false })
        .limit(5);

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptSuggestion = async (suggestion: FolderRecommendation) => {
    if (!user?.id) return;

    try {
      setProcessingId(suggestion.id);

      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .insert({
          user_id: user.id,
          name: suggestion.suggested_folder_name,
          icon: suggestion.suggested_icon,
          color: theme.primary,
          semantic_keywords: suggestion.topic_keywords,
          confidence_score: suggestion.confidence,
          auto_created: true,
          creation_reason: suggestion.reasoning,
        })
        .select()
        .single();

      if (folderError) throw folderError;

      const itemFolderLinks = suggestion.matching_item_ids.map(itemId => ({
        folder_id: folder.id,
        item_id: itemId,
      }));

      const { error: linksError } = await supabase
        .from('item_folders')
        .insert(itemFolderLinks);

      if (linksError) throw linksError;

      await supabase
        .from('folder_recommendations')
        .update({
          status: 'accepted',
          created_folder_id: folder.id,
        })
        .eq('id', suggestion.id);

      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    } catch (error) {
      console.error('Error accepting suggestion:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const rejectSuggestion = async (suggestionId: string) => {
    if (!user?.id) return;

    try {
      setProcessingId(suggestionId);

      await supabase
        .from('folder_recommendations')
        .update({ status: 'rejected' })
        .eq('id', suggestionId);

      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.cardBackground }]}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Sparkles size={20} color={theme.primary} />
        <Text style={[styles.headerText, { color: theme.text }]}>
          Smart Folder Suggestions
        </Text>
      </View>

      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.suggestionCard,
              { backgroundColor: theme.cardBackground, borderColor: theme.border }
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
                <Folder size={24} color={theme.primary} />
              </View>
              <View style={styles.confidenceBadge}>
                <Text style={[styles.confidenceText, { color: theme.primary }]}>
                  {Math.round(item.confidence * 100)}%
                </Text>
              </View>
            </View>

            <Text style={[styles.folderName, { color: theme.text }]} numberOfLines={2}>
              {item.suggested_folder_name}
            </Text>

            <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.suggested_description}
            </Text>

            <View style={styles.statsRow}>
              <Text style={[styles.itemCount, { color: theme.textSecondary }]}>
                {item.item_count} items
              </Text>
            </View>

            <View style={styles.keywords}>
              {item.topic_keywords.slice(0, 3).map((keyword, index) => (
                <View
                  key={index}
                  style={[styles.keyword, { backgroundColor: theme.primary + '10' }]}
                >
                  <Text style={[styles.keywordText, { color: theme.primary }]} numberOfLines={1}>
                    {keyword}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.rejectButton, { borderColor: theme.border }]}
                onPress={() => rejectSuggestion(item.id)}
                disabled={processingId === item.id}
              >
                {processingId === item.id ? (
                  <ActivityIndicator size="small" color={theme.textSecondary} />
                ) : (
                  <X size={18} color={theme.textSecondary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.acceptButton, { backgroundColor: theme.primary }]}
                onPress={() => acceptSuggestion(item)}
                disabled={processingId === item.id}
              >
                {processingId === item.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" />
                    <Text style={styles.acceptText}>Create Folder</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  loadingContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  suggestionCard: {
    width: 280,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  folderName: {
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  keywords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keyword: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  keywordText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
