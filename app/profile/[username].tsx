import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Platform, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Share2, Globe, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, Profile, Item, supabaseUrl } from '@/lib/supabase';
import { ItemCard } from '@/components/ItemCard';
import { InAppBrowser } from '@/components/InAppBrowser';
import * as Clipboard from 'expo-clipboard';

export default function PublicProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [publicItems, setPublicItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [browserVisible, setBrowserVisible] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');

  const username = params.username as string;

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    if (!username) return;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username.toLowerCase())
        .eq('is_public', true)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        setError('Profile not found or is private');
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', profileData.user_id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (itemsError) throw itemsError;
      setPublicItems(itemsData || []);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleShareProfile = async () => {
    if (!profile) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const profileUrl = `${supabaseUrl}/profile/${profile.username}`;
    const shareText = `Check out ${profile.username}'s Memark profile!\n\n${profile.bio || 'Curated collection of great content'}\n\n${profileUrl}`;

    try {
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(profileUrl);
        alert('Profile link copied!');
      } else {
        await Share.share({
          message: shareText,
          title: `${profile.username} on Memark`,
        });
      }
    } catch (err) {
      console.error('Share error:', err);
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

  const handleItemPress = (item: Item) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/post/${item.id}`);
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

  if (error || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Globe size={64} color={theme.textTertiary} />
          <Text style={[styles.errorTitle, { color: theme.text }]}>Profile Not Found</Text>
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>
            {error || 'This profile is private or does not exist'}
          </Text>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: theme.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={[theme.primary + '15', theme.background]}
          style={styles.gradientBg}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileHeader}>
            <View style={[styles.avatarContainer, { borderColor: theme.primary }]}>
              {profile.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                  <Text style={styles.avatarText}>
                    {profile.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.username, { color: theme.text }]}>@{profile.username}</Text>

            {profile.bio && (
              <Text style={[styles.bio, { color: theme.textSecondary }]}>{profile.bio}</Text>
            )}

            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: theme.surface }]}>
                <Text style={[styles.statNumber, { color: theme.primary }]}>
                  {publicItems.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Public Marks
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: theme.primary }]}
              onPress={handleShareProfile}
            >
              <Share2 size={18} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>Share Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.itemsSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Public Collection</Text>

            {publicItems.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.surface }]}>
                <Globe size={48} color={theme.textTertiary} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No public marks yet</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  This user hasn't shared anything publicly
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {publicItems.map((item) => (
                  <View key={item.id}>
                    <ItemCard
                      item={item}
                      onPress={() => handleItemPress(item)}
                      onOpenUrl={handleOpenUrl}
                      viewMode="list"
                      showActions={false}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textTertiary }]}>
              Powered by Memark
            </Text>
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                router.push('/signup');
              }}
            >
              <Text style={styles.ctaButtonText}>Create Your Profile</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

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
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
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
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 40,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statBox: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
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
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  itemsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyState: {
    padding: 48,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  itemsList: {
    gap: 0,
  },
  footer: {
    marginTop: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    marginBottom: 16,
  },
  ctaButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
