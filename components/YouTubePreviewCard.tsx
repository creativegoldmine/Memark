import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface YouTubePreviewCardProps {
  item: any;
  onPress?: () => void;
}

export default function YouTubePreviewCard({ item, onPress }: YouTubePreviewCardProps) {
  const { theme } = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const thumbnail = (item.og_image && item.og_image !== '0' && item.og_image !== '')
    ? item.og_image
    : null;

  const channelName = item.author_name || item.og_author || 'YouTube Channel';
  const channelAvatar = (item.author_avatar && item.author_avatar !== '0' && item.author_avatar !== '')
    ? item.author_avatar
    : null;

  const videoTitle = item.og_title || item.preview_title || item.title || 'YouTube Video';
  const description = item.og_description || item.preview_desc || '';
  const duration = item.embed_metadata?.duration || null;
  const viewCount = item.embed_metadata?.view_count || null;

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  };

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={handlePress}
    >
      {thumbnail && (
        <View style={styles.thumbnailContainer}>
          {!imageLoaded && (
            <View style={[styles.skeleton, { backgroundColor: theme.border }]} />
          )}
          <Animated.Image
            source={{ uri: thumbnail }}
            style={[styles.thumbnail, { opacity: fadeAnim }]}
            resizeMode="cover"
            onLoad={handleImageLoad}
          />
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
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
        <View style={styles.header}>
          {channelAvatar ? (
            <Image source={{ uri: channelAvatar }} style={styles.channelAvatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#FF0000' }]}>
              <Text style={styles.avatarText}>{channelName[0]?.toUpperCase() || 'Y'}</Text>
            </View>
          )}
          <View style={styles.videoInfo}>
            <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>
              {videoTitle}
            </Text>
            <Text style={[styles.channelName, { color: theme.textSecondary }]} numberOfLines={1}>
              {channelName}
            </Text>
            {viewCount && (
              <Text style={[styles.metadata, { color: theme.textSecondary }]}>
                {formatViewCount(viewCount)}
              </Text>
            )}
          </View>
        </View>

        {description && (
          <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <View style={styles.platformBadge}>
          <View style={styles.youtubeLogo}>
            <Text style={styles.youtubeText}>▶</Text>
          </View>
          <Text style={[styles.platformText, { color: theme.textSecondary }]}>YouTube</Text>
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
  skeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    aspectRatio: 16 / 9,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 68,
    height: 48,
    backgroundColor: '#FF0000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 20,
    color: 'white',
    marginLeft: 4,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 3,
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
  header: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  channelAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  channelName: {
    fontSize: 13,
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
  youtubeLogo: {
    width: 20,
    height: 20,
    backgroundColor: '#FF0000',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubeText: {
    color: 'white',
    fontSize: 10,
    marginLeft: 1,
  },
  platformText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tapHint: {
    fontSize: 11,
  },
});
