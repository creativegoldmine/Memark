import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Share, Switch, Modal, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, Share2, ExternalLink, RefreshCw, Star, Eye, Globe, Lock, Crown, BookOpen, X, Link2 } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Item, supabase, supabaseUrl, Profile } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { FeedbackButton } from '@/components/FeedbackButton';

export default function ItemDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { user, dbUser } = useAuth();
  const webViewRef = useRef<WebView>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [webViewLoading, setWebViewLoading] = useState(false);
  const [readerMode, setReaderMode] = useState(false);
  const [error, setError] = useState('');
  const [showPublicToggle, setShowPublicToggle] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [relatedItems, setRelatedItems] = useState<Item[]>([]);

  const itemId = params.id as string;
  const isPro = dbUser?.plan_type === 'pro' || dbUser?.plan_type === 'premium';

  useEffect(() => {
    loadItem();
    loadUserProfile();
  }, [itemId, user?.id]);

  useEffect(() => {
    if (item && user?.id) {
      loadRelatedItems(item);
    }
  }, [item?.id, user?.id]);

  const loadUserProfile = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const loadRelatedItems = async (currentItem: Item) => {
    if (!user?.id) return;
    try {
      const tags = currentItem.tags || [];
      const category = currentItem.category;
      const topics = (currentItem as any).content_topics || [];

      const { data } = await supabase
        .from('items')
        .select('id, title, og_title, summary, category, tags, platform_type, og_image, raw_content, created_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .neq('id', currentItem.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!data || data.length === 0) return;

      const scored = data.map((candidate: any) => {
        let score = 0;
        if (category && candidate.category === category) score += 30;
        const candidateTags: string[] = candidate.tags || [];
        const sharedTags = tags.filter((t: string) => candidateTags.includes(t));
        score += sharedTags.length * 15;
        const candidateTopics: string[] = candidate.content_topics || [];
        const sharedTopics = topics.filter((t: string) => candidateTopics.includes(t));
        score += sharedTopics.length * 20;
        return { ...candidate, _score: score };
      });

      const related = scored
        .filter((i: any) => i._score > 0)
        .sort((a: any, b: any) => b._score - a._score)
        .slice(0, 3);

      setRelatedItems(related as Item[]);
    } catch (err) {
      console.error('Error loading related items:', err);
    }
  };

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
    try {
      const { data: currentItem, error: fetchError } = await supabase
        .from('items')
        .select('view_count')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching view count:', fetchError);
        return;
      }

      const { error: updateError } = await supabase
        .from('items')
        .update({
          last_viewed_at: new Date().toISOString(),
          view_count: (currentItem?.view_count || 0) + 1
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating view count:', updateError);
      }
    } catch (err) {
      console.error('Fatal error updating view count:', err);
    }
  };

  const handleShare = async () => {
    if (!item) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      // Set item to public if not already
      if (!item.is_public) {
        const { error: updateError } = await supabase
          .from('items')
          .update({ is_public: true })
          .eq('id', item.id);

        if (updateError) throw updateError;
        setItem({ ...item, is_public: true });
      }

      // Increment shares count
      await supabase.rpc('increment_shares_count', { item_id: item.id });

      // Create public post URL
      const publicPostUrl = `https://memark.app/post/${item.id}`;

      // Share the public URL
      await Share.share({
        message: `${item.title || 'Check this out'}\n\n${publicPostUrl}`,
        url: publicPostUrl,
        title: item.title || 'Share from Memark',
      });

      // Update local state with new shares count
      const { data: updatedItem } = await supabase
        .from('items')
        .select('shares_count')
        .eq('id', item.id)
        .maybeSingle();

      if (updatedItem) {
        setItem({ ...item, shares_count: updatedItem.shares_count, is_public: true });
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Share error:', err);
      Alert.alert('Error', 'Failed to share item');
    }
  };

  const togglePublicStatus = async () => {
    if (!item) return;

    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const newPublicStatus = !item.is_public;

    try {
      const { error } = await supabase
        .from('items')
        .update({ is_public: newPublicStatus })
        .eq('id', item.id);

      if (error) throw error;

      setItem({ ...item, is_public: newPublicStatus });

      if (newPublicStatus && profile?.is_public) {
        const publicUrl = `${supabaseUrl}/profile/${profile.username}`;
        Alert.alert(
          'Item is now public!',
          `This item is now visible on your public profile at:\n\n${publicUrl}`,
          [{ text: 'OK' }]
        );
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          newPublicStatus
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning
        );
      }
    } catch (err) {
      console.error('Error toggling public status:', err);
      Alert.alert('Error', 'Failed to update public status');
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
    if (!readerMode && webViewRef.current) {
      webViewRef.current.injectJavaScript(readerModeJS);
    } else if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleWebViewGoBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    webViewRef.current?.goBack();
  };

  const handleWebViewGoForward = () => {
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

  const handleOpenExternal = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const url = currentUrl || item?.raw_content;
    if (url) {
      await Linking.openURL(url);
    }
  };

  const handleShareUrl = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await Share.share({
        message: currentUrl || item?.raw_content || '',
        url: currentUrl || item?.raw_content || '',
      });
    } catch (err) {
      console.error('Share error:', err);
    }
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

    const isLink = item.type === 'article' || (item.raw_content && item.raw_content.startsWith('http'));
    const isVideo = item.type === 'video';
    const isNote = item.type === 'note' || item.type === 'text';

    if (isLink) {
      if (Platform.OS === 'web') {
        return (
          <View style={styles.webViewContainer}>
            <View style={[styles.browserToolbar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
              <View style={styles.toolbarLeft}>
                <TouchableOpacity style={styles.toolbarButton} onPress={handleRefresh}>
                  <RefreshCw size={18} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolbarButton} onPress={handleShareUrl}>
                  <Share2 size={18} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolbarButton} onPress={handleOpenExternal}>
                  <ExternalLink size={18} color={theme.text} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.urlDisplay, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.raw_content}
              </Text>
            </View>
            <View style={styles.iframeContainer}>
              <iframe
                src={item.raw_content}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title="Content"
              />
            </View>
          </View>
        );
      }

      return (
        <View style={styles.webViewContainer}>
          {webViewLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading...</Text>
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ uri: item.raw_content }}
            style={styles.webView}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => {
              setWebViewLoading(false);
              setCurrentUrl(item.raw_content);
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            }}
            onError={() => {
              setWebViewLoading(false);
              setError('Failed to load page');
            }}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
              setCanGoForward(navState.canGoForward);
              setCurrentUrl(navState.url);
            }}
            injectedJavaScript={readerMode ? readerModeJS : undefined}
            startInLoadingState={true}
            allowsBackForwardNavigationGestures
            sharedCookiesEnabled
            javaScriptEnabled
            domStorageEnabled
          />
          <View style={[styles.webViewControls, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.controlButton, !canGoBack && styles.controlButtonDisabled]}
              onPress={handleWebViewGoBack}
              disabled={!canGoBack}
            >
              <ArrowLeft size={18} color={canGoBack ? theme.text : theme.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, !canGoForward && styles.controlButtonDisabled]}
              onPress={handleWebViewGoForward}
              disabled={!canGoForward}
            >
              <ArrowRight size={18} color={canGoForward ? theme.text : theme.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleRefresh}>
              <RefreshCw size={18} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, readerMode && { backgroundColor: theme.primary + '20' }]}
              onPress={toggleReaderMode}
            >
              <BookOpen size={18} color={readerMode ? theme.primary : theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleShareUrl}>
              <Share2 size={18} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleOpenExternal}>
              <ExternalLink size={18} color={theme.text} />
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
            <TouchableOpacity style={styles.headerButton} onPress={() => setShowPublicToggle(!showPublicToggle)}>
              {item.is_public ? (
                <Globe size={20} color={theme.primary} />
              ) : (
                <Lock size={20} color={theme.textSecondary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
              <Share2 size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>
        {showPublicToggle && (
          <View style={[styles.publicToggleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.publicToggleHeader}>
              {item.is_public ? (
                <Globe size={20} color={theme.primary} />
              ) : (
                <Lock size={20} color={theme.textSecondary} />
              )}
              <View style={styles.publicToggleText}>
                <Text style={[styles.publicToggleTitle, { color: theme.text }]}>
                  {item.is_public ? 'Public' : 'Private'}
                </Text>
                <Text style={[styles.publicToggleDesc, { color: theme.textSecondary }]}>
                  {item.is_public
                    ? 'Visible on your public profile'
                    : 'Only visible to you'}
                </Text>
              </View>
              {!isPro && (
                <View style={[styles.proChip, { backgroundColor: theme.warning + '15' }]}>
                  <Crown size={12} color={theme.warning} />
                  <Text style={[styles.proText, { color: theme.warning }]}>PRO</Text>
                </View>
              )}
            </View>
            <Switch
              value={item.is_public || false}
              onValueChange={togglePublicStatus}
              trackColor={{ false: theme.border, true: theme.primary + '40' }}
              thumbColor={item.is_public ? theme.primary : theme.textTertiary}
            />
          </View>
        )}
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
              {item.shares_count && item.shares_count > 0 && (
                <View style={styles.viewCount}>
                  <Share2 size={12} color={theme.textTertiary} />
                  <Text style={[styles.viewCountText, { color: theme.textTertiary }]}>
                    {item.shares_count}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.feedbackContainer}>
              <FeedbackButton itemId={item.id} context="categorization" />
            </View>
          </View>
        )}
      </LinearGradient>

      <View style={styles.content}>
        {renderContent()}
        {relatedItems.length > 0 && (
          <View style={[styles.relatedSection, { borderTopColor: theme.border }]}>
            <Text style={[styles.relatedTitle, { color: theme.textSecondary }]}>Also in your library</Text>
            {relatedItems.map((related) => (
              <TouchableOpacity
                key={related.id}
                style={[styles.relatedItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => router.push({ pathname: '/item-detail', params: { id: related.id } })}
              >
                <View style={styles.relatedItemContent}>
                  <Text style={[styles.relatedItemTitle, { color: theme.text }]} numberOfLines={2}>
                    {related.og_title || related.title || related.raw_content?.substring(0, 80)}
                  </Text>
                  {related.category && (
                    <Text style={[styles.relatedItemCategory, { color: theme.primary }]}>{related.category}</Text>
                  )}
                </View>
                <ArrowRight size={16} color={theme.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <Modal visible={showUpgradeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.upgradeModal, { backgroundColor: theme.cardBackground }]}>
            <LinearGradient
              colors={[theme.primary + '15', 'transparent']}
              style={styles.upgradeGradient}
            />
            <View style={styles.upgradeContent}>
              <View style={[styles.crownCircle, { backgroundColor: theme.warning + '15' }]}>
                <Crown size={48} color={theme.warning} />
              </View>
              <Text style={[styles.upgradeTitle, { color: theme.text }]}>
                Upgrade to Pro
              </Text>
              <Text style={[styles.upgradeText, { color: theme.textSecondary }]}>
                Create a public profile and share your best marks with the world. Pro users get:
              </Text>
              <View style={styles.upgradeFeatures}>
                <View style={styles.upgradeFeature}>
                  <Globe size={20} color={theme.primary} />
                  <Text style={[styles.upgradeFeatureText, { color: theme.text }]}>
                    Public Linktree-style profile
                  </Text>
                </View>
                <View style={styles.upgradeFeature}>
                  <Share2 size={20} color={theme.primary} />
                  <Text style={[styles.upgradeFeatureText, { color: theme.text }]}>
                    Share items publicly
                  </Text>
                </View>
                <View style={styles.upgradeFeature}>
                  <Star size={20} color={theme.primary} />
                  <Text style={[styles.upgradeFeatureText, { color: theme.text }]}>
                    Earn rewards from referrals
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.upgradeButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setShowUpgradeModal(false);
                  router.push('/profile');
                }}
              >
                <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowUpgradeModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                  Maybe Later
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  feedbackContainer: {
    marginTop: 12,
  },
  relatedSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
    paddingBottom: 20,
  },
  relatedTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  relatedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  relatedItemContent: {
    flex: 1,
    gap: 4,
  },
  relatedItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  relatedItemCategory: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
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
  controlButtonDisabled: {
    opacity: 0.4,
  },
  browserToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolbarButton: {
    padding: 8,
    borderRadius: 8,
  },
  urlDisplay: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
  },
  iframeContainer: {
    flex: 1,
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
  publicToggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  publicToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  publicToggleText: {
    flex: 1,
  },
  publicToggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  publicToggleDesc: {
    fontSize: 13,
  },
  proChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  upgradeModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  upgradeGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  upgradeContent: {
    padding: 32,
    alignItems: 'center',
  },
  crownCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  upgradeTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  upgradeText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  upgradeFeatures: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  upgradeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upgradeFeatureText: {
    fontSize: 16,
    fontWeight: '500',
  },
  upgradeButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
