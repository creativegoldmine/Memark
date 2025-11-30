import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { User, Phone, Mail, LogOut, Moon, Sun, Sparkles, Settings, MessageSquare, Copy, Upload, FileText, RefreshCw, Shield, ShieldAlert } from 'lucide-react-native';
import { LoadingLogo } from '@/components/LoadingLogo';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabaseUrl } from '@/lib/supabase';

export default function Profile() {
  const router = useRouter();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { dbUser, signOut, user } = useAuth();
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (dbUser) {
        setIsSuperAdmin(dbUser.is_superadmin || false);
        setIsAdminMode(dbUser.active_role === 'superadmin');
      }
    };
    checkAdminStatus();
  }, [dbUser]);

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
    { mode: 'blue', label: 'Ocean Blue', icon: Sparkles },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleAdminAccess} activeOpacity={1} style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/MeMark.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: theme.textSecondary }]}>Settings</Text>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 375,
    height: 125,
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
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
});
