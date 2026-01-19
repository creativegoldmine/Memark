import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Platform, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ExternalLink, Share2, Globe, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, Profile, Item, supabaseUrl } from '@/lib/supabase';

export default function PublicProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [publicItems, setPublicItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      await Share.share({
        message: shareText,
        title: `${profile.username} on Memark`,
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleItemPress = (item: Item) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (item.raw_content.startsWith('http')) {
      router.push(`/item-detail?id=${item.id}`);
    }
  };

  const handleShareItem = async (item: Item) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const itemUrl = item.raw_content.startsWith('http') ? item.raw_content : '';
    const profileUrl = `${supabaseUrl}/profile/${profile?.username}`;
    const shareText = `${item.title || 'Check this out'}\n\n${item.summary || ''}\n\n${itemUrl}\n\nShared from Memark ${profileUrl}`;

    try {
      await Share.share({
        message: shareText,
        title: item.title || 'Share Item',
      });
    } catch (err) {
      console.error('Share error:', err);
    }
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
            <View style={styles.itemsGrid}>
              {publicItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.7}
                >
                  {(item.og_image || item.preview_image_url || item.image_preview) ? (
                    <View style={styles.itemImageContainer}>
                      <Image
                        source={{ uri: item.og_image || item.preview_image_url || item.image_preview }}
                        style={styles.itemImage}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.imageGradient}
                      />
                    </View>
                  ) : (
                    <View style={[styles.itemImageContainer, { backgroundColor: theme.primary + '10', justifyContent: 'center', alignItems: 'center' }]}>
                      <Image
                        source={require('@/assets/images/copy_of_memark.png')}
                        style={{ width: 120, height: 120, opacity: 0.4 }}
                        resizeMode="contain"
                      />
                    </View>
                  )}

                  <View style={styles.itemContent}>
                    <View style={styles.itemHeader}>
                      {item.type && (
                        <View style={[styles.typeChip, { backgroundColor: theme.primary + '15' }]}>
                          <Text style={[styles.typeText, { color: theme.primary }]}>
                            {item.type}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>
                      {item.preview_title || item.title || 'Untitled'}
                    </Text>

                    {(item.preview_desc || item.summary) && (
                      <Text style={[styles.itemSummary, { color: theme.textSecondary }]} numberOfLines={3}>
                        {item.preview_desc || item.summary}
                      </Text>
                    )}

                    {item.tags && item.tags.length > 0 && (
                      <View style={styles.itemTags}>
                        {item.tags.slice(0, 3).map((tag, index) => (
                          <View
                            key={index}
                            style={[styles.tag, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '30' }]}
                          >
                            <Text style={[styles.tagText, { color: theme.accent }]} numberOfLines={1}>
                              #{tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.itemFooter}>
                      {item.raw_content.startsWith('http') && (
                        <TouchableOpacity
                          style={styles.linkButton}
                          onPress={() => handleItemPress(item)}
                        >
                          <ExternalLink size={16} color={theme.primary} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.shareItemButton}
                        onPress={() => handleShareItem(item)}
                      >
                        <Share2 size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
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
            }}
          >
            <Text style={styles.ctaButtonText}>Create Your Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
  itemsGrid: {
    gap: 16,
  },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemImageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  itemContent: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 24,
  },
  itemSummary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  itemTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: 100,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  linkButton: {
    padding: 8,
  },
  shareItemButton: {
    padding: 8,
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
