import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThumbsUp, MessageCircle, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface FacebookPreviewCardProps {
  item: any;
  onPress?: () => void;
}

export default function FacebookPreviewCard({ item, onPress }: FacebookPreviewCardProps) {
  const { theme } = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const primaryImage = (item.og_image && item.og_image !== '0' && item.og_image !== '')
    ? item.og_image
    : null;

  const authorName = item.author_name || item.og_author || 'Facebook User';
  const authorAvatar = (item.author_avatar && item.author_avatar !== '0' && item.author_avatar !== '')
    ? item.author_avatar
    : null;

  const postText = item.og_description || item.preview_desc || '';
  const title = item.og_title || item.preview_title || '';
  const isVideo = item.og_type === 'video' || item.embed_metadata?.video_url || item.video_url;

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

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={handlePress}
    >
      <View style={styles.header}>
        {authorAvatar ? (
          <Image source={{ uri: authorAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: '#1877F2' }]}>
            <Text style={styles.avatarText}>{authorName[0]?.toUpperCase() || 'F'}</Text>
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text style={[styles.authorName, { color: theme.text }]}>{authorName}</Text>
          <View style={styles.platformBadge}>
            <Text style={[styles.platformText, { color: theme.textSecondary }]}>Facebook</Text>
          </View>
        </View>
      </View>

      {postText && (
        <View style={styles.postTextContainer}>
          <Text style={[styles.postText, { color: theme.text }]} numberOfLines={8}>
            {postText}
          </Text>
        </View>
      )}

      {primaryImage && (
        <View style={styles.mediaContainer}>
          {!imageLoaded && (
            <View style={[styles.skeleton, { backgroundColor: theme.border }]} />
          )}
          <Animated.Image
            source={{ uri: primaryImage }}
            style={[styles.mediaImage, { opacity: fadeAnim }]}
            resizeMode="cover"
            onLoad={handleImageLoad}
          />
          {isVideo && (
            <View style={styles.videoOverlay}>
              <View style={[styles.playButton, { backgroundColor: 'rgba(24, 119, 242, 0.9)' }]}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {title && title !== postText && (
        <View style={[styles.linkPreview, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
          <Text style={[styles.linkTitle, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>
        </View>
      )}

      <View style={[styles.actionsBar, { borderTopColor: theme.border }]}>
        <View style={styles.action}>
          <ThumbsUp size={18} color={theme.textSecondary} strokeWidth={1.5} />
          <Text style={[styles.actionText, { color: theme.textSecondary }]}>Like</Text>
        </View>
        <View style={styles.action}>
          <MessageCircle size={18} color={theme.textSecondary} strokeWidth={1.5} />
          <Text style={[styles.actionText, { color: theme.textSecondary }]}>Comment</Text>
        </View>
        <View style={styles.action}>
          <Share2 size={18} color={theme.textSecondary} strokeWidth={1.5} />
          <Text style={[styles.actionText, { color: theme.textSecondary }]}>Share</Text>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Text style={[styles.date, { color: theme.textTertiary }]}>
          {new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
        <Text style={[styles.tapHint, { color: theme.textTertiary }]}>Tap to view on Facebook</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
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
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformText: {
    fontSize: 12,
    fontWeight: '400',
  },
  postTextContainer: {
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  postText: {
    fontSize: 15,
    lineHeight: 20,
  },
  mediaContainer: {
    width: '100%',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    aspectRatio: 1.33,
    backgroundColor: '#f0f0f0',
  },
  skeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    aspectRatio: 1.33,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 24,
    color: 'white',
    marginLeft: 4,
  },
  linkPreview: {
    padding: 12,
    borderTopWidth: 1,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
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
