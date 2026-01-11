import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, ActivityIndicator, Share as RNShare } from 'react-native';
import { X, ArrowLeft, ArrowRight, RefreshCw, Share2, BookOpen, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';
import { useTheme } from '@/contexts/ThemeContext';

interface InAppBrowserProps {
  url: string;
  visible: boolean;
  onClose: () => void;
}

export function InAppBrowser({ url, visible, onClose }: InAppBrowserProps) {
  const { theme } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readerMode, setReaderMode] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  const handleGoBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    webViewRef.current?.goBack();
  };

  const handleGoForward = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    webViewRef.current?.goForward();
  };

  const handleRefresh = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    webViewRef.current?.reload();
  };

  const handleShare = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await RNShare.share({
        message: currentUrl,
        url: currentUrl,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const toggleReaderMode = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setReaderMode(!readerMode);

    if (!readerMode) {
      const readerScript = `
        (function() {
          const elementsToRemove = ['nav', 'header', 'footer', 'aside', 'iframe', '.ad', '.ads', '.advertisement', '.social-share', '.comments'];
          elementsToRemove.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => el.remove());
          });

          document.body.style.padding = '20px';
          document.body.style.maxWidth = '700px';
          document.body.style.margin = '0 auto';
          document.body.style.fontSize = '18px';
          document.body.style.lineHeight = '1.6';
          document.body.style.backgroundColor = '#ffffff';
          document.body.style.color = '#1a1a1a';
        })();
      `;
      webViewRef.current?.injectJavaScript(readerScript);
    } else {
      webViewRef.current?.reload();
    }
  };

  const handleOpenExternal = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await Linking.openURL(currentUrl);
    handleClose();
  };

  if (Platform.OS === 'web') {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.webModalOverlay}>
          <View style={[styles.webModalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.browserHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
              <View style={styles.headerControls}>
                <TouchableOpacity style={styles.controlButton} onPress={handleRefresh}>
                  <RefreshCw size={20} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={handleShare}>
                  <Share2 size={20} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={handleOpenExternal}>
                  <ExternalLink size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.webIframeContainer}>
              <iframe
                src={url}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title="Web Content"
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
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.browserHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={styles.headerControls}>
            <TouchableOpacity
              style={[styles.controlButton, !canGoBack && styles.controlButtonDisabled]}
              onPress={handleGoBack}
              disabled={!canGoBack}
            >
              <ArrowLeft size={20} color={canGoBack ? theme.text : theme.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, !canGoForward && styles.controlButtonDisabled]}
              onPress={handleGoForward}
              disabled={!canGoForward}
            >
              <ArrowRight size={20} color={canGoForward ? theme.text : theme.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleRefresh}>
              <RefreshCw size={20} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, readerMode && { backgroundColor: theme.primary + '20' }]}
              onPress={toggleReaderMode}
            >
              <BookOpen size={20} color={readerMode ? theme.primary : theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleShare}>
              <Share2 size={20} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleOpenExternal}>
              <ExternalLink size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => {
            setLoading(false);
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
            setCanGoForward(navState.canGoForward);
            setCurrentUrl(navState.url);
          }}
          onError={() => {
            setLoading(false);
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          }}
          allowsBackForwardNavigationGestures
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  browserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  controlButton: {
    padding: 8,
    borderRadius: 8,
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  closeButton: {
    padding: 8,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
    zIndex: 1000,
  },
  webModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webModalContent: {
    width: '90%',
    height: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    }),
  },
  webIframeContainer: {
    flex: 1,
  },
});
