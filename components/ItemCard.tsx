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

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={onPress}
    >
      {item.image_preview && (
        <Image source={{ uri: item.image_preview }} style={styles.image} resizeMode="cover" />
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconRow}>
            {getIcon()}
            <Text style={[styles.type, { color: theme.textSecondary }]}>
              {item.type?.charAt(0).toUpperCase() + item.type?.slice(1)}
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
          {item.title || item.raw_content}
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
          </View>
        )}

        <View style={styles.footer}>
          <Text style={[styles.time, { color: theme.textTertiary }]}>
            {formatDate(item.created_at)}
          </Text>
          {item.score && (
            <View style={styles.scoreContainer}>
              <View style={[styles.scoreBar, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.scoreFill,
                    { backgroundColor: theme.primary, width: `${item.score}%` },
                  ]}
                />
              </View>
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
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    } : {
      elevation: 3,
    }),
  },
  image: {
    width: '100%',
    height: 160,
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
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    } : {
      elevation: 1,
    }),
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
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
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 1,
    } : {}),
  },
  tagText: {
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
  },
  scoreContainer: {
    width: 60,
  },
  scoreBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 2,
  },
});
