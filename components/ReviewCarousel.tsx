import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Dimensions, Alert } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInRight, useAnimatedStyle, withSpring, useSharedValue, runOnJS } from 'react-native-reanimated';
import { Archive, Check, ChevronRight, Clock, ExternalLink, Star, X, Copy } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/contexts/ThemeContext';
import { Item } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.75;
const CARD_MARGIN = 8;

interface ReviewCarouselProps {
  items: Item[];
  title: string;
  subtitle?: string;
  onItemPress: (item: Item) => void;
  onMarkReviewed: (item: Item) => void;
  onArchive: (item: Item) => void;
  onStar: (item: Item) => void;
  onSeeAll?: () => void;
  showActions?: boolean;
}

export function ReviewCarousel({
  items,
  title,
  subtitle,
  onItemPress,
  onMarkReviewed,
  onArchive,
  onStar,
  onSeeAll,
  showActions = true
}: ReviewCarouselProps) {
  const { theme } = useTheme();

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const getDomain = (url?: string) => {
    if (!url) return '';
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain.length > 20 ? domain.substring(0, 20) + '...' : domain;
    } catch {
      return '';
    }
  };

  const handleCopyUrl = async (item: Item) => {
    triggerHaptic();
    const url = item.raw_content?.startsWith('http')
      ? item.raw_content
      : item.raw_content?.match(/https?:\/\/[^\s]+/)?.[0] || item.url;

    if (url) {
      await Clipboard.setStringAsync(url);
      Alert.alert('Copied!', 'Link copied to clipboard');
    } else {
      Alert.alert('No URL', 'This item does not have a URL to copy');
    }
  };

  const hasUrl = (item: Item) => {
    return item.url || item.raw_content?.startsWith('http') || item.raw_content?.match(/https?:\/\/[^\s]+/);
  };

  const renderItem = ({ item, index }: { item: Item; index: number }) => {
    const isStarred = (item as any).is_starred;

    return (
      <Animated.View
        entering={FadeInRight.delay(index * 50).duration(300)}
        style={[styles.card, { width: CARD_WIDTH, backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      >
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => {
            triggerHaptic();
            onItemPress(item);
          }}
          activeOpacity={0.9}
        >
          {item.og_image && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: item.og_image }}
                style={styles.image}
                resizeMode="cover"
              />
              <View style={[styles.timeBadge, { backgroundColor: theme.overlay }]}>
                <Clock size={10} color="#FFFFFF" />
                <Text style={styles.timeBadgeText}>{getTimeAgo(item.created_at)}</Text>
              </View>
            </View>
          )}

          <View style={styles.textContent}>
            {item.og_site_name && (
              <Text style={[styles.source, { color: theme.textTertiary }]} numberOfLines={1}>
                {item.og_site_name}
              </Text>
            )}
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {item.title || item.og_title || 'Untitled'}
            </Text>
            {(item.summary || item.og_description) && (
              <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
                {item.summary || item.og_description}
              </Text>
            )}
            <View style={styles.meta}>
              {item.category && (
                <View style={[styles.categoryBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.categoryText, { color: theme.primary }]}>{item.category}</Text>
                </View>
              )}
              {getDomain(item.url) && (
                <Text style={[styles.domain, { color: theme.textTertiary }]}>{getDomain(item.url)}</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {showActions && (
          <View style={[styles.actions, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.success + '15' }]}
              onPress={() => {
                triggerHaptic();
                onMarkReviewed(item);
              }}
            >
              <Check size={16} color={theme.success} />
              <Text style={[styles.actionText, { color: theme.success }]}>Done</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isStarred ? theme.warning + '30' : theme.surface }]}
              onPress={() => {
                triggerHaptic();
                onStar(item);
              }}
            >
              <Star size={16} color={isStarred ? theme.warning : theme.textTertiary} fill={isStarred ? theme.warning : 'transparent'} />
            </TouchableOpacity>

            {hasUrl(item) && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.surface }]}
                onPress={() => handleCopyUrl(item)}
              >
                <Copy size={16} color={theme.primary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.surface }]}
              onPress={() => {
                triggerHaptic();
                onArchive(item);
              }}
            >
              <Archive size={16} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    );
  };

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
          )}
        </View>
        {onSeeAll && (
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => {
              triggerHaptic();
              onSeeAll();
            }}
          >
            <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
            <ChevronRight size={16} color={theme.primary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items.slice(0, 10)}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
        decelerationRate="fast"
        snapToAlignment="start"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 12,
  },
  card: {
    marginHorizontal: CARD_MARGIN,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
  },
  imageContainer: {
    height: 120,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  timeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  textContent: {
    padding: 12,
  },
  source: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  domain: {
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: 8,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
