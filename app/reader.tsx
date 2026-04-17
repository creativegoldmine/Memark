import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { ArticleReader } from '@/components/ArticleReader';

interface ItemRow {
  id: string;
  raw_content: string | null;
  og_title: string | null;
  og_url: string | null;
  og_site_name: string | null;
  author_name: string | null;
  full_text: string | null;
  reading_time_minutes: number | null;
  word_count: number | null;
  extraction_status: string | null;
}

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const [item, setItem] = useState<ItemRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('Missing item id');
        setLoading(false);
        return;
      }
      const { data, error: err } = await supabase
        .from('items')
        .select(
          'id, raw_content, og_title, og_url, og_site_name, author_name, full_text, reading_time_minutes, word_count, extraction_status',
        )
        .eq('id', id)
        .maybeSingle();

      if (err) {
        setError(err.message);
      } else if (!data) {
        setError('Article not found');
      } else {
        setItem(data as ItemRow);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{error || 'Not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.primary }]}>
          <Text style={styles.backText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const extractUrl = (raw: string | null): string | null => {
    if (!raw) return null;
    const m = raw.match(/https?:\/\/[^\s]+/);
    return m ? m[0] : null;
  };

  const url = item.og_url || extractUrl(item.raw_content);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          Reader
        </Text>
        <View style={styles.iconBtn} />
      </View>
      <ArticleReader
        itemId={item.id}
        url={url}
        initialFullText={item.full_text}
        initialReadingTime={item.reading_time_minutes}
        initialWordCount={item.word_count}
        initialStatus={item.extraction_status}
        title={item.og_title}
        author={item.author_name}
        siteName={item.og_site_name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  errorText: { fontSize: 15, fontWeight: '500' },
  backBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  backText: { color: '#FFFFFF', fontWeight: '600' },
});
