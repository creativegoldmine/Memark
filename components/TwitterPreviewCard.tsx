import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { MessageCircle, Repeat2, Heart, Share } from 'lucide-react-native';

interface TwitterPreviewCardProps {
  item: any;
  onPress?: () => void;
}

export default function TwitterPreviewCard({ item, onPress }: TwitterPreviewCardProps) {
  const { theme } = useTheme();

  const images = item.embed_metadata?.additional_images || [];
  const primaryImage = (item.og_image && item.og_image !== '0' && item.og_image !== '') ? item.og_image : (images.length > 0 ? images[0] : null);
  const authorName = item.author_name || item.og_author || 'Unknown';
  const authorAvatar = (item.author_avatar && item.author_avatar !== '0' && item.author_avatar !== '') ? item.author_avatar : null;
  const tweetText = item.og_description || item.preview_desc || '';
  const hasVideo = item.og_type === 'video' || item.embed_metadata?.video_url;

  const imageCount = images.length;

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
          {hasVideo && (
            <View style={styles.videoOverlay}>
              <View style={[styles.playButton, { backgroundColor: theme.primary }]}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
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
      onPress={onPress}
    >
      <View style={styles.header}>
        {authorAvatar ? (
          <Image source={{ uri: authorAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{authorName[0]?.toUpperCase() || 'X'}</Text>
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text style={[styles.authorName, { color: theme.text }]}>{authorName}</Text>
          <View style={styles.platformBadge}>
            <Text style={[styles.platformText, { color: theme.textSecondary }]}>X (Twitter)</Text>
          </View>
        </View>
      </View>

      {tweetText && (
        <Text style={[styles.tweetText, { color: theme.text }]} numberOfLines={10}>
          {tweetText}
        </Text>
      )}

      {renderImages()}

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Text style={[styles.date, { color: theme.textTertiary }]}>
          {new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
        <Text style={[styles.tapHint, { color: theme.textTertiary }]}>Tap to view on X</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
    fontSize: 13,
  },
  tweetText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
  },
  singleImageContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  singleImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: 'white',
    fontSize: 24,
    marginLeft: 4,
  },
  imageGrid: {
    flexDirection: 'row',
    gap: 2,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  halfImage: {
    flex: 1,
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  twoThirdsImage: {
    flex: 2,
    height: 250,
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
    width: '100%',
    height: 125,
    backgroundColor: '#f0f0f0',
  },
  quarterImageContainer: {
    position: 'relative',
  },
  moreImagesOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  date: {
    fontSize: 13,
  },
  tapHint: {
    fontSize: 12,
  },
});
