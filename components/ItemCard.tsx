import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Link2, Video, FileText, MessageSquare, Image as ImageIcon, CheckSquare } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Item } from '@/lib/supabase';

interface ItemCardProps {
  item: Item;
  onPress: () => void;
}

export function ItemCard({ item, onPress }: ItemCardProps) {
  const { theme } = useTheme();

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

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {item.image_preview && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image_preview }}
            style={styles.image}
            resizeMode="cover"
          />
          {item.score && item.score >= 70 && (
            <View style={[styles.scoreBadge, { backgroundColor: getScoreColor() }]}>
              <Text style={styles.scoreBadgeText}>{Math.round(item.score)}%</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.content}>
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

        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {item.title || item.raw_content || 'Untitled'}
        </Text>

        {item.summary && (
          <Text style={[styles.summary, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.summary}
          </Text>
        )}

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
          {item.score && !item.image_preview && (
            <View style={styles.scoreChip}>
              <View style={[styles.scoreIndicator, { backgroundColor: getScoreColor() }]} />
              <Text style={[styles.scoreText, { color: theme.textSecondary }]}>
                {Math.round(item.score)}% relevance
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
