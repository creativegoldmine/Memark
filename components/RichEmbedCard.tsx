import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Item } from '@/lib/supabase';
import { ItemCard } from './ItemCard';

interface RichEmbedCardProps {
  item: Item;
  onPress?: () => void;
  onOpenUrl?: (url: string) => void;
  viewMode?: 'grid' | 'list';
}

export function RichEmbedCard({ item, onPress, onOpenUrl, viewMode = 'list' }: RichEmbedCardProps) {
  const { theme } = useTheme();
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [embedError, setEmbedError] = useState(false);

  const platformType = (item as any).platform_type;
  const embedHtml = (item as any).embed_html;

  if (Platform.OS !== 'web') {
    return (
      <ItemCard
        item={item}
        onPress={onPress}
        onOpenUrl={onOpenUrl}
        viewMode={viewMode}
      />
    );
  }

  const shouldEmbed = platformType && embedHtml && ['youtube', 'twitter', 'instagram', 'tiktok', 'vimeo'].includes(platformType);

  if (!shouldEmbed || embedError) {
    return (
      <ItemCard
        item={item}
        onPress={onPress}
        onOpenUrl={onOpenUrl}
        viewMode={viewMode}
      />
    );
  }

  const renderEmbed = () => {
    const extractUrl = () => {
      if (!item.raw_content) return null;
      if (item.raw_content.startsWith('http')) {
        return item.raw_content;
      }
      const urlMatch = item.raw_content.match(/https?:\/\/[^\s]+/);
      return urlMatch ? urlMatch[0] : null;
    };

    const url = extractUrl();
    if (!url) return null;

    switch (platformType) {
      case 'youtube': {
        const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\/]+)/);
        if (!videoIdMatch) return null;
        const videoId = videoIdMatch[1];

        return (
          <View style={styles.embedContainer}>
            <iframe
              width="100%"
              height="400"
              src={`https://www.youtube.com/embed/${videoId}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                borderRadius: '12px 12px 0 0',
                border: 'none',
              }}
              onLoad={() => setEmbedLoaded(true)}
              onError={() => setEmbedError(true)}
            />
          </View>
        );
      }

      case 'vimeo': {
        const vimeoIdMatch = url.match(/vimeo\.com\/(\d+)/);
        if (!vimeoIdMatch) return null;
        const vimeoId = vimeoIdMatch[1];

        return (
          <View style={styles.embedContainer}>
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}`}
              width="100%"
              height="400"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              style={{
                borderRadius: '12px 12px 0 0',
                border: 'none',
              }}
              onLoad={() => setEmbedLoaded(true)}
              onError={() => setEmbedError(true)}
            />
          </View>
        );
      }

      case 'twitter': {
        useEffect(() => {
          const script = document.createElement('script');
          script.src = 'https://platform.twitter.com/widgets.js';
          script.async = true;
          document.body.appendChild(script);

          return () => {
            document.body.removeChild(script);
          };
        }, []);

        return (
          <View style={styles.embedContainer}>
            <div dangerouslySetInnerHTML={{ __html: embedHtml }} />
          </View>
        );
      }

      case 'instagram': {
        useEffect(() => {
          const script = document.createElement('script');
          script.src = 'https://www.instagram.com/embed.js';
          script.async = true;
          document.body.appendChild(script);

          script.onload = () => {
            if ((window as any).instgrm) {
              (window as any).instgrm.Embeds.process();
            }
          };

          return () => {
            document.body.removeChild(script);
          };
        }, []);

        return (
          <View style={styles.embedContainer}>
            <div dangerouslySetInnerHTML={{ __html: embedHtml }} />
          </View>
        );
      }

      case 'tiktok': {
        useEffect(() => {
          const script = document.createElement('script');
          script.src = 'https://www.tiktok.com/embed.js';
          script.async = true;
          document.body.appendChild(script);

          return () => {
            document.body.removeChild(script);
          };
        }, []);

        return (
          <View style={styles.embedContainer}>
            <div dangerouslySetInnerHTML={{ __html: embedHtml }} />
          </View>
        );
      }

      default:
        return null;
    }
  };

  const styles = StyleSheet.create({
    card: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardBackground,
      overflow: 'hidden',
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    embedContainer: {
      width: '100%',
      minHeight: 400,
      backgroundColor: theme.surface,
    },
    metadata: {
      padding: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
      lineHeight: 24,
    },
    author: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    description: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    platform: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
      textTransform: 'uppercase',
    },
    date: {
      fontSize: 12,
      color: theme.textTertiary,
    },
  });

  return (
    <View style={styles.card}>
      {renderEmbed()}
      <View style={styles.metadata}>
        {(item as any).author_name && (
          <Text style={styles.author}>{(item as any).author_name}</Text>
        )}
        <Text style={styles.title}>
          {item.og_title || item.preview_title || item.title || 'Untitled'}
        </Text>
        {(item.og_description || item.preview_desc) && (
          <Text style={styles.description} numberOfLines={3}>
            {item.og_description || item.preview_desc}
          </Text>
        )}
        <View style={styles.footer}>
          {platformType && (
            <Text style={styles.platform}>
              {platformType === 'youtube' ? 'YouTube' :
               platformType === 'twitter' ? 'X / Twitter' :
               platformType === 'instagram' ? 'Instagram' :
               platformType === 'tiktok' ? 'TikTok' :
               platformType === 'vimeo' ? 'Vimeo' :
               platformType}
            </Text>
          )}
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </View>
  );
}
