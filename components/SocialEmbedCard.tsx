import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { Item } from '@/lib/supabase';
import { ItemCard } from './ItemCard';
import TwitterPreviewCard from './TwitterPreviewCard';
import InstagramPreviewCard from './InstagramPreviewCard';
import FacebookPreviewCard from './FacebookPreviewCard';
import YouTubePreviewCard from './YouTubePreviewCard';
import TikTokPreviewCard from './TikTokPreviewCard';
import VimeoPreviewCard from './VimeoPreviewCard';

interface SocialEmbedCardProps {
  item: Item;
  onPress?: () => void;
  onOpenUrl?: (url: string) => void;
  viewMode?: 'grid' | 'list';
}

export function SocialEmbedCard({ item, onPress, onOpenUrl, viewMode = 'list' }: SocialEmbedCardProps) {
  const { theme } = useTheme();
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [embedError, setEmbedError] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(400);

  const platformType = item.platform_type;
  const embedHtml = item.embed_html;
  const embedMetadata = item.embed_metadata;

  const shouldEmbed = platformType && embedHtml && ['youtube', 'twitter', 'instagram', 'tiktok', 'vimeo', 'facebook'].includes(platformType);

  const hasMetadata = item.og_image || item.og_title || item.og_description;

  const handleDefaultPress = onPress || (() => {
    if (!item.raw_content) return;
    const urlMatch = item.raw_content.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : item.raw_content;
    if (onOpenUrl) {
      onOpenUrl(url);
    }
  });

  if (platformType === 'twitter' && hasMetadata) {
    return <TwitterPreviewCard item={item} onPress={handleDefaultPress} />;
  }

  if (platformType === 'instagram' && hasMetadata) {
    return <InstagramPreviewCard item={item} onPress={handleDefaultPress} />;
  }

  if (platformType === 'facebook' && hasMetadata) {
    return <FacebookPreviewCard item={item} onPress={handleDefaultPress} />;
  }

  if (platformType === 'youtube' && hasMetadata) {
    return <YouTubePreviewCard item={item} onPress={handleDefaultPress} />;
  }

  if (platformType === 'tiktok' && hasMetadata) {
    return <TikTokPreviewCard item={item} onPress={handleDefaultPress} />;
  }

  if (platformType === 'vimeo' && hasMetadata) {
    return <VimeoPreviewCard item={item} onPress={handleDefaultPress} />;
  }

  if (!shouldEmbed || (embedError && !hasMetadata)) {
    return (
      <ItemCard
        item={item}
        onPress={onPress}
        onOpenUrl={onOpenUrl}
        viewMode={viewMode}
      />
    );
  }

  function renderStaticPreview() {
    const isVideo = platformType === 'youtube' || platformType === 'vimeo' || platformType === 'tiktok' || item.og_type === 'video';

    return (
      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity onPress={handleOpenUrl} activeOpacity={0.95} style={{ position: 'relative' }}>
          {item.og_image && (
            <Image
              source={{ uri: item.og_image }}
              style={styles.staticImage}
              resizeMode="cover"
            />
          )}
          {isVideo && (
            <View style={styles.playOverlay}>
              <View style={styles.playButtonStatic}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </View>
          )}
          {item.carousel_images && item.carousel_images.length > 1 && (
            <View style={[styles.mediaCountBadge, { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0, 0, 0, 0.75)' }]}>
              <Text style={styles.mediaCountText}>1/{item.carousel_images.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={[styles.metadata, { backgroundColor: theme.cardBackground }]}>
          {item.author_name && (
            <Text style={[styles.author, { color: theme.textSecondary }]}>
              {item.author_name}
            </Text>
          )}
          <Text style={[styles.title, { color: theme.text }]}>
            {item.og_title || item.preview_title || item.title || 'Untitled'}
          </Text>
          {(item.og_description || item.preview_desc) && (
            <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={3}>
              {item.og_description || item.preview_desc}
            </Text>
          )}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Text style={[styles.platform, { color: theme.primary }]}>
              {getPlatformLabel(platformType)}
            </Text>
            <TouchableOpacity onPress={handleOpenUrl} style={styles.openButton}>
              <ExternalLink size={16} color={theme.primary} />
              <Text style={[styles.openText, { color: theme.primary }]}>Open</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const extractUrl = () => {
    if (!item.raw_content) return null;
    if (item.raw_content.startsWith('http')) {
      return item.raw_content;
    }
    const urlMatch = item.raw_content.match(/https?:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0] : null;
  };

  const url = extractUrl();

  const handleOpenUrl = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (url && onOpenUrl) {
      onOpenUrl(url);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
        {renderWebEmbed()}
        <View style={[styles.metadata, { backgroundColor: theme.cardBackground }]}>
          {item.author_name && (
            <Text style={[styles.author, { color: theme.textSecondary }]}>
              {item.author_name}
            </Text>
          )}
          <Text style={[styles.title, { color: theme.text }]}>
            {item.og_title || item.preview_title || item.title || 'Untitled'}
          </Text>
          {(item.og_description || item.preview_desc) && (
            <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={3}>
              {item.og_description || item.preview_desc}
            </Text>
          )}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            {platformType && (
              <Text style={[styles.platform, { color: theme.primary }]}>
                {getPlatformLabel(platformType)}
              </Text>
            )}
            <Text style={[styles.date, { color: theme.textTertiary }]}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
      <View style={[styles.embedContainer, { minHeight: webViewHeight }]}>
        {renderMobileEmbed()}
      </View>
      <View style={[styles.metadata, { backgroundColor: theme.cardBackground }]}>
        {item.author_name && (
          <Text style={[styles.author, { color: theme.textSecondary }]}>
            {item.author_name}
          </Text>
        )}
        <Text style={[styles.title, { color: theme.text }]}>
          {item.og_title || item.preview_title || item.title || 'Untitled'}
        </Text>
        {(item.og_description || item.preview_desc) && (
          <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.og_description || item.preview_desc}
          </Text>
        )}
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <Text style={[styles.platform, { color: theme.primary }]}>
            {getPlatformLabel(platformType)}
          </Text>
          <TouchableOpacity onPress={handleOpenUrl} style={styles.openButton}>
            <ExternalLink size={16} color={theme.primary} />
            <Text style={[styles.openText, { color: theme.primary }]}>Open</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  function renderWebEmbed() {
    switch (platformType) {
      case 'youtube': {
        const videoIdMatch = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\/]+)/);
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
        const vimeoIdMatch = url?.match(/vimeo\.com\/(\d+)/);
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
          script.charset = 'utf-8';
          document.body.appendChild(script);

          return () => {
            if (document.body.contains(script)) {
              document.body.removeChild(script);
            }
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
            if (document.body.contains(script)) {
              document.body.removeChild(script);
            }
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
            if (document.body.contains(script)) {
              document.body.removeChild(script);
            }
          };
        }, []);

        return (
          <View style={styles.embedContainer}>
            <div dangerouslySetInnerHTML={{ __html: embedHtml }} />
          </View>
        );
      }

      case 'facebook': {
        useEffect(() => {
          const script = document.createElement('script');
          script.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0';
          script.async = true;
          script.defer = true;
          script.crossOrigin = 'anonymous';
          document.body.appendChild(script);

          return () => {
            if (document.body.contains(script)) {
              document.body.removeChild(script);
            }
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
  }

  function renderMobileEmbed() {
    const getEmbedHTML = () => {
      let scriptTag = '';
      let containerStyle = 'width: 100%; display: flex; justify-content: center; align-items: center;';

      switch (platformType) {
        case 'twitter':
          scriptTag = '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>';
          containerStyle += ' min-height: 400px;';
          break;
        case 'instagram':
          scriptTag = '<script async src="https://www.instagram.com/embed.js"></script>';
          containerStyle += ' min-height: 500px;';
          break;
        case 'tiktok':
          scriptTag = '<script async src="https://www.tiktok.com/embed.js"></script>';
          containerStyle += ' min-height: 600px;';
          break;
        case 'facebook':
          scriptTag = '<script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0"></script>';
          containerStyle += ' min-height: 400px;';
          break;
        default:
          break;
      }

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background: transparent;
              overflow-x: hidden;
            }
            .embed-container {
              ${containerStyle}
              padding: 16px;
            }
            iframe {
              max-width: 100% !important;
              border: none !important;
            }
          </style>
        </head>
        <body>
          <div class="embed-container">
            ${embedHtml}
          </div>
          ${scriptTag}
          <script>
            window.addEventListener('load', function() {
              setTimeout(function() {
                const height = document.body.scrollHeight;
                window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'height', value: height }));
              }, 1000);
            });
          </script>
        </body>
        </html>
      `;
    };

    if (platformType === 'youtube') {
      const videoIdMatch = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\/]+)/);
      if (!videoIdMatch) return null;
      const videoId = videoIdMatch[1];

      const youtubeHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; }
            body { background: #000; }
            .video-container {
              position: relative;
              width: 100%;
              padding-bottom: 56.25%;
            }
            iframe {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              border: none;
            }
          </style>
        </head>
        <body>
          <div class="video-container">
            <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
            </iframe>
          </div>
        </body>
        </html>
      `;

      return (
        <WebView
          source={{ html: youtubeHTML }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
          onError={() => setEmbedError(true)}
        />
      );
    }

    if (platformType === 'vimeo') {
      const vimeoIdMatch = url?.match(/vimeo\.com\/(\d+)/);
      if (!vimeoIdMatch) return null;
      const vimeoId = vimeoIdMatch[1];

      const vimeoHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; }
            body { background: #000; }
            .video-container {
              position: relative;
              width: 100%;
              padding-bottom: 56.25%;
            }
            iframe {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              border: none;
            }
          </style>
        </head>
        <body>
          <div class="video-container">
            <iframe src="https://player.vimeo.com/video/${vimeoId}"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowfullscreen>
            </iframe>
          </div>
        </body>
        </html>
      `;

      return (
        <WebView
          source={{ html: vimeoHTML }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
          onError={() => setEmbedError(true)}
        />
      );
    }

    return (
      <WebView
        source={{ html: getEmbedHTML() }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'height' && data.value) {
              setWebViewHeight(Math.min(data.value + 40, 800));
            }
          } catch (e) {
            console.log('WebView message parse error:', e);
          }
        }}
        onError={() => setEmbedError(true)}
      />
    );
  }

  function getPlatformLabel(platform: string): string {
    const labels: Record<string, string> = {
      youtube: 'YouTube',
      twitter: 'X / Twitter',
      instagram: 'Instagram',
      tiktok: 'TikTok',
      vimeo: 'Vimeo',
      facebook: 'Facebook',
    };
    return labels[platform] || platform;
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
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
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  metadata: {
    padding: 16,
  },
  author: {
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  platform: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  date: {
    fontSize: 12,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openText: {
    fontSize: 12,
    fontWeight: '600',
  },
  staticImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  mediaCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mediaCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonStatic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  playIcon: {
    fontSize: 32,
    color: '#8B5CF6',
    marginLeft: 4,
  },
});
