import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Grid, List } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Item } from '@/lib/supabase';
import { LogoHeader } from '@/components/LogoHeader';
import { LoadingLogo } from '@/components/LoadingLogo';
import { ItemCard } from '@/components/ItemCard';
import { LinkPreviewModal } from '@/components/LinkPreviewModal';

export default function Collections() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const fetchItems = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setItems(data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchItems();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <LoadingLogo size={80} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LogoHeader pageTitle="ALL MARKS" />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerText, { color: theme.text }]}>Collections</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'list' && { backgroundColor: theme.surface }]}
            onPress={() => setViewMode('list')}
          >
            <List size={20} color={viewMode === 'list' ? theme.primary : theme.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'grid' && { backgroundColor: theme.surface }]}
            onPress={() => setViewMode('grid')}
          >
            <Grid size={20} color={viewMode === 'grid' ? theme.primary : theme.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No marks yet</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Send a link or note to MeMark via SMS{'\n'}or sync your Twilio messages in Settings
            </Text>
          </View>
        ) : (
          <View style={viewMode === 'grid' ? styles.itemsGrid : styles.itemsList}>
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onPress={() => {
                setSelectedItem(item);
                setModalVisible(true);
              }} />
            ))}
          </View>
        )}
      </ScrollView>

      <LinkPreviewModal
        visible={modalVisible}
        item={selectedItem}
        onClose={() => {
          setModalVisible(false);
          setSelectedItem(null);
        }}
        onUpdate={fetchItems}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsList: {
    gap: 12,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
