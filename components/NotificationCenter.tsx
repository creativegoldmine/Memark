import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Bell, X, Check, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

export function NotificationCenter() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [user?.id]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      const unread = data?.filter(n => !n.is_read).length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          action_taken: 'clicked',
          action_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    await markAsRead(notification.id);

    if (notification.data?.item_ids && notification.data.item_ids.length > 0) {
      setVisible(false);
      router.push('/(tabs)');
    } else if (notification.data?.folder_id) {
      setVisible(false);
      router.push('/(tabs)/collections');
    }
  };

  const toggleVisible = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setVisible(!visible);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    return '🔔';
  };

  return (
    <>
      <TouchableOpacity
        style={styles.bellButton}
        onPress={toggleVisible}
      >
        <Bell size={24} color={theme.text} />
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Notifications
              </Text>
              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    style={styles.markAllButton}
                    onPress={markAllAsRead}
                  >
                    <Check size={18} color={theme.primary} />
                    <Text style={[styles.markAllText, { color: theme.primary }]}>
                      Mark all read
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setVisible(false)}>
                  <X size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Bell size={48} color={theme.secondaryText} />
                <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                  No notifications yet
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.notificationItem,
                      {
                        backgroundColor: item.is_read
                          ? 'transparent'
                          : theme.primary + '10',
                        borderBottomColor: theme.border,
                      },
                    ]}
                    onPress={() => handleNotificationPress(item)}
                  >
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationIcon}>
                        {getNotificationIcon(item.notification_type)}
                      </Text>
                      <View style={styles.notificationText}>
                        <Text
                          style={[
                            styles.notificationTitle,
                            { color: theme.text },
                            !item.is_read && styles.unreadTitle,
                          ]}
                          numberOfLines={2}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[styles.notificationBody, { color: theme.secondaryText }]}
                          numberOfLines={2}
                        >
                          {item.body}
                        </Text>
                        <Text style={[styles.notificationTime, { color: theme.textTertiary }]}>
                          {formatTime(item.created_at)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        deleteNotification(item.id);
                      }}
                    >
                      <Trash2 size={16} color={theme.secondaryText} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationText: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
});
