import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink, Eye, Share2, User, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

import { Item, Profile } from '@/lib/supabase';

export default function PublicPostScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [item, setItem] = useState<Item | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchPublicItem();
      incrementViewCount();
    }
  }, [id]);

  const fetchPublicItem = async () => {
    try {
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .eq('is_public', true)
        .maybeSingle();

      if (itemError) throw itemError;

      if (!itemData) {
        setError('Post not found or not public');
        setLoading(false);
        return;
      }

      setItem(itemData);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', itemData.user_id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }
    } catch (err) {
      console.error('Error fetching public item:', err);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    try {
      await supabase.rpc('increment_view_count', { item_id: id });
    } catch (err) {
      console.error('Error incrementing view count:', err);
    }
  };

  const handleOpenLink = async () => {
    const url = item?.url || item?.raw_content;
    if (url && url.startsWith('http')) {
      await Linking.openURL(url);
    }
  };

  const handleViewProfile = () => {
    if (profile?.username) {
      router.push(`/profile/${profile.username}`);
    }
  };

  const handleOpenInMemark = () => {
    if (user) {
      router.push(`/item-detail?id=${id}`);
    } else {
      router.push('/signup');
    }
  };

  const handleSharePost = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const shareUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://memark.app'}/post/${id}`;
      const shareMessage = item?.title
        ? `Check out "${item.title}" on Memark`
        : 'Check out this post on Memark';

      await Share.share({
        message: Platform.OS === 'ios' ? shareMessage : `${shareMessage}\n${shareUrl}`,
        url: Platform.OS === 'ios' ? shareUrl : undefined,
        title: item?.title || 'Memark Post',
      });

      await supabase.rpc('increment_shares_count', { item_id: id });

      setItem(prev => prev ? { ...prev, shares_count: (prev.shares_count || 0) + 1 } : null);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      if (err.message !== 'User did not share') {
        console.error('Error sharing post:', err);
        Alert.alert('Error', 'Failed to share post');
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error || 'Post not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.primary} />
          <Text style={[styles.backButtonText, { color: theme.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayImage = item.preview_image_url || item.og_image;
  const displayTitle = item.title || item.preview_title;
  const displayDescription = item.summary || item.preview_desc;
  const authorName = profile?.username || 'Anonymous';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      {/* Header with back button and share button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.shareButton, { backgroundColor: theme.primary }]} onPress={handleSharePost}>
          <Share2 size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Featured Image */}
      {displayImage && (
        <Image
          source={{ uri: displayImage }}
          style={styles.featuredImage}
          resizeMode="cover"
        />
      )}

      {/* Content */}
      <View style={styles.contentSection}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Eye size={16} color={theme.textSecondary} />
            <Text style={[styles.statText, { color: theme.textSecondary }]}>{item.view_count || 0} views</Text>
          </View>
          <View style={styles.stat}>
            <Share2 size={16} color={theme.textSecondary} />
            <Text style={[styles.statText, { color: theme.textSecondary }]}>{item.shares_count || 0} shares</Text>
          </View>
        </View>

        {/* Title */}
        {displayTitle && <Text style={[styles.title, { color: theme.text }]}>{displayTitle}</Text>}

        {/* Author */}
        <TouchableOpacity style={styles.authorRow} onPress={handleViewProfile}>
          <User size={20} color={theme.primary} />
          <Text style={[styles.authorText, { color: theme.primary }]}>by {authorName}</Text>
        </TouchableOpacity>

        {/* Description */}
        {displayDescription && (
          <Text style={[styles.description, { color: theme.text }]}>{displayDescription}</Text>
        )}

        {/* Video */}
        {item.video_url && (
          <View style={[styles.videoPlaceholder, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.videoText, { color: theme.textSecondary }]}>Video content available</Text>
          </View>
        )}

        {/* Original Link */}
        {(item.url || (item.raw_content && item.raw_content.startsWith('http'))) && (
          <TouchableOpacity style={[styles.linkButton, { backgroundColor: theme.cardBackground }]} onPress={handleOpenLink}>
            <ExternalLink size={20} color={theme.primary} />
            <Text style={[styles.linkButtonText, { color: theme.primary }]}>Visit Original Source</Text>
          </TouchableOpacity>
        )}

        {/* CTA Section */}
        {!user && (
          <View style={[styles.ctaSection, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '20' }]}>
            <Text style={[styles.ctaTitle, { color: theme.text }]}>Save and organize content like this</Text>
            <Text style={[styles.ctaDescription, { color: theme.textSecondary }]}>
              Join Memark to build your personal knowledge vault with AI-powered organization
            </Text>
            <TouchableOpacity style={[styles.ctaButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/signup')}>
              <Text style={styles.ctaButtonText}>Sign Up Free</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Open in Memark (logged in users) */}
        {user && (
          <TouchableOpacity style={[styles.openButton, { backgroundColor: theme.primary }]} onPress={handleOpenInMemark}>
            <Text style={styles.openButtonText}>Open in Memark</Text>
          </TouchableOpacity>
        )}

        {/* Powered by Memark */}
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>Powered by Memark</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#E5E7EB',
  },
  contentSection: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 36,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  authorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  videoPlaceholder: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  videoText: {
    fontSize: 14,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  ctaSection: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  ctaDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  ctaButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  openButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
  },
});
