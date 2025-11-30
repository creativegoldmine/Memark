import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Upload, FileText, Users, LogOut } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { LoadingLogo } from '@/components/LoadingLogo';

interface User {
  id: string;
  name: string;
  email: string;
  phone_number: string;
}

export default function AdminPanel() {
  const router = useRouter();
  const { theme } = useTheme();
  const { adminEmail } = useLocalSearchParams();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [jsonData, setJsonData] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, phone_number')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedUser) {
      Alert.alert('Error', 'Please select a user');
      return;
    }

    if (!jsonData.trim()) {
      Alert.alert('Error', 'Please paste JSON data');
      return;
    }

    setUploading(true);
    try {
      const bookmarks = JSON.parse(jsonData);

      if (!Array.isArray(bookmarks)) {
        throw new Error('Data must be an array of bookmarks');
      }

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: selectedUser.id,
            bookmarks,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          'Success!',
          `Uploaded ${result.imported} items${result.failed > 0 ? `, ${result.failed} failed` : ''}`
        );
        setJsonData('');
      } else {
        Alert.alert('Error', result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Invalid JSON format');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Exit admin panel?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => router.replace('/welcome'),
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <LoadingLogo size={80} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Admin Panel</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{adminEmail}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={[styles.logoutButton, { backgroundColor: theme.error + '20' }]}>
            <LogOut size={20} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Select User</Text>
          </View>

          <ScrollView style={styles.userList} nestedScrollEnabled>
            {users.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={[
                  styles.userItem,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  selectedUser?.id === user.id && { borderColor: theme.primary, borderWidth: 2 },
                ]}
                onPress={() => setSelectedUser(user)}
              >
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: theme.text }]}>{user.name}</Text>
                  <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user.email}</Text>
                  <Text style={[styles.userPhone, { color: theme.textTertiary }]}>{user.phone_number}</Text>
                </View>
                {selectedUser?.id === user.id && (
                  <View style={[styles.selectedBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.selectedText}>Selected</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Upload Data</Text>
          </View>

          <Text style={[styles.instructions, { color: theme.textSecondary }]}>
            Paste JSON array of bookmarks. Format:
          </Text>

          <View style={[styles.exampleBox, { backgroundColor: theme.surface }]}>
            <Text style={[styles.exampleText, { color: theme.textTertiary }]}>
              {`[\n  {\n    "url": "https://example.com",\n    "title": "Example",\n    "created_at": "2024-01-15T10:00:00Z"\n  }\n]`}
            </Text>
          </View>

          <TextInput
            style={[styles.jsonInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="Paste JSON data here..."
            placeholderTextColor={theme.textTertiary}
            value={jsonData}
            onChangeText={setJsonData}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.uploadButton,
              { backgroundColor: !selectedUser || !jsonData.trim() ? theme.border : theme.primary },
            ]}
            onPress={handleUpload}
            disabled={!selectedUser || !jsonData.trim() || uploading}
          >
            {uploading ? (
              <LoadingLogo size={16} />
            ) : (
              <>
                <Upload size={20} color="#FFFFFF" />
                <Text style={styles.uploadButtonText}>Upload to {selectedUser?.name || 'User'}</Text>
              </>
            )}
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
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 20,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  userList: {
    maxHeight: 300,
  },
  userItem: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
  },
  userPhone: {
    fontSize: 12,
  },
  selectedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  selectedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  instructions: {
    fontSize: 14,
  },
  exampleBox: {
    padding: 12,
    borderRadius: 8,
  },
  exampleText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  jsonInput: {
    padding: 12,
    borderRadius: 12,
    fontSize: 14,
    borderWidth: 1,
    minHeight: 200,
    fontFamily: 'monospace',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
