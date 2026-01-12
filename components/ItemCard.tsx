import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Link2, Video, FileText, MessageSquare, Image as ImageIcon, CheckSquare, ChevronDown, ChevronUp, Star, ExternalLink } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { Item } from '@/lib/supabase';

interface ItemCardProps {
  item: Item;
  onPress?: () => void;
  onOpenUrl?: (url: string) => void;
  viewMode?: 'grid' | 'list';
}

export function ItemCard({ item, onPress, onOpenUrl, viewMode = 'list' }: ItemCardProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);

  const getIcon = () => {
    switch (item.type) {
      case 'video':
        return <Video size={16} color={theme.primary} />;
      case 'article':
        return <FileText size={16} color={theme.primary} />;
      case 'note':
        return <MessageSquare size={16} color={theme.primary} />;
      case 'screenshot':
        return <ImageIcon size={16} color={theme.primary} />;
      case 'task':
        return <CheckSquare size={16} color={theme.primary} />;
      default:
        return <Link2 size={16} color={theme.primary} />;
    }
  };

  const getCategoryColor = () => {
    const colors: Record<string, string> = {
      work: '#3B82F6',
      personal: '#10B981',
      inspiration: '#F59E0B',
      finance: '#8B5CF6',
      learning: '#EC4899',
    };
    return colors[item.category?.toLowerCase() || ''] || theme.primary;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getScoreColor = () => {
    if (!item.score) return theme.textTertiary;
    if (item.score >= 80) return theme.success;
    if (item.score >= 60) return theme.primary;
    if (item.score >= 40) return theme.warning;
    return theme.error;
  };

  const handleCardPress = (e: any) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setExpanded(!expanded);
  };

  const toggleExpand = (e: any) => {
    e.stopPropagation();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setExpanded(!expanded);
  };

  const handleUrlPress = (e: any) => {
    e.stopPropagation();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const url = extractUrl();
    if (url && onOpenUrl) {
      onOpenUrl(url);
    }
  };

  const extractUrl = () => {
    if (item.raw_content.startsWith('http')) {
      return item.raw_content;
    }
    const urlMatch = item.raw_content.match(/https?:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0] : null;
  };

  const getDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  const renderScoreBar = () => {
    if (!item.score) return null;
    const scorePercent = Math.round(item.score);
    const scoreColor = getScoreColor();

    return (
      <View style={styles.scoreBarContainer}>
        <View style={styles.scoreBarHeader}>
          <View style={styles.scoreStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={12}
                color={scorePercent >= star * 20 ? scoreColor : theme.border}
                fill={scorePercent >= star * 20 ? scoreColor : 'transparent'}
              />
            ))}
          </View>
          <Text style={[styles.scorePercentText, { color: scoreColor }]}>
            {scorePercent}%
          </Text>
        </View>
        <View style={[styles.scoreBar, { backgroundColor: theme.surface }]}>
          <View
            style={[
              styles.scoreBarFill,
              { width: `${scorePercent}%`, backgroundColor: scoreColor }
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <View
      style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
    >
      {(item.og_image || item.preview_image_url || item.image_preview) && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.og_image || item.preview_image_url || item.image_preview }}
            style={styles.image}
            resizeMode="cover"
          />
          {item.score && item.score >= 70 && (
            <View style={[styles.scoreBadge, { backgroundColor: getScoreColor() }]}>
              <Text style={styles.scoreBadgeText}>{Math.round(item.score)}%</Text>
            </View>
          )}
          {item.video_url && (
            <View style={[styles.videoBadge, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
              <Text style={styles.videoBadgeText}>▶</Text>
            </View>
          )}
          {item.embed_type && !item.video_url && (
            <View style={[styles.embedBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.embedBadgeText}>
                {item.embed_type === 'youtube' ? '▶' : item.embed_type === 'twitter' ? '𝕏' : '🔗'}
              </Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.content} onPress={handleCardPress} activeOpacity={0.9}>
        <View style={styles.header}>
          <View style={styles.iconRow}>
            {getIcon()}
            <Text style={[styles.type, { color: theme.textSecondary }]}>
              {item.type?.charAt(0).toUpperCase() + item.type?.slice(1) || 'Link'}
            </Text>
          </View>
          {item.category && (
            <View style={[styles.categoryChip, { backgroundColor: getCategoryColor() + '20' }]}>
              <Text style={[styles.categoryText, { color: getCategoryColor() }]}>
                {item.category}
              </Text>
            </View>
          )}
        </View>

        {item.og_site_name && (
          <Text style={[styles.siteName, { color: theme.textTertiary }]}>
            {item.og_site_name}
          </Text>
        )}

        <Text style={[styles.title, { color: theme.text }]} numberOfLines={expanded ? undefined : 2}>
          {item.og_title || item.preview_title || item.title || item.raw_content || 'Untitled'}
        </Text>

        {(item.og_description || item.preview_desc || item.summary) && (
          <View>
            <Text
              style={[styles.summary, { color: theme.textSecondary }]}
              numberOfLines={expanded ? undefined : 3}
            >
              {item.og_description || item.preview_desc || item.summary}
            </Text>

            {expanded && (
              <View style={styles.expandedContent}>
                {item.og_title && item.og_title !== item.title && (
                  <Text style={[styles.ogTitle, { color: theme.text }]} numberOfLines={2}>
                    {item.og_title}
                  </Text>
                )}
                {item.og_description && item.og_description !== item.summary && (
                  <Text style={[styles.ogDescription, { color: theme.textSecondary }]} numberOfLines={4}>
                    {item.og_description}
                  </Text>
                )}
                {extractUrl() && (
                  <TouchableOpacity
                    style={[styles.urlButton, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}
                    onPress={handleUrlPress}
                    activeOpacity={0.7}
                  >
                    <ExternalLink size={16} color={theme.primary} />
                    <View style={styles.urlContent}>
                      <Text style={[styles.urlDomain, { color: theme.primary }]}>
                        {getDomain(extractUrl()!)}
                      </Text>
                      <Text style={[styles.urlText, { color: theme.textSecondary }]} numberOfLines={1}>
                        {extractUrl()}
                      </Text>
                    </View>
                    <ChevronDown size={16} color={theme.primary} style={{ transform: [{ rotate: '-90deg' }] }} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {(item.preview_desc || item.summary || '').length > 100 && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={toggleExpand}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.expandText, { color: theme.primary }]}>
                  {expanded ? 'Show less' : 'Show more'}
                </Text>
                {expanded ? (
                  <ChevronUp size={14} color={theme.primary} />
                ) : (
                  <ChevronDown size={14} color={theme.primary} />
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {renderScoreBar()}

        {item.tags && item.tags.length > 0 && (
          <View style={styles.tags}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: theme.surface }]}>
                <Text style={[styles.tagText, { color: theme.textSecondary }]}>#{tag}</Text>
              </View>
            ))}
            {item.tags.length > 3 && (
              <Text style={[styles.moreTagsText, { color: theme.textTertiary }]}>
                +{item.tags.length - 3} more
              </Text>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={[styles.time, { color: theme.textTertiary }]}>
            {formatDate(item.created_at)}
          </Text>
          {extractUrl() && onOpenUrl && (
            <TouchableOpacity
              style={[styles.quickLinkButton, { backgroundColor: theme.primary + '15' }]}
              onPress={handleUrlPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ExternalLink size={14} color={theme.primary} />
              <Text style={[styles.quickLinkText, { color: theme.primary }]}>
                {getDomain(extractUrl()!)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    } : {
      elevation: 5,
    }),
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  scoreBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    } : {
      elevation: 4,
    }),
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  type: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    } : {
      elevation: 2,
    }),
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  siteName: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 22,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    } : {
      elevation: 1,
    }),
  },
  tagText: {
    fontSize: 11,
  },
  moreTagsText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  expandText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scoreBarContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  scoreBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scoreStars: {
    flexDirection: 'row',
    gap: 3,
  },
  scorePercentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scoreBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  embedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    } : {
      elevation: 4,
    }),
  },
  embedBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  videoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    } : {
      elevation: 8,
    }),
  },
  videoBadgeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 6,
  },
  urlContent: {
    flex: 1,
  },
  urlDomain: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  urlText: {
    fontSize: 12,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.15)',
  },
  ogTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 20,
  },
  ogDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  quickLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  quickLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
