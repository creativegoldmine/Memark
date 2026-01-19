import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Switch, TextInput, Share } from 'react-native';
import { User, Phone, Mail, LogOut, Moon, Sun, Sparkles, Settings, MessageSquare, Copy, Upload, FileText, RefreshCw, Shield, ShieldAlert, Globe, Lock, ExternalLink, Crown, Edit3, Bell } from 'lucide-react-native';
import { LoadingLogo } from '@/components/LoadingLogo';
import { LogoHeader } from '@/components/LogoHeader';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabaseUrl, Profile as ProfileType } from '@/lib/supabase';
import { UpgradeModal } from '@/components/UpgradeModal';

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { dbUser, signOut, user } = useAuth();
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [publicItemsCount, setPublicItemsCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingTwitter, setRefreshingTwitter] = useState(false);
  const [refreshingAllEmbeds, setRefreshingAllEmbeds] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<any>(null);

  const isPro = dbUser?.plan_type === 'pro' || dbUser?.plan_type === 'premium';

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (dbUser) {
        setIsSuperAdmin(dbUser.is_superadmin || false);
        setIsAdminMode(dbUser.active_role === 'superadmin');
      }
    };
    checkAdminStatus();
  }, [dbUser]);

  useEffect(() => {
    loadProfile();
    loadNotificationPreferences();
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        setBioText(profileData.bio || '');
      }

      const { count } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_public', true);

      setPublicItemsCount(count || 0);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadNotificationPreferences = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading notification preferences:', error);
        return;
      }

      if (data) {
        setNotificationPrefs(data);
      } else {
        const { data: newPrefs } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();
        setNotificationPrefs(newPrefs);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const updateNotificationPreference = async (field: string, value: any) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ [field]: value })
        .eq('user_id', user.id);

      if (error) throw error;

      setNotificationPrefs((prev: any) => ({ ...prev, [field]: value }));
    } catch (error) {
      console.error('Error updating notification preference:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleTogglePublicProfile = async () => {
    if (!profile) return;

    if (!isPro) {
      setUpgradeModalVisible(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_public: !profile.is_public })
        .eq('user_id', user!.id);

      if (error) throw error;

      setProfile({ ...profile, is_public: !profile.is_public });

      if (!profile.is_public) {
        const publicUrl = `${supabaseUrl}/profile/${profile.username}`;
        Alert.alert(
          'Profile is now public!',
          `Your profile is now live at:\n\n${publicUrl}`,
          [
            { text: 'Share', onPress: () => handleShareProfile() },
            { text: 'OK' },
          ]
        );
      }
    } catch (error) {
      console.error('Error toggling profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleSaveBio = async () => {
    if (!profile || !user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio: bioText })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile({ ...profile, bio: bioText });
      setEditingBio(false);
      Alert.alert('Success', 'Bio updated!');
    } catch (error) {
      console.error('Error updating bio:', error);
      Alert.alert('Error', 'Failed to update bio');
    }
  };

  const handleShareProfile = async () => {
    if (!profile) return;

    const profileUrl = `${supabaseUrl}/profile/${profile.username}?ref=${user?.id}`;
    const shareText = `Check out my Memark profile!\n\n${profile.bio || 'My curated collection of great content'}\n\n${profileUrl}`;

    try {
      await Share.share({
        message: shareText,
        title: 'My Memark Profile',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/welcome');
        },
      },
    ]);
  };

  const handleSyncTwilioMessages = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in first');
      return;
    }

    setSyncing(true);

    try {
      console.log('Starting SMS sync...');
      console.log('Supabase URL:', supabaseUrl);

      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session retrieved:', !!session);

      if (!session) {
        Alert.alert('Error', 'Not authenticated');
        setSyncing(false);
        return;
      }

      const url = `${supabaseUrl}/functions/v1/sync-twilio-messages`;
      console.log('Calling URL:', url);
      console.log('Has access token:', !!session.access_token);

      const response = await Promise.race([
        fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out after 60 seconds')), 60000)
        )
      ]) as Response;

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const data = await response.json();
      console.log('Sync response data:', JSON.stringify(data, null, 2));

      if (data.success) {
        const total = data.total || 0;
        const imported = data.imported || 0;
        const skipped = data.skipped || 0;
        const errors = data.errors || 0;

        let message = `Total messages found: ${total}\n`;
        message += `Imported: ${imported}\n`;
        message += `Skipped: ${skipped}`;

        if (errors > 0) {
          message += `\nErrors: ${errors}`;
        }

        Alert.alert('Sync Complete', message);
      } else {
        Alert.alert('Sync Failed', data.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      Alert.alert('Sync Error', error.message || 'Failed to sync messages');
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshAllData = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in first');
      return;
    }

    Alert.alert(
      'Refresh All Data',
      'This will update previews and AI tags for all your items. This may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          onPress: async () => {
            setRefreshing(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();

              if (!session) {
                Alert.alert('Error', 'Not authenticated');
                return;
              }

              const response = await fetch(`${supabaseUrl}/functions/v1/batch-refresh-previews`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  limit: 1000,
                  onlyStale: false,
                }),
              });

              if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
              }

              const data = await response.json();

              if (data.success) {
                const { processed, updated, failed } = data;
                let message = `Processed: ${processed}\nUpdated: ${updated}`;
                if (failed > 0) {
                  message += `\nFailed: ${failed}`;
                }
                Alert.alert('Refresh Complete', message);
              } else {
                Alert.alert('Refresh Failed', data.error || 'Unknown error occurred');
              }
            } catch (error: any) {
              console.error('Refresh error:', error);
              Alert.alert('Refresh Error', error.message || 'Failed to refresh data');
            } finally {
              setRefreshing(false);
            }
          },
        },
      ]
    );
  };

  const handleRefreshAllEmbeds = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in first');
      return;
    }

    Alert.alert(
      'Refresh All Social Embeds',
      'This will re-fetch native embeds for Twitter, Instagram, YouTube, TikTok, Vimeo, and Facebook posts. This may take a few moments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh All',
          onPress: async () => {
            setRefreshingAllEmbeds(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();

              if (!session) {
                Alert.alert('Error', 'Not authenticated');
                return;
              }

              const response = await fetch(`${supabaseUrl}/functions/v1/batch-refresh-previews`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  limit: 100,
                  platforms: ['twitter', 'instagram', 'youtube', 'tiktok', 'vimeo', 'facebook'],
                }),
              });

              if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
              }

              const data = await response.json();

              if (data.success) {
                Alert.alert(
                  'Refresh Complete',
                  `Processed ${data.processed || 0} items\nUpdated ${data.updated || 0} with native embeds\n\nPlatforms: Twitter, Instagram, YouTube, TikTok, Vimeo, Facebook`
                );
              } else {
                Alert.alert('Refresh Failed', data.error || 'Unknown error occurred');
              }
            } catch (error: any) {
              console.error('Embed refresh error:', error);
              Alert.alert('Refresh Error', error.message || 'Failed to refresh embeds');
            } finally {
              setRefreshingAllEmbeds(false);
            }
          },
        },
      ]
    );
  };

  const handleRefreshTwitterPreviews = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in first');
      return;
    }

    Alert.alert(
      'Refresh X/Twitter Previews',
      'This will re-fetch images and content for your X/Twitter posts. Items with missing images will be updated.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          onPress: async () => {
            setRefreshingTwitter(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();

              if (!session) {
                Alert.alert('Error', 'Not authenticated');
                return;
              }

              const response = await fetch(`${supabaseUrl}/functions/v1/batch-refresh-previews`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  limit: 100,
                  platforms: ['twitter'],
                }),
              });

              if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
              }

              const data = await response.json();

              if (data.success) {
                Alert.alert(
                  'Refresh Complete',
                  `Processed: ${data.processed || 0}\nUpdated with images: ${data.updated || 0}${data.failed > 0 ? `\nFailed: ${data.failed}` : ''}`
                );
              } else {
                Alert.alert('Refresh Failed', data.error || 'Unknown error occurred');
              }
            } catch (error: any) {
              console.error('Twitter refresh error:', error);
              Alert.alert('Refresh Error', error.message || 'Failed to refresh Twitter previews');
            } finally {
              setRefreshingTwitter(false);
            }
          },
        },
      ]
    );
  };

  const handleImportBookmarks = () => {
    Alert.alert(
      'Import Bookmarks',
      'This feature is only available on mobile. Please use the mobile app to import bookmarks.',
      [{ text: 'OK' }]
    );
  };

  const handleAdminAccess = () => {
    setTapCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= 7) {
        router.push('/admin-login');
        return 0;
      }
      return newCount;
    });
  };

  const themeOptions = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
    { mode: 'purple', label: 'Purple', icon: Sparkles },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={handleAdminAccess} activeOpacity={1}>
        <LogoHeader />
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.profileCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <User size={32} color="#FFFFFF" />
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{dbUser?.name || 'User'}</Text>
          <View style={[styles.planBadge, { backgroundColor: theme.surface }]}>
            <Text style={[styles.planText, { color: theme.primary }]}>
              {dbUser?.plan_type?.toUpperCase() || 'FREE'}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Account Details</Text>

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: theme.surface }]}>
              <Mail size={18} color={theme.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{dbUser?.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: theme.surface }]}>
              <Phone size={18} color={theme.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Phone Number</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{dbUser?.phone_number}</Text>
            </View>
          </View>
        </View>

        {profile && (
          <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Public Profile</Text>
              {!isPro && (
                <View style={[styles.proChip, { backgroundColor: theme.warning + '15' }]}>
                  <Crown size={12} color={theme.warning} />
                  <Text style={[styles.proText, { color: theme.warning }]}>PRO</Text>
                </View>
              )}
            </View>

            <View style={[styles.publicProfileCard, { backgroundColor: theme.surface }]}>
              <View style={styles.publicProfileHeader}>
                <View style={styles.publicProfileInfo}>
                  {profile.is_public ? (
                    <Globe size={20} color={theme.primary} />
                  ) : (
                    <Lock size={20} color={theme.textSecondary} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.publicProfileTitle, { color: theme.text }]}>
                      {profile.is_public ? 'Profile is Public' : 'Profile is Private'}
                    </Text>
                    <Text style={[styles.publicProfileSubtitle, { color: theme.textSecondary }]}>
                      @{profile.username}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={profile.is_public}
                  onValueChange={handleTogglePublicProfile}
                  trackColor={{ false: theme.border, true: theme.primary + '40' }}
                  thumbColor={profile.is_public ? theme.primary : theme.textTertiary}
                />
              </View>

              {profile.is_public && (
                <>
                  <View style={[styles.statRow, { borderTopColor: theme.border }]}>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                      Public Marks
                    </Text>
                    <Text style={[styles.statValue, { color: theme.primary }]}>
                      {publicItemsCount}
                    </Text>
                  </View>

                  <View style={styles.bioSection}>
                    <View style={styles.bioHeader}>
                      <Text style={[styles.bioLabel, { color: theme.textSecondary }]}>Bio</Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (editingBio) {
                            handleSaveBio();
                          } else {
                            setEditingBio(true);
                          }
                        }}
                      >
                        <Text style={[styles.bioEditButton, { color: theme.primary }]}>
                          {editingBio ? 'Save' : 'Edit'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {editingBio ? (
                      <TextInput
                        style={[styles.bioInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                        value={bioText}
                        onChangeText={setBioText}
                        placeholder="Add a bio to your public profile..."
                        placeholderTextColor={theme.textTertiary}
                        multiline
                        maxLength={160}
                      />
                    ) : (
                      <Text style={[styles.bioText, { color: theme.text }]}>
                        {profile.bio || 'No bio yet. Add one to personalize your profile!'}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.shareProfileButton, { backgroundColor: theme.primary }]}
                    onPress={handleShareProfile}
                  >
                    <ExternalLink size={18} color="#FFFFFF" />
                    <Text style={styles.shareProfileButtonText}>Share My Profile</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.viewProfileButton, { backgroundColor: theme.surface }]}
                    onPress={() => router.push(`/profile/${profile.username}`)}
                  >
                    <Globe size={18} color={theme.primary} />
                    <Text style={[styles.viewProfileButtonText, { color: theme.primary }]}>
                      View Public Profile
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {!profile.is_public && (
              <View style={[styles.infoBox, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
                <Text style={[styles.infoBoxText, { color: theme.textSecondary }]}>
                  Enable public profile to share your best marks Linktree-style and build your network!
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>MeMark SMS</Text>

          <View style={[styles.smsCard, { backgroundColor: theme.surface }]}>
            <View style={styles.smsHeader}>
              <MessageSquare size={20} color={theme.primary} />
              <Text style={[styles.smsTitle, { color: theme.text }]}>Text to Save</Text>
            </View>
            <Text style={[styles.smsDescription, { color: theme.textSecondary }]}>
              Send any link, note, or content to MeMark and we'll automatically organize it for you.
            </Text>
            <View style={[styles.numberContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.memarkNumber, { color: theme.primary }]}>+1 (862) 355-3847</Text>
              <TouchableOpacity
                style={[styles.copyButton, { backgroundColor: theme.primary }]}
                onPress={() => Alert.alert('Copied!', 'MeMark number copied to clipboard')}
              >
                <Copy size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.smsNote, { color: theme.textTertiary }]}>
              Your phone number ({dbUser?.phone_number}) is linked to your account
            </Text>
          </View>

          <TouchableOpacity style={[styles.upgradeCard, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
            <Text style={[styles.upgradeTitle, { color: theme.primary }]}>Get Your Own Number</Text>
            <Text style={[styles.upgradeDescription, { color: theme.textSecondary }]}>
              Upgrade to Premium for a dedicated personal number
            </Text>
          </TouchableOpacity>
        </View>

        {notificationPrefs && (
          <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Notifications</Text>

            <View style={[styles.notificationRow, { borderBottomColor: theme.border }]}>
              <View style={styles.notificationLeft}>
                <View style={[styles.infoIcon, { backgroundColor: theme.surface }]}>
                  <Bell size={18} color={theme.primary} />
                </View>
                <View style={styles.notificationText}>
                  <Text style={[styles.notificationTitle, { color: theme.text }]}>Push Notifications</Text>
                  <Text style={[styles.notificationSubtitle, { color: theme.textSecondary }]}>
                    Receive push notifications on this device
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationPrefs.enable_push_notifications}
                onValueChange={(value) => updateNotificationPreference('enable_push_notifications', value)}
                trackColor={{ false: theme.border, true: theme.primary + '40' }}
                thumbColor={notificationPrefs.enable_push_notifications ? theme.primary : theme.textTertiary}
              />
            </View>

            <View style={[styles.notificationRow, { borderBottomColor: theme.border }]}>
              <View style={styles.notificationLeft}>
                <Text style={[styles.notificationLabel, { color: theme.text }]}>Review Reminders</Text>
                <Text style={[styles.notificationHint, { color: theme.textSecondary }]}>
                  Get reminded to revisit saved items
                </Text>
              </View>
              <Switch
                value={notificationPrefs.enable_review_reminders}
                onValueChange={(value) => updateNotificationPreference('enable_review_reminders', value)}
                trackColor={{ false: theme.border, true: theme.primary + '40' }}
                thumbColor={notificationPrefs.enable_review_reminders ? theme.primary : theme.textTertiary}
              />
            </View>

            <View style={[styles.notificationRow, { borderBottomColor: theme.border }]}>
              <View style={styles.notificationLeft}>
                <Text style={[styles.notificationLabel, { color: theme.text }]}>Daily Digest</Text>
                <Text style={[styles.notificationHint, { color: theme.textSecondary }]}>
                  Daily summary of your saved items
                </Text>
              </View>
              <Switch
                value={notificationPrefs.enable_daily_digest}
                onValueChange={(value) => updateNotificationPreference('enable_daily_digest', value)}
                trackColor={{ false: theme.border, true: theme.primary + '40' }}
                thumbColor={notificationPrefs.enable_daily_digest ? theme.primary : theme.textTertiary}
              />
            </View>

            <View style={[styles.notificationRow, { borderBottomColor: theme.border }]}>
              <View style={styles.notificationLeft}>
                <Text style={[styles.notificationLabel, { color: theme.text }]}>Weekly Digest</Text>
                <Text style={[styles.notificationHint, { color: theme.textSecondary }]}>
                  Weekly roundup of your activity
                </Text>
              </View>
              <Switch
                value={notificationPrefs.enable_weekly_digest}
                onValueChange={(value) => updateNotificationPreference('enable_weekly_digest', value)}
                trackColor={{ false: theme.border, true: theme.primary + '40' }}
                thumbColor={notificationPrefs.enable_weekly_digest ? theme.primary : theme.textTertiary}
              />
            </View>

            <View style={[styles.notificationRow, { borderBottomWidth: 0 }]}>
              <View style={styles.notificationLeft}>
                <Text style={[styles.notificationLabel, { color: theme.text }]}>Collection Updates</Text>
                <Text style={[styles.notificationHint, { color: theme.textSecondary }]}>
                  Get notified when collections grow
                </Text>
              </View>
              <Switch
                value={notificationPrefs.enable_collection_updates}
                onValueChange={(value) => updateNotificationPreference('enable_collection_updates', value)}
                trackColor={{ false: theme.border, true: theme.primary + '40' }}
                thumbColor={notificationPrefs.enable_collection_updates ? theme.primary : theme.textTertiary}
              />
            </View>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Theme</Text>

          {themeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <TouchableOpacity
                key={option.mode}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: themeMode === option.mode ? theme.surface : 'transparent',
                  },
                ]}
                onPress={() => setThemeMode(option.mode as any)}
              >
                <View style={styles.themeLeft}>
                  <View style={[styles.infoIcon, { backgroundColor: theme.surface }]}>
                    <Icon size={18} color={theme.primary} />
                  </View>
                  <Text style={[styles.themeLabel, { color: theme.text }]}>{option.label}</Text>
                </View>
                {themeMode === option.mode && (
                  <View style={[styles.checkmark, { backgroundColor: theme.primary }]}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {isSuperAdmin && (
          <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SuperAdmin</Text>

            <TouchableOpacity
              style={[
                styles.adminToggle,
                { backgroundColor: isAdminMode ? '#EF4444' + '20' : theme.surface },
              ]}
              onPress={async () => {
                if (isAdminMode) {
                  const { data, error } = await supabase.rpc('disable_superadmin_mode');
                  if (!error) {
                    setIsAdminMode(false);
                    Alert.alert('Admin Mode Disabled', 'You are now in user mode');
                  }
                } else {
                  Alert.alert(
                    'Enable Admin Mode?',
                    'This will give you access to administrative functions.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Enable',
                        style: 'destructive',
                        onPress: async () => {
                          const { data, error } = await supabase.rpc('enable_superadmin_mode');
                          if (!error) {
                            setIsAdminMode(true);
                            router.push('/admin-panel');
                          }
                        },
                      },
                    ]
                  );
                }
              }}
            >
              <View style={styles.adminToggleLeft}>
                <View style={[styles.infoIcon, { backgroundColor: isAdminMode ? '#EF4444' : theme.primary }]}>
                  {isAdminMode ? (
                    <ShieldAlert size={18} color="#FFFFFF" />
                  ) : (
                    <Shield size={18} color="#FFFFFF" />
                  )}
                </View>
                <View>
                  <Text style={[styles.adminToggleTitle, { color: theme.text }]}>
                    {isAdminMode ? 'Admin Mode Active' : 'Enable Admin Mode'}
                  </Text>
                  <Text style={[styles.adminToggleDescription, { color: theme.textSecondary }]}>
                    {isAdminMode ? 'Manage users and system settings' : 'Switch to administrator role'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Data Management</Text>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={async () => {
              if (!user) return;
              setRecategorizing(true);
              try {
                const response = await fetch(`${supabaseUrl}/functions/v1/bulk-recategorize`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: user.id }),
                });
                const result = await response.json();
                Alert.alert('Success', `Recategorized ${result.itemsProcessed} items into smart folders!`);
              } catch (error) {
                Alert.alert('Error', 'Failed to recategorize items');
              } finally {
                setRecategorizing(false);
              }
            }}
            disabled={recategorizing}
          >
            <View style={[styles.infoIcon, { backgroundColor: theme.primary + '20' }]}>
              {recategorizing ? (
                <LoadingLogo size={12} />
              ) : (
                <Sparkles size={18} color={theme.primary} />
              )}
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.settingsText, { color: theme.text }]}>AI Recategorize All</Text>
              <Text style={[styles.settingsSubtext, { color: theme.textSecondary }]}>
                Organize all items into smart folders
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={handleRefreshAllData}
            disabled={refreshing}
          >
            <View style={[styles.infoIcon, { backgroundColor: theme.success + '20' }]}>
              {refreshing ? (
                <LoadingLogo size={12} />
              ) : (
                <RefreshCw size={18} color={theme.success} />
              )}
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.settingsText, { color: theme.text }]}>Refresh All Data</Text>
              <Text style={[styles.settingsSubtext, { color: theme.textSecondary }]}>
                Update previews & AI tags for all items
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={handleRefreshAllEmbeds}
            disabled={refreshingAllEmbeds}
          >
            <View style={[styles.infoIcon, { backgroundColor: theme.primary + '20' }]}>
              {refreshingAllEmbeds ? (
                <LoadingLogo size={12} />
              ) : (
                <RefreshCw size={18} color={theme.primary} />
              )}
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.settingsText, { color: theme.text }]}>Refresh All Social Embeds</Text>
              <Text style={[styles.settingsSubtext, { color: theme.textSecondary }]}>
                Update native embeds for Twitter, Instagram, YouTube, TikTok, Facebook, Vimeo
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={handleRefreshTwitterPreviews}
            disabled={refreshingTwitter}
          >
            <View style={[styles.infoIcon, { backgroundColor: '#1DA1F2' + '20' }]}>
              {refreshingTwitter ? (
                <LoadingLogo size={12} />
              ) : (
                <RefreshCw size={18} color="#1DA1F2" />
              )}
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.settingsText, { color: theme.text }]}>Refresh X/Twitter Previews</Text>
              <Text style={[styles.settingsSubtext, { color: theme.textSecondary }]}>
                Update images & content for X posts (legacy)
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={handleSyncTwilioMessages}
            disabled={syncing}
          >
            <View style={[styles.infoIcon, { backgroundColor: theme.primary + '20' }]}>
              {syncing ? (
                <LoadingLogo size={12} />
              ) : (
                <RefreshCw size={18} color={theme.primary} />
              )}
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.settingsText, { color: theme.text }]}>Sync SMS Messages</Text>
              <Text style={[styles.settingsSubtext, { color: theme.textSecondary }]}>
                Import all messages sent to MeMark
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={handleImportBookmarks}
            disabled={importing}
          >
            <View style={[styles.infoIcon, { backgroundColor: theme.primary + '20' }]}>
              {importing ? (
                <LoadingLogo size={12} />
              ) : (
                <Upload size={18} color={theme.primary} />
              )}
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.settingsText, { color: theme.text }]}>Import Bookmarks</Text>
              <Text style={[styles.settingsSubtext, { color: theme.textSecondary }]}>
                Import your existing bookmarks
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <TouchableOpacity style={styles.settingsRow}>
            <View style={[styles.infoIcon, { backgroundColor: theme.surface }]}>
              <Settings size={18} color={theme.textSecondary} />
            </View>
            <Text style={[styles.settingsText, { color: theme.text }]}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsRow} onPress={handleSignOut}>
            <View style={[styles.infoIcon, { backgroundColor: theme.error + '20' }]}>
              <LogOut size={18} color={theme.error} />
            </View>
            <Text style={[styles.settingsText, { color: theme.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <UpgradeModal
        visible={upgradeModalVisible}
        onClose={() => setUpgradeModalVisible(false)}
        feature="Public Profiles"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
    gap: 16,
  },
  profileCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  planText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  settingsText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingsSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  smsCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  smsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  smsDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  numberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  memarkNumber: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smsNote: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  upgradeCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  upgradeDescription: {
    fontSize: 14,
  },
  adminToggle: {
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  adminToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  adminToggleDescription: {
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  publicProfileCard: {
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  publicProfileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  publicProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  publicProfileTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  publicProfileSubtitle: {
    fontSize: 14,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  bioSection: {
    gap: 8,
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bioLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  bioEditButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  bioInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
  },
  shareProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
  },
  shareProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
  },
  viewProfileButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoBox: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoBoxText: {
    fontSize: 14,
    lineHeight: 20,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  notificationLeft: {
    flex: 1,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  notificationLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  notificationHint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
