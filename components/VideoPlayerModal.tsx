import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';

interface VideoPlayerModalProps {
  visible: boolean;
  videoUrl: string;
  platformType?: string;
  title?: string;
  onClose: () => void;
}

export function VideoPlayerModal({ visible, videoUrl, platformType, title, onClose }: VideoPlayerModalProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  const getEmbedHtml = () => {
    let embedCode = '';

    if (platformType === 'youtube') {
      const videoIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\/]+)/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        embedCode = `
          <iframe
            src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
          </iframe>
        `;
      }
    } else if (platformType === 'vimeo') {
      const vimeoIdMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
      if (vimeoIdMatch) {
        const vimeoId = vimeoIdMatch[1];
        embedCode = `
          <iframe
            src="https://player.vimeo.com/video/${vimeoId}?autoplay=1"
            frameborder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowfullscreen
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
          </iframe>
        `;
      }
    } else if (platformType === 'tiktok') {
      embedCode = `
        <blockquote class="tiktok-embed" cite="${videoUrl}" data-video-id="${videoUrl.split('/').pop()}" style="max-width: 605px;min-width: 325px;">
          <section></section>
        </blockquote>
        <script async src="https://www.tiktok.com/embed.js"></script>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
          .video-container {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .video-wrapper {
            position: relative;
            width: 100%;
            padding-bottom: 56.25%;
            max-width: 100%;
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
          <div class="video-wrapper">
            ${embedCode}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  if (Platform.OS === 'web') {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.webModalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                {title || 'Video'}
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.videoContainer}>
              <div
                dangerouslySetInnerHTML={{ __html: getEmbedHtml() }}
                style={{ width: '100%', height: '100%' }}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <View style={[styles.header, { backgroundColor: 'rgba(0,0,0,0.9)', borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.title, { color: '#FFF' }]} numberOfLines={1}>
            {title || 'Video'}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <WebView
          source={{ html: getEmbedHtml() }}
          style={styles.webview}
          allowsFullscreenVideo={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => {
            setLoading(false);
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }}
          onError={() => {
            setLoading(false);
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webModalContent: {
    width: '90%',
    maxWidth: 1200,
    height: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.5,
      shadowRadius: 30,
      elevation: 20,
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 8,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});
