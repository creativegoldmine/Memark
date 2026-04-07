import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Sparkles, ChevronRight, X, TrendingUp } from 'lucide-react-native';
import { supabase, Item } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ItemCard } from './ItemCard';
import { SocialEmbedCard } from './SocialEmbedCard';

interface SemanticCluster {
  id: string;
  cluster_name: string;
  primary_topic: string;
  related_topics: string[];
  keywords: string[];
  item_ids: string[];
  item_count: number;
  confidence_score: number;
  status: string;
}

interface TopicExplorerProps {
  visible: boolean;
  onClose: () => void;
}

export function TopicExplorer({ visible, onClose }: TopicExplorerProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [clusters, setClusters] = useState<SemanticCluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<SemanticCluster | null>(null);
  const [clusterItems, setClusterItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (visible && user?.id) {
      loadClusters();
    }
  }, [visible, user?.id]);

  const loadClusters = async () => {
    if (!user?.id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('semantic_clusters')
      .select('*')
      .eq('user_id', user.id)
      .gte('item_count', 2)
      .order('item_count', { ascending: false })
      .limit(50);

    if (!error && data) {
      setClusters(data);
    }
    setLoading(false);
  };

  const loadClusterItems = async (cluster: SemanticCluster) => {
    if (!user?.id || !cluster.item_ids.length) return;

    setLoadingItems(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .in('id', cluster.item_ids)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClusterItems(data);
    }
    setLoadingItems(false);
  };

  const handleClusterPress = (cluster: SemanticCluster) => {
    setSelectedCluster(cluster);
    loadClusterItems(cluster);
  };

  const handleItemPress = (item: Item) => {
    // Handle item press - could open LinkPreviewModal
  };

  const handleOpenUrl = (url: string) => {
    // Handle URL opening
  };

  const renderItemCard = (item: Item) => {
    const platformType = item.platform_type;
    const embedHtml = item.embed_html;
    const hasMetadata = item.og_image || item.og_title || item.og_description;
    const shouldUseSocialEmbed =
      platformType &&
      ['youtube', 'twitter', 'instagram', 'tiktok', 'vimeo', 'facebook'].includes(platformType) &&
      (embedHtml || hasMetadata);

    if (shouldUseSocialEmbed) {
      return (
        <SocialEmbedCard
          item={item}
          onPress={() => handleItemPress(item)}
          onOpenUrl={handleOpenUrl}
          viewMode="list"
        />
      );
    }

    return (
      <ItemCard
        item={item}
        onPress={() => handleItemPress(item)}
        onOpenUrl={handleOpenUrl}
        viewMode="list"
      />
    );
  };

  const getTopicColor = (confidence: number) => {
    if (confidence > 0.8) return '#10B981';
    if (confidence > 0.6) return '#F59E0B';
    return '#6B7280';
  };

  if (loading) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Topic Explorer</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          {selectedCluster ? (
            <>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setSelectedCluster(null);
                  setClusterItems([]);
                }}
              >
                <ChevronRight
                  size={20}
                  color={theme.primary}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {selectedCluster.primary_topic}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.headerLeft}>
                <Sparkles size={24} color="#8B5CF6" />
                <Text style={[styles.headerTitle, { color: theme.text }]}>Topic Explorer</Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {!selectedCluster ? (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {clusters.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  No topics discovered yet
                </Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Save more items and AI will automatically detect topics
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  {clusters.length} Topics Discovered
                </Text>
                {clusters.map(cluster => {
                  const confidenceColor = getTopicColor(cluster.confidence_score);
                  return (
                    <TouchableOpacity
                      key={cluster.id}
                      style={[
                        styles.clusterCard,
                        { backgroundColor: theme.cardBackground, borderColor: theme.border },
                      ]}
                      onPress={() => handleClusterPress(cluster)}
                    >
                      <View style={styles.clusterHeader}>
                        <View style={styles.clusterInfo}>
                          <View
                            style={[
                              styles.clusterBadge,
                              { backgroundColor: confidenceColor + '20' },
                            ]}
                          >
                            <TrendingUp size={16} color={confidenceColor} />
                          </View>
                          <View style={styles.clusterText}>
                            <Text style={[styles.clusterName, { color: theme.text }]}>
                              {cluster.primary_topic}
                            </Text>
                            <Text style={[styles.clusterCount, { color: theme.textSecondary }]}>
                              {cluster.item_count} items • {Math.round(cluster.confidence_score * 100)}%
                              confidence
                            </Text>
                          </View>
                        </View>
                        <ChevronRight size={20} color={theme.textTertiary} />
                      </View>

                      {cluster.related_topics.length > 0 && (
                        <View style={styles.topicTags}>
                          {cluster.related_topics.slice(0, 3).map((topic, index) => (
                            <View
                              key={index}
                              style={[styles.topicTag, { backgroundColor: theme.surface }]}
                            >
                              <Text style={[styles.topicTagText, { color: theme.textSecondary }]}>
                                {topic}
                              </Text>
                            </View>
                          ))}
                          {cluster.related_topics.length > 3 && (
                            <Text style={[styles.moreTopics, { color: theme.textTertiary }]}>
                              +{cluster.related_topics.length - 3} more
                            </Text>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </ScrollView>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {loadingItems ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#8B5CF6" />
              </View>
            ) : (
              <>
                <View style={styles.clusterDetail}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                    Related Topics
                  </Text>
                  <View style={styles.topicTags}>
                    {selectedCluster.related_topics.map((topic, index) => (
                      <View
                        key={index}
                        style={[styles.topicTag, { backgroundColor: theme.surface }]}
                      >
                        <Text style={[styles.topicTagText, { color: theme.textSecondary }]}>
                          {topic}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {selectedCluster.keywords.length > 0 && (
                    <>
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: theme.textSecondary, marginTop: 16 },
                        ]}
                      >
                        Keywords
                      </Text>
                      <View style={styles.topicTags}>
                        {selectedCluster.keywords.slice(0, 10).map((keyword, index) => (
                          <View
                            key={index}
                            style={[styles.keywordTag, { backgroundColor: theme.surface }]}
                          >
                            <Text style={[styles.keywordTagText, { color: theme.textTertiary }]}>
                              {keyword}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </View>

                <Text style={[styles.itemsHeader, { color: theme.text }]}>
                  {clusterItems.length} Items
                </Text>
                {clusterItems.map(item => (
                  <View key={item.id}>{renderItemCard(item)}</View>
                ))}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
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
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
  },
  clusterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  clusterBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clusterText: {
    flex: 1,
  },
  clusterName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  clusterCount: {
    fontSize: 13,
  },
  topicTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  topicTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  topicTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  keywordTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  keywordTagText: {
    fontSize: 11,
  },
  moreTopics: {
    fontSize: 12,
    alignSelf: 'center',
    paddingHorizontal: 8,
  },
  clusterDetail: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  itemsHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
});
