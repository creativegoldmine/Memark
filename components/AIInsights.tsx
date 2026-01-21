import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Sparkles, Folder, TrendingUp, AlertCircle, CheckCircle, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface AIInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  data: any;
  priority: string;
  status: string;
  created_at: string;
}

interface SemanticCluster {
  id: string;
  cluster_name: string;
  primary_topic: string;
  item_count: number;
  suggested_folder_name: string;
  suggested_icon: string;
  status: string;
  confidence_score: number;
}

export function AIInsights() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [clusters, setClusters] = useState<SemanticCluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadInsights();
      loadClusters();
    }
  }, [user?.id]);

  const loadInsights = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setInsights(data);
    }
    setLoading(false);
  };

  const loadClusters = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('semantic_clusters')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['suggested', 'detected'])
      .order('item_count', { ascending: false })
      .limit(10);

    if (!error && data) {
      setClusters(data);
    }
  };

  const dismissInsight = async (insightId: string) => {
    await supabase
      .from('ai_insights')
      .update({ status: 'dismissed' })
      .eq('id', insightId);

    setInsights(prev => prev.filter(i => i.id !== insightId));
  };

  const acknowledgeInsight = async (insightId: string) => {
    await supabase
      .from('ai_insights')
      .update({ status: 'acknowledged' })
      .eq('id', insightId);

    setInsights(prev => prev.filter(i => i.id !== insightId));
  };

  const createFolderFromCluster = async (cluster: SemanticCluster) => {
    if (!user?.id) return;

    const { data: newFolder, error: folderError } = await supabase
      .from('folders')
      .insert({
        user_id: user.id,
        name: cluster.suggested_folder_name,
        path: cluster.suggested_folder_name,
        icon: cluster.suggested_icon,
        color: '#8B5CF6',
        is_auto_generated: true,
      })
      .select()
      .single();

    if (folderError || !newFolder) {
      console.error('Error creating folder:', folderError);
      return;
    }

    await supabase
      .from('semantic_clusters')
      .update({
        status: 'folder_created',
        folder_id: newFolder.id,
      })
      .eq('id', cluster.id);

    setClusters(prev => prev.filter(c => c.id !== cluster.id));

    alert(`Created folder: ${cluster.suggested_folder_name}`);
  };

  const dismissCluster = async (clusterId: string) => {
    await supabase
      .from('semantic_clusters')
      .update({ status: 'dismissed' })
      .eq('id', clusterId);

    setClusters(prev => prev.filter(c => c.id !== clusterId));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return theme.textSecondary;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'organization_suggestion':
        return Folder;
      case 'topic_trend':
      case 'learning_pattern':
        return TrendingUp;
      default:
        return Sparkles;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (insights.length === 0 && clusters.length === 0) {
    return null;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Sparkles size={24} color="#8B5CF6" />
        <Text style={[styles.headerTitle, { color: theme.text }]}>AI Insights</Text>
      </View>

      {clusters.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Suggested Folders
          </Text>
          {clusters.map(cluster => (
            <View
              key={cluster.id}
              style={[
                styles.clusterCard,
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
              ]}
            >
              <View style={styles.clusterHeader}>
                <View style={styles.clusterInfo}>
                  <Folder size={20} color="#8B5CF6" />
                  <Text style={[styles.clusterTitle, { color: theme.text }]}>
                    {cluster.suggested_folder_name}
                  </Text>
                </View>
                <Text style={[styles.clusterCount, { color: theme.textSecondary }]}>
                  {cluster.item_count} items
                </Text>
              </View>
              <Text style={[styles.clusterTopic, { color: theme.textSecondary }]}>
                Topic: {cluster.primary_topic}
              </Text>
              <Text style={[styles.clusterConfidence, { color: theme.textTertiary }]}>
                Confidence: {Math.round(cluster.confidence_score * 100)}%
              </Text>
              <View style={styles.clusterActions}>
                <TouchableOpacity
                  style={[styles.clusterButton, styles.createButton]}
                  onPress={() => createFolderFromCluster(cluster)}
                >
                  <CheckCircle size={16} color="#fff" />
                  <Text style={styles.createButtonText}>Create Folder</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.clusterButton, styles.dismissButton]}
                  onPress={() => dismissCluster(cluster.id)}
                >
                  <X size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {insights.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Recommendations
          </Text>
          {insights.map(insight => {
            const Icon = getInsightIcon(insight.insight_type);
            const priorityColor = getPriorityColor(insight.priority);

            return (
              <View
                key={insight.id}
                style={[
                  styles.insightCard,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                    borderLeftColor: priorityColor,
                  },
                ]}
              >
                <View style={styles.insightHeader}>
                  <View style={styles.insightIcon}>
                    <Icon size={18} color={priorityColor} />
                  </View>
                  <TouchableOpacity
                    style={styles.dismissIcon}
                    onPress={() => dismissInsight(insight.id)}
                  >
                    <X size={16} color={theme.textTertiary} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.insightTitle, { color: theme.text }]}>
                  {insight.title}
                </Text>
                <Text style={[styles.insightDescription, { color: theme.textSecondary }]}>
                  {insight.description}
                </Text>
                {insight.insight_type === 'organization_suggestion' && (
                  <TouchableOpacity
                    style={[styles.insightButton, { borderColor: theme.border }]}
                    onPress={() => acknowledgeInsight(insight.id)}
                  >
                    <Text style={[styles.insightButtonText, { color: theme.primary }]}>
                      View Details
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  clusterCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  clusterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clusterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clusterTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clusterCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  clusterTopic: {
    fontSize: 14,
    marginBottom: 4,
  },
  clusterConfidence: {
    fontSize: 12,
    marginBottom: 12,
  },
  clusterActions: {
    flexDirection: 'row',
    gap: 8,
  },
  clusterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButton: {
    backgroundColor: '#8B5CF6',
    flex: 1,
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: '#f5f5f5',
    padding: 8,
  },
  insightCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  insightIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  dismissIcon: {
    padding: 4,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  insightDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  insightButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  insightButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
