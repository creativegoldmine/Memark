import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Heart, MessageCircle, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface TikTokPreviewCardProps {
  item: any;
  onPress?: () => void;
}

export default function TikTokPreviewCard({ item, onPress }: TikTokPreviewCardProps) {
  const { theme } = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const thumbnail = (item.og_image && item.og_image !== '0' && item.og_image !== '')
    ? item.og_image
    : null;

  const authorName = item.author_name || item.og_author || 'TikTok User';
  const authorAvatar = (item.author_avatar && item.author_avatar !== '0' && item.author_avatar !== '')
    ? item.author_avatar
    : null;

  const caption = item.og_description || item.preview_desc || '';
  const videoTitle = item.og_title || item.preview_title || '';
  const likeCount = item.embed_metadata?.like_count || null;
  const commentCount = item.embed_metadata?.comment_count || null;

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

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={handlePress}
    >
      <View style={styles.header}>
        {authorAvatar ? (
          <Image source={{ uri: authorAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{authorName[0]?.toUpperCase() || 'T'}</Text>
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text style={[styles.authorName, { color: theme.text }]}>{authorName}</Text>
          <View style={styles.platformBadge}>
            <Text style={[styles.platformText, { color: theme.textSecondary }]}>TikTok</Text>
          </View>
        </View>
      </View>

      {thumbnail && (
        <View style={styles.videoContainer}>
          {!imageLoaded && (
            <View style={[styles.skeleton, { backgroundColor: theme.border }]} />
          )}
          <Animated.Image
            source={{ uri: thumbnail }}
            style={[styles.videoThumbnail, { opacity: fadeAnim }]}
            resizeMode="cover"
            onLoad={handleImageLoad}
          />
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>

          <View style={styles.sideActions}>
            <View style={styles.actionIcon}>
              <Heart size={28} color="white" strokeWidth={2} fill="none" />
              {likeCount && (
                <Text style={styles.actionCount}>{formatCount(likeCount)}</Text>
              )}
            </View>
            <View style={styles.actionIcon}>
              <MessageCircle size={28} color="white" strokeWidth={2} />
              {commentCount && (
                <Text style={styles.actionCount}>{formatCount(commentCount)}</Text>
              )}
            </View>
            <View style={styles.actionIcon}>
              <Share2 size={28} color="white" strokeWidth={2} />
            </View>
          </View>
        </View>
      )}

      <View style={styles.content}>
        {videoTitle && (
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {videoTitle}
          </Text>
        )}
        {caption && (
          <Text style={[styles.caption, { color: theme.text }]} numberOfLines={3}>
            <Text style={styles.captionUsername}>@{authorName}</Text> {caption}
          </Text>
        )}
      </View>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Text style={[styles.date, { color: theme.textTertiary }]}>
          {new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
        <Text style={[styles.tapHint, { color: theme.textTertiary }]}>Tap to watch on TikTok</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FE2C55',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#FE2C55',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FE2C55',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformText: {
    fontSize: 12,
    fontWeight: '500',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 500,
    position: 'relative',
    backgroundColor: '#000',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  skeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    aspectRatio: 9 / 16,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FE2C55',
  },
  playIcon: {
    fontSize: 24,
    color: '#FE2C55',
    marginLeft: 4,
  },
  sideActions: {
    position: 'absolute',
    right: 12,
    bottom: 80,
    gap: 20,
  },
  actionIcon: {
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 8,
  },
  caption: {
    fontSize: 14,
    lineHeight: 18,
  },
  captionUsername: {
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  date: {
    fontSize: 11,
  },
  tapHint: {
    fontSize: 11,
  },
});
