import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ActivityIndicator, Alert } from 'react-native';
import { Link2, Video, FileText, MessageSquare, Image as ImageIcon, CheckSquare, ChevronDown, ChevronUp, Star, ExternalLink, Play, Archive, Folder, Tag, Trash2, Check, RotateCcw, SkipForward, Clock, Copy, Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/contexts/ThemeContext';
import { Item } from '@/lib/supabase';
import { VideoPlayerModal } from './VideoPlayerModal';

interface ItemCardProps {
  item: Item;
  onPress?: () => void;
  onOpenUrl?: (url: string) => void;
  viewMode?: 'grid' | 'list' | 'compact';
  showActions?: boolean;
  showReviewBadge?: boolean;
  onMarkReviewed?: (item: Item) => void;
  onArchive?: (item: Item) => void;
  onStar?: (item: Item) => void;
  onDelete?: (item: Item) => void;
  onAddToFolder?: (item: Item) => void;
  onSkip?: (item: Item) => void;
  onSnooze?: (item: Item, days: number) => void;
  onCopyUrl?: (item: Item) => void;
  onSetReminder?: (item: Item) => void;
  isDueForReview?: boolean;
  hasReminder?: boolean;
}

export function ItemCard({
  item,
  onPress,
  onOpenUrl,
  viewMode = 'list',
  showActions = false,
  showReviewBadge = false,
  onMarkReviewed,
  onArchive,
  onStar,
  onDelete,
  onAddToFolder,
  onSkip,
  onSnooze,
  onCopyUrl,
  onSetReminder,
  isDueForReview = false,
  hasReminder = false,
}: ItemCardProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isStarred = (item as any).is_starred;
  const isArchived = (item as any).is_archived;
  const lastReviewed = (item as any).last_reviewed_at;

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

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

  const handleVideoPlay = (e: any) => {
    e.stopPropagation();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setVideoModalVisible(true);
  };

  const handleCopyUrl = async (e: any) => {
    e.stopPropagation();
    triggerHaptic();

    const url = extractUrl();
    if (url) {
      await Clipboard.setStringAsync(url);
      Alert.alert('Copied!', 'Link copied to clipboard');
      if (onCopyUrl) {
        onCopyUrl(item);
      }
    } else {
      Alert.alert('No URL', 'This item does not have a URL to copy');
    }
  };

  const handleSetReminder = (e: any) => {
    e.stopPropagation();
    triggerHaptic();

    if (onSetReminder) {
      onSetReminder(item);
    }
  };

  const getVideoUrl = () => {
    if ((item as any).video_url) {
      return (item as any).video_url;
    }
    return extractUrl();
  };

  const extractUrl = () => {
    if (!item.raw_content) return null;
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

  const getImageUrl = () => {
    const mediaUrls = (item as any).media_urls;
    const mediaUrl = (item as any).media_url;
    const isManual = (item as any).is_manual;

    if (item.og_image) {
      return item.og_image;
    }
    if (item.image_preview) {
      return item.image_preview;
    }
    if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      return mediaUrls[0];
    }
    if (mediaUrl && !isManual) {
      const isImageUrl = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(mediaUrl);
      if (isImageUrl) {
        return mediaUrl;
      }
    }
    if (item.preview_image_url) {
      return item.preview_image_url;
    }
    return null;
  };

  const imageUrl = getImageUrl();

  if (viewMode === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        onPress={() => {
          triggerHaptic();
          onPress?.();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.compactLeft}>
          {imageUrl && !imageError ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.compactImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.compactIconContainer, { backgroundColor: theme.surface }]}>
              {getIcon()}
            </View>
          )}
          <View style={styles.compactContent}>
            <Text style={[styles.compactTitle, { color: theme.text }]} numberOfLines={1}>
              {item.og_title || item.title || item.raw_content || 'Untitled'}
            </Text>
            <View style={styles.compactMeta}>
              <Text style={[styles.compactSource, { color: theme.textTertiary }]} numberOfLines={1}>
                {item.og_site_name || getDomain(extractUrl() || '') || item.type}
              </Text>
              <Text style={[styles.compactTime, { color: theme.textTertiary }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
        </View>
        {showActions && (
          <View style={styles.compactActions}>
            {onStar && (
              <TouchableOpacity
                style={styles.compactActionBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  triggerHaptic();
                  onStar(item);
                }}
              >
                <Star size={16} color={isStarred ? theme.warning : theme.textTertiary} fill={isStarred ? theme.warning : 'transparent'} />
              </TouchableOpacity>
            )}
            {onArchive && (
              <TouchableOpacity
                style={styles.compactActionBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  triggerHaptic();
                  onArchive(item);
                }}
              >
                <Archive size={16} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        )}
        {!lastReviewed && (
          <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <>
      <View
        style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      >
      <View style={styles.imageContainer}>
        {imageUrl && !imageError ? (
          <>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
            {imageLoading && (
              <View style={[styles.imageLoadingOverlay, { backgroundColor: theme.surface }]}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            )}
          </>
        ) : (
          <View style={[styles.logoFallback, { backgroundColor: theme.primary + '10' }]}>
            <Image
              source={require('@/assets/images/copy_of_memark.png')}
              style={styles.fallbackImage}
              resizeMode="contain"
            />
          </View>
        )}
        {item.score && item.score >= 70 && (
          <View style={[styles.scoreBadge, { backgroundColor: getScoreColor() }]}>
            <Text style={styles.scoreBadgeText}>{Math.round(item.score)}%</Text>
          </View>
        )}
        {showReviewBadge && (
          <View style={[styles.reviewBadge, { backgroundColor: theme.warning }]}>
            <RotateCcw size={12} color="#FFFFFF" />
            <Text style={styles.reviewBadgeText}>Review</Text>
          </View>
        )}
        {(item.video_url || (item as any).platform_type === 'youtube' || (item as any).platform_type === 'vimeo' || (item as any).platform_type === 'tiktok') && (
          <TouchableOpacity style={styles.videoBadge} onPress={handleVideoPlay} activeOpacity={0.8}>
            <View style={styles.playButton}>
              <Play size={32} color="#8B5CF6" fill="#8B5CF6" />
            </View>
            {(item as any).content_duration && (
              <View style={[styles.durationBadge, { backgroundColor: 'rgba(0, 0, 0, 0.75)' }]}>
                <Text style={styles.durationText}>{(item as any).content_duration}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {((item as any).platform_type || item.embed_type) && !item.video_url && (item as any).platform_type !== 'youtube' && (item as any).platform_type !== 'vimeo' && (
          <View style={[styles.embedBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.embedBadgeText}>
              {(item as any).platform_type === 'twitter' || item.embed_type === 'twitter' ? '𝕏' :
               (item as any).platform_type === 'instagram' ? '📷' :
               (item as any).platform_type === 'tiktok' ? '🎵' :
               (item as any).platform_type === 'reddit' ? '🤖' :
               (item as any).platform_type === 'linkedin' ? '💼' :
               (item as any).platform_type === 'github' ? '💻' :
               (item as any).platform_type === 'medium' ? 'M' :
               item.embed_type === 'youtube' ? '▶' : '🔗'}
            </Text>
          </View>
        )}
        {((item as any).media_count > 1 || ((item as any).media_urls && (item as any).media_urls.length > 1)) && (
          <View style={[styles.mediaCountBadge, { backgroundColor: 'rgba(0, 0, 0, 0.75)' }]}>
            <Text style={styles.mediaCountText}>1/{(item as any).media_count || (item as any).media_urls.length}</Text>
          </View>
        )}
        {(item as any).is_thread && (
          <View style={[styles.threadBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.threadBadgeText}>🧵 Thread</Text>
          </View>
        )}
      </View>

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

        {(item.og_site_name || (item as any).author_name) && (
          <Text style={[styles.siteName, { color: theme.textTertiary }]}>
            {(item as any).author_name ? `${(item as any).author_name}${item.og_site_name ? ` • ${item.og_site_name}` : ''}` : item.og_site_name}
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

      {showActions && (
        <View style={[styles.actionBar, { borderTopColor: theme.border }]}>
          {isDueForReview && onSkip && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.surface }]}
              onPress={() => {
                triggerHaptic();
                onSkip(item);
              }}
            >
              <SkipForward size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
          {isDueForReview && onSnooze && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.surface }]}
              onPress={() => {
                triggerHaptic();
                onSnooze(item, 7);
              }}
            >
              <Clock size={16} color={theme.warning} />
              <Text style={[styles.actionBtnText, { color: theme.warning }]}>7d</Text>
            </TouchableOpacity>
          )}
          {onStar && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: isStarred ? theme.warning + '25' : theme.surface }]}
              onPress={() => {
                triggerHaptic();
                onStar(item);
              }}
            >
              <Star size={16} color={isStarred ? theme.warning : theme.textTertiary} fill={isStarred ? theme.warning : 'transparent'} />
            </TouchableOpacity>
          )}
          {onCopyUrl && extractUrl() && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.surface }]}
              onPress={handleCopyUrl}
            >
              <Copy size={16} color={theme.primary} />
            </TouchableOpacity>
          )}
          {onSetReminder && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: hasReminder ? theme.warning + '20' : theme.surface }]}
              onPress={handleSetReminder}
            >
              <Bell size={16} color={hasReminder ? theme.warning : theme.textTertiary} fill={hasReminder ? theme.warning : 'transparent'} />
            </TouchableOpacity>
          )}
          {onAddToFolder && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.surface }]}
              onPress={() => {
                triggerHaptic();
                onAddToFolder(item);
              }}
            >
              <Folder size={16} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
          {onArchive && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.surface }]}
              onPress={() => {
                triggerHaptic();
                onArchive(item);
              }}
            >
              <Archive size={16} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
          {onDelete && !showDeleteConfirm && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.error + '10' }]}
              onPress={() => {
                triggerHaptic();
                setShowDeleteConfirm(true);
              }}
            >
              <Trash2 size={16} color={theme.error} />
            </TouchableOpacity>
          )}
          {onDelete && showDeleteConfirm && (
            <View style={styles.deleteConfirmRow}>
              <Text style={[styles.deleteConfirmText, { color: theme.error }]}>Delete?</Text>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, { backgroundColor: theme.error }]}
                onPress={() => {
                  triggerHaptic();
                  onDelete(item);
                  setShowDeleteConfirm(false);
                }}
              >
                <Text style={styles.deleteConfirmBtnText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => {
                  triggerHaptic();
                  setShowDeleteConfirm(false);
                }}
              >
                <Text style={[styles.deleteConfirmBtnText, { color: theme.text }]}>No</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>

    <VideoPlayerModal
      visible={videoModalVisible}
      videoUrl={getVideoUrl() || ''}
      platformType={(item as any).platform_type}
      title={item.og_title || item.preview_title || item.title}
      onClose={() => setVideoModalVisible(false)}
    />
    </>
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
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackImage: {
    width: 160,
    height: 160,
    opacity: 0.4,
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
  reviewBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  reviewBadgeText: {
    fontSize: 11,
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
  mediaCountBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    } : {
      elevation: 4,
    }),
  },
  mediaCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  threadBadge: {
    position: 'absolute',
    bottom: 12,
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
  threadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  videoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
    } : {
      elevation: 16,
    }),
  },
  durationBadge: {
    position: 'absolute',
    bottom: -70,
    right: -30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  compactImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  compactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactSource: {
    fontSize: 11,
    flex: 1,
  },
  compactTime: {
    fontSize: 11,
  },
  compactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactActionBtn: {
    padding: 6,
  },
  unreadDot: {
    position: 'absolute',
    left: 4,
    top: '50%',
    marginTop: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: 8,
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteConfirmText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteConfirmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteConfirmBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
