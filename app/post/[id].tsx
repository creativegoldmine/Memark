import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, User, LogIn } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { Item, Profile } from '@/lib/supabase';
import { ItemCard } from '@/components/ItemCard';
import { ShareableURL } from '@/components/ShareableURL';
import { InAppBrowser } from '@/components/InAppBrowser';

export default function PublicPostScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [item, setItem] = useState<Item | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [browserVisible, setBrowserVisible] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');

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

  const handleOpenUrl = (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      setBrowserUrl(url);
      setBrowserVisible(true);
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

  const handleShareSuccess = async () => {
    try {
      await supabase.rpc('increment_shares_count', { item_id: id });
      setItem(prev => prev ? { ...prev, shares_count: (prev.shares_count || 0) + 1 } : null);
    } catch (err) {
      console.error('Error incrementing shares count:', err);
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

  const publicPostUrl = `https://memark.app/post/${id}`;
  const authorName = profile?.username || 'Anonymous';

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Public Post</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Author info */}
        {profile && (
          <TouchableOpacity style={styles.authorSection} onPress={handleViewProfile}>
            <View style={[styles.authorAvatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.authorAvatarText}>
                {authorName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: theme.text }]}>@{authorName}</Text>
              {profile.bio && (
                <Text style={[styles.authorBio, { color: theme.textSecondary }]} numberOfLines={1}>
                  {profile.bio}
                </Text>
              )}
            </View>
            <User size={20} color={theme.primary} />
          </TouchableOpacity>
        )}

        {/* Main item card - consistent design */}
        <View style={styles.itemSection}>
          <ItemCard
            item={item}
            onOpenUrl={handleOpenUrl}
            viewMode="list"
            showActions={false}
          />
        </View>

        {/* Shareable URL section */}
        <ShareableURL
          url={publicPostUrl}
          title={item.og_title || item.preview_title || item.title}
          description={item.og_description || item.preview_desc || item.summary}
          itemId={item.id}
          onShareSuccess={handleShareSuccess}
        />

        {/* CTA Section for non-logged-in users */}
        {!user && (
          <View style={[styles.ctaSection, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '20' }]}>
            <LogIn size={40} color={theme.primary} />
            <Text style={[styles.ctaTitle, { color: theme.text }]}>Save and organize content like this</Text>
            <Text style={[styles.ctaDescription, { color: theme.textSecondary }]}>
              Join Memark to build your personal knowledge vault with AI-powered organization
            </Text>
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/signup')}
            >
              <Text style={styles.ctaButtonText}>Sign Up Free</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Open in Memark (logged in users) */}
        {user && (
          <TouchableOpacity
            style={[styles.openButton, { backgroundColor: theme.primary }]}
            onPress={handleOpenInMemark}
          >
            <Text style={styles.openButtonText}>Open in Memark</Text>
          </TouchableOpacity>
        )}

        {/* Stats section */}
        <View style={[styles.statsSection, { borderTopColor: theme.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.primary }]}>
              {item.view_count || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Views</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.primary }]}>
              {item.shares_count || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Shares</Text>
          </View>
        </View>

        {/* Powered by Memark */}
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <Text style={[styles.footerText, { color: theme.textTertiary }]}>Powered by Memark</Text>
        </View>
      </ScrollView>

      <InAppBrowser
        visible={browserVisible}
        url={browserUrl}
        onClose={() => setBrowserVisible(false)}
      />
    </>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  authorBio: {
    fontSize: 13,
  },
  itemSection: {
    paddingHorizontal: 20,
  },
  ctaSection: {
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  ctaButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    } : {
      elevation: 4,
    }),
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  openButton: {
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    } : {
      elevation: 4,
    }),
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 20,
    borderTopWidth: 1,
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    marginHorizontal: 20,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
  },
});
