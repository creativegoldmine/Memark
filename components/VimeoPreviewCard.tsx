import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface VimeoPreviewCardProps {
  item: any;
  onPress?: () => void;
}

export default function VimeoPreviewCard({ item, onPress }: VimeoPreviewCardProps) {
  const { theme } = useTheme();

  const thumbnail = (item.og_image && item.og_image !== '0' && item.og_image !== '')
    ? item.og_image
    : null;

  const creatorName = item.author_name || item.og_author || 'Vimeo Creator';
  const creatorAvatar = (item.author_avatar && item.author_avatar !== '0' && item.author_avatar !== '')
    ? item.author_avatar
    : null;

  const videoTitle = item.og_title || item.preview_title || item.title || 'Vimeo Video';
  const description = item.og_description || item.preview_desc || '';
  const duration = item.embed_metadata?.duration || null;
  const viewCount = item.embed_metadata?.view_count || null;

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M plays`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K plays`;
    }
    return `${count} plays`;
  };

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={handlePress}
    >
      {thumbnail && (
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Play size={28} color="white" fill="white" strokeWidth={0} />
            </View>
          </View>
          {duration && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{duration}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.content}>
        <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>
          {videoTitle}
        </Text>

        <View style={styles.creatorInfo}>
          {creatorAvatar ? (
            <Image source={{ uri: creatorAvatar }} style={styles.creatorAvatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#1AB7EA' }]}>
              <Text style={styles.avatarText}>{creatorName[0]?.toUpperCase() || 'V'}</Text>
            </View>
          )}
          <View style={styles.creatorDetails}>
            <Text style={[styles.creatorName, { color: theme.text }]} numberOfLines={1}>
              {creatorName}
            </Text>
            {viewCount && (
              <Text style={[styles.metadata, { color: theme.textSecondary }]}>
                {formatViewCount(viewCount)}
              </Text>
            )}
          </View>
        </View>

        {description && (
          <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={3}>
            {description}
          </Text>
        )}
      </View>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <View style={styles.platformBadge}>
          <View style={styles.vimeoLogo}>
            <Play size={10} color="white" fill="white" strokeWidth={0} />
          </View>
          <Text style={[styles.platformText, { color: theme.textSecondary }]}>Vimeo</Text>
        </View>
        <Text style={[styles.tapHint, { color: theme.textTertiary }]}>Tap to watch</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1AB7EA',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 12,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  creatorDetails: {
    flex: 1,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  metadata: {
    fontSize: 12,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vimeoLogo: {
    width: 20,
    height: 20,
    backgroundColor: '#1AB7EA',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tapHint: {
    fontSize: 11,
  },
});
