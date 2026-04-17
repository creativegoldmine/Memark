import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { BookOpen, RefreshCw, Clock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

interface ArticleReaderProps {
  itemId: string;
  url?: string | null;
  initialFullText?: string | null;
  initialReadingTime?: number | null;
  initialWordCount?: number | null;
  initialStatus?: string | null;
  title?: string | null;
  author?: string | null;
  siteName?: string | null;
}

interface ExtractionState {
  full_text: string | null;
  reading_time_minutes: number | null;
  word_count: number | null;
  status: 'idle' | 'loading' | 'success' | 'failed';
  error: string | null;
}

export function ArticleReader({
  itemId,
  url,
  initialFullText,
  initialReadingTime,
  initialWordCount,
  initialStatus,
  title,
  author,
  siteName,
}: ArticleReaderProps) {
  const { theme } = useTheme();
  const [state, setState] = useState<ExtractionState>({
    full_text: initialFullText || null,
    reading_time_minutes: initialReadingTime || null,
    word_count: initialWordCount || null,
    status: initialFullText ? 'success' : 'idle',
    error: null,
  });

  const runExtraction = async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setState((s) => ({ ...s, status: 'failed', error: 'Not authenticated' }));
        return;
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/extract-article-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ item_id: itemId, url }),
      });

      const json = await res.json();
      if (json?.success && json.full_text) {
        setState({
          full_text: json.full_text,
          reading_time_minutes: json.reading_time_minutes ?? null,
          word_count: json.word_count ?? null,
          status: 'success',
          error: null,
        });
      } else {
        setState((s) => ({
          ...s,
          status: 'failed',
          error: json?.error || 'Could not extract readable content',
        }));
      }
    } catch (err: any) {
      setState((s) => ({ ...s, status: 'failed', error: err?.message || 'Extraction error' }));
    }
  };

  useEffect(() => {
    if (!initialFullText && initialStatus !== 'failed') {
      runExtraction();
    }
  }, [itemId]);

  if (state.status === 'loading') {
    return (
      <View style={[styles.centered, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <ActivityIndicator color={theme.primary} />
        <Text style={[styles.muted, { color: theme.textSecondary }]}>Extracting readable content</Text>
      </View>
    );
  }

  if (state.status === 'failed' || !state.full_text) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <BookOpen size={28} color={theme.textTertiary} />
        <Text style={[styles.title, { color: theme.text }]}>Reader view unavailable</Text>
        <Text style={[styles.muted, { color: theme.textSecondary }]}>
          {state.error || "We couldn't extract the article body."}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: theme.primary }]}
          onPress={runExtraction}
          activeOpacity={0.85}
        >
          <RefreshCw size={14} color="#FFFFFF" />
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const paragraphs = state.full_text.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {title ? <Text style={[styles.headline, { color: theme.text }]}>{title}</Text> : null}
      <View style={styles.metaRow}>
        {author ? (
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>{author}</Text>
        ) : null}
        {siteName ? (
          <Text style={[styles.metaDot, { color: theme.textTertiary }]}> - {siteName}</Text>
        ) : null}
        {state.reading_time_minutes ? (
          <View style={styles.readingTime}>
            <Clock size={12} color={theme.textTertiary} />
            <Text style={[styles.metaText, { color: theme.textTertiary }]}>
              {state.reading_time_minutes} min read
            </Text>
          </View>
        ) : null}
      </View>
      {paragraphs.map((p, idx) => (
        <Text key={idx} style={[styles.paragraph, { color: theme.text }]}>
          {p}
        </Text>
      ))}
      <TouchableOpacity
        style={[styles.refetchBtn, { borderColor: theme.border }]}
        onPress={runExtraction}
        activeOpacity={0.8}
      >
        <RefreshCw size={12} color={theme.textSecondary} />
        <Text style={[styles.refetchText, { color: theme.textSecondary }]}>Re-extract</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  centered: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
    margin: 16,
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
  },
  metaText: { fontSize: 13, fontWeight: '500' },
  metaDot: { fontSize: 13 },
  readingTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  paragraph: {
    fontSize: 17,
    lineHeight: 27,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? { fontFamily: 'Georgia, serif' as any } : {}),
  },
  title: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 13, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  refetchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 12,
  },
  refetchText: { fontSize: 12, fontWeight: '500' },
});
