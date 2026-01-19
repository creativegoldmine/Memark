import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface InstagramPreviewCardProps {
  item: any;
  onPress?: () => void;
}

export default function InstagramPreviewCard({ item, onPress }: InstagramPreviewCardProps) {
  const { theme } = useTheme();

  const images = item.embed_metadata?.carousel_images || item.carousel_images || [];
  const primaryImage = (item.og_image && item.og_image !== '0' && item.og_image !== '')
    ? item.og_image
    : (images.length > 0 ? images[0] : null);

  const authorName = item.author_name || item.og_author || 'instagram_user';
  const authorAvatar = (item.author_avatar && item.author_avatar !== '0' && item.author_avatar !== '')
    ? item.author_avatar
    : null;

  const caption = item.og_description || item.preview_desc || '';
  const isReel = item.og_type === 'video' || item.embed_metadata?.video_url || item.video_url;
  const imageCount = images.length;

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const renderImages = () => {
    if (!primaryImage && imageCount === 0) return null;

    if (imageCount === 1 || !images.length) {
      return (
        <View style={styles.singleImageContainer}>
          <Image
            source={{ uri: primaryImage }}
            style={styles.singleImage}
            resizeMode="cover"
          />
          {isReel && (
            <View style={styles.videoOverlay}>
              <View style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </View>
          )}
          {imageCount > 1 && (
            <View style={styles.carouselIndicator}>
              <Text style={styles.carouselText}>1/{imageCount}</Text>
            </View>
          )}
        </View>
      );
    }

    if (imageCount === 2) {
      return (
        <View style={styles.imageGrid}>
          {images.slice(0, 2).map((img: string, idx: number) => (
            <Image
              key={idx}
              source={{ uri: img }}
              style={styles.halfImage}
              resizeMode="cover"
            />
          ))}
        </View>
      );
    }

    if (imageCount === 3) {
      return (
        <View style={styles.imageGrid}>
          <Image
            source={{ uri: images[0] }}
            style={styles.twoThirdsImage}
            resizeMode="cover"
          />
          <View style={styles.thirdColumn}>
            {images.slice(1, 3).map((img: string, idx: number) => (
              <Image
                key={idx}
                source={{ uri: img }}
                style={styles.thirdImage}
                resizeMode="cover"
              />
            ))}
          </View>
        </View>
      );
    }

    if (imageCount >= 4) {
      return (
        <View style={styles.imageGrid}>
          <View style={styles.halfColumn}>
            <Image source={{ uri: images[0] }} style={styles.quarterImage} resizeMode="cover" />
            <Image source={{ uri: images[1] }} style={styles.quarterImage} resizeMode="cover" />
          </View>
          <View style={styles.halfColumn}>
            <Image source={{ uri: images[2] }} style={styles.quarterImage} resizeMode="cover" />
            <View style={styles.quarterImageContainer}>
              <Image source={{ uri: images[3] }} style={styles.quarterImage} resizeMode="cover" />
              {imageCount > 4 && (
                <View style={styles.moreImagesOverlay}>
                  <Text style={styles.moreImagesText}>+{imageCount - 4}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      );
    }

    return null;
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
            <Text style={styles.avatarText}>{authorName[0]?.toUpperCase() || 'I'}</Text>
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text style={[styles.authorName, { color: theme.text }]}>{authorName}</Text>
          <View style={styles.platformBadge}>
            <Text style={[styles.platformText, { color: theme.textSecondary }]}>Instagram</Text>
          </View>
        </View>
      </View>

      {renderImages()}

      <View style={styles.actionsBar}>
        <View style={styles.leftActions}>
          <Heart size={24} color={theme.text} strokeWidth={1.5} />
          <MessageCircle size={24} color={theme.text} strokeWidth={1.5} />
          <Send size={24} color={theme.text} strokeWidth={1.5} />
        </View>
        <Bookmark size={24} color={theme.text} strokeWidth={1.5} />
      </View>

      {caption && (
        <View style={styles.captionContainer}>
          <Text style={[styles.caption, { color: theme.text }]} numberOfLines={3}>
            <Text style={styles.captionUsername}>{authorName}</Text> {caption}
          </Text>
        </View>
      )}

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Text style={[styles.date, { color: theme.textTertiary }]}>
          {new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
        <Text style={[styles.tapHint, { color: theme.textTertiary }]}>Tap to view on Instagram</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  avatar: {
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
    backgroundColor: '#E1306C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformText: {
    fontSize: 11,
    fontWeight: '500',
  },
  singleImageContainer: {
    width: '100%',
    position: 'relative',
  },
  singleImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 24,
    color: '#000',
    marginLeft: 4,
  },
  carouselIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  carouselText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  imageGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: 2,
  },
  halfImage: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
  },
  twoThirdsImage: {
    flex: 2,
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
  },
  thirdColumn: {
    flex: 1,
    gap: 2,
  },
  thirdImage: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  halfColumn: {
    flex: 1,
    gap: 2,
  },
  quarterImage: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
  },
  quarterImageContainer: {
    flex: 1,
    position: 'relative',
  },
  moreImagesOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  leftActions: {
    flexDirection: 'row',
    gap: 16,
  },
  captionContainer: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  caption: {
    fontSize: 14,
    lineHeight: 18,
  },
  captionUsername: {
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  date: {
    fontSize: 11,
  },
  tapHint: {
    fontSize: 11,
  },
});
