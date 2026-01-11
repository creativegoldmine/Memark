import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Share2, ExternalLink, Maximize2, Star, Eye } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { Item, supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function ItemDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [webViewLoading, setWebViewLoading] = useState(false);
  const [readerMode, setReaderMode] = useState(false);
  const [error, setError] = useState('');

  const itemId = params.id as string;

  useEffect(() => {
    loadItem();
  }, [itemId]);

  const loadItem = async () => {
    if (!itemId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) {
        setError('Item not found');
        return;
      }

      setItem(data);
      await updateViewCount(itemId);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      setError('Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  const updateViewCount = async (id: string) => {
    await supabase
      .from('items')
      .update({
        last_viewed_at: new Date().toISOString(),
        view_count: supabase.raw('view_count + 1')
      })
      .eq('id', id);
  };

  const handleShare = async () => {
    if (!item) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const shareText = `${item.title || 'Untitled'}\n\n${item.summary || ''}\n\n${item.raw_content}\n\nTags: ${item.tags.join(', ')}`;

    try {
      await Share.share({
        message: shareText,
        title: item.title || 'Share Item',
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const toggleReaderMode = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setReaderMode(!readerMode);
  };

  const readerModeJS = `
    (function() {
      const style = document.createElement('style');
      style.innerHTML = \`
        body {
          max-width: 800px !important;
          margin: 0 auto !important;
          padding: 20px !important;
          font-size: 18px !important;
          line-height: 1.8 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif !important;
          background: white !important;
          color: #1a1a1a !important;
        }
        img { max-width: 100% !important; height: auto !important; }
        video { max-width: 100% !important; }
        aside, .ad, .advertisement, .sidebar, .related, .comments, nav, header, footer { display: none !important; }
        article, main, .content, .post { max-width: 100% !important; }
      \`;
      document.head.appendChild(style);
    })();
    true;
  `;

  const renderContent = () => {
    if (!item) return null;

    const isLink = item.type === 'article' || item.raw_content.startsWith('http');
    const isVideo = item.type === 'video';
    const isNote = item.type === 'note' || item.type === 'text';

    if (isLink) {
      return (
        <View style={styles.webViewContainer}>
          {webViewLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading...</Text>
            </View>
          )}
          <WebView
            source={{ uri: item.raw_content }}
            style={styles.webView}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => {
              setWebViewLoading(false);
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            }}
            onError={() => {
              setWebViewLoading(false);
              setError('Failed to load page');
            }}
            injectedJavaScript={readerMode ? readerModeJS : undefined}
            startInLoadingState={true}
            allowsBackForwardNavigationGestures
            sharedCookiesEnabled
          />
          <View style={[styles.webViewControls, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.controlButton, readerMode && { backgroundColor: theme.primary + '20' }]}
              onPress={toggleReaderMode}
            >
              <Eye size={20} color={readerMode ? theme.primary : theme.textSecondary} />
              <Text style={[styles.controlText, { color: readerMode ? theme.primary : theme.textSecondary }]}>
                Reader
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (isNote) {
      return (
        <ScrollView style={styles.noteContainer} showsVerticalScrollIndicator={false}>
          {item.image_preview && (
            <View style={styles.noteImageContainer}>
              <img
                src={item.image_preview}
                style={{ width: '100%', height: 'auto', borderRadius: 12 }}
                alt="Preview"
              />
            </View>
          )}
          <Text style={[styles.noteContent, { color: theme.text }]}>
            {item.raw_content}
          </Text>
          {item.summary && (
            <View style={[styles.summaryBox, { backgroundColor: theme.surface }]}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Summary</Text>
              <Text style={[styles.summaryText, { color: theme.text }]}>
                {item.summary}
              </Text>
            </View>
          )}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <Text style={[styles.tagsLabel, { color: theme.textSecondary }]}>Tags</Text>
              <View style={styles.tagsList}>
                {item.tags.map((tag, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
                    <Text style={[styles.tagText, { color: theme.primary }]}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      );
    }

    return (
      <View style={[styles.fallbackContainer, { backgroundColor: theme.surface }]}>
        <Text style={[styles.fallbackText, { color: theme.textSecondary }]}>
          Content type not yet supported: {item.type}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>{error || 'Item not found'}</Text>
          <TouchableOpacity style={[styles.errorButton, { backgroundColor: theme.primary }]} onPress={handleBack}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[theme.cardBackground, theme.background]}
        style={[styles.header, { borderBottomColor: theme.border }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            {item.score && (
              <View style={[styles.scoreChip, { backgroundColor: theme.surface }]}>
                <Star size={14} color={theme.warning} fill={theme.warning} />
                <Text style={[styles.scoreText, { color: theme.text }]}>
                  {Math.round(item.score)}%
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
              <Share2 size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>
        {item.title && (
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.headerMeta}>
              <View style={[styles.typeChip, { backgroundColor: theme.primary + '15' }]}>
                <Text style={[styles.typeText, { color: theme.primary }]}>
                  {item.type}
                </Text>
              </View>
              {item.category && (
                <View style={[styles.categoryChip, { backgroundColor: theme.accent + '15' }]}>
                  <Text style={[styles.categoryText, { color: theme.accent }]}>
                    {item.category}
                  </Text>
                </View>
              )}
              {item.view_count && item.view_count > 0 && (
                <View style={styles.viewCount}>
                  <Eye size={12} color={theme.textTertiary} />
                  <Text style={[styles.viewCountText, { color: theme.textTertiary }]}>
                    {item.view_count}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </LinearGradient>

      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerContent: {
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  viewCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCountText: {
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  webViewControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  controlText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noteContainer: {
    flex: 1,
    padding: 20,
  },
  noteImageContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  noteContent: {
    fontSize: 17,
    lineHeight: 28,
    marginBottom: 24,
  },
  summaryBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
  },
  tagsContainer: {
    marginBottom: 24,
  },
  tagsLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 1,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    margin: 20,
    borderRadius: 12,
  },
  fallbackText: {
    fontSize: 15,
    textAlign: 'center',
  },
});
