import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Send, Sparkles, Video, FileText, AtSign, Image as ImageIcon, Clock, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Item, supabaseUrl } from '@/lib/supabase';
import { ItemCard } from '@/components/ItemCard';
import { SocialEmbedCard } from '@/components/SocialEmbedCard';
import { LogoHeader } from '@/components/LogoHeader';
import { LoadingLogo } from '@/components/LoadingLogo';
import { LinkPreviewModal } from '@/components/LinkPreviewModal';
import { InAppBrowser } from '@/components/InAppBrowser';
import { ReminderPickerModal } from '@/components/ReminderPickerModal';
import { createReminder } from '@/lib/reminders';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  items?: Item[];
  totalResults?: number;
}

const FILTER_CHIPS = [
  { label: 'Videos', icon: Video, query: 'show me my YouTube videos' },
  { label: 'Articles', icon: FileText, query: 'find my saved articles' },
  { label: 'Tweets', icon: AtSign, query: 'show me my tweets' },
  { label: 'Images', icon: ImageIcon, query: 'find marks with images' },
  { label: 'Recent', icon: Clock, query: 'show me marks from this week' },
  { label: 'Starred', icon: Star, query: 'show me my starred marks' },
];

export default function AISearch() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your MeMark AI assistant. I search across ALL your saved marks -- titles, content, tags, descriptions, everything.\n\nTry asking me naturally:\n\n- \"that article about AI from last week\"\n- \"cooking videos I saved\"\n- \"tweets about design\"\n- \"anything about productivity\"",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [browserVisible, setBrowserVisible] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedReminderItem, setSelectedReminderItem] = useState<Item | null>(null);
  const [itemReminders, setItemReminders] = useState<Record<string, boolean>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleOpenUrl = (url: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setBrowserUrl(url);
    setBrowserVisible(true);
  };

  const handleCopyUrl = async (item: Item) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const url = item.raw_content?.startsWith('http')
      ? item.raw_content
      : item.raw_content?.match(/https?:\/\/[^\s]+/)?.[0];

    if (url) {
      await Clipboard.setStringAsync(url);
      Alert.alert('Copied!', 'Link copied to clipboard');
    } else {
      Alert.alert('No URL', 'This item does not have a URL to copy');
    }
  };

  const handleSetReminder = (item: Item) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedReminderItem(item);
    setReminderModalVisible(true);
  };

  const handleSelectReminderDate = async (date: Date) => {
    if (!user?.id || !selectedReminderItem) return;

    const { data, error } = await createReminder(user.id, selectedReminderItem.id, date);

    if (error) {
      Alert.alert('Error', 'Failed to set reminder. Please try again.');
      return;
    }

    if (data) {
      setItemReminders(prev => ({ ...prev, [selectedReminderItem.id]: true }));
      Alert.alert(
        'Reminder Set!',
        `You'll be reminded about this on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      );
    }

    setReminderModalVisible(false);
    setSelectedReminderItem(null);
  };

  const isSocialPlatform = (platformType?: string) => {
    return platformType && ['youtube', 'twitter', 'instagram', 'tiktok', 'vimeo', 'facebook'].includes(platformType);
  };

  const hasMedia = (item: Item) => {
    return item.video_url ||
      item.embed_html ||
      item.og_image ||
      (item.media_urls && item.media_urls.length > 0) ||
      (item.carousel_images && item.carousel_images.length > 0);
  };

  const renderItemCard = (item: Item, onPress: () => void, onOpenUrl: (url: string) => void) => {
    const shouldUseSocialEmbed = isSocialPlatform(item.platform_type) && hasMedia(item);

    if (shouldUseSocialEmbed) {
      return (
        <SocialEmbedCard
          item={item}
          onPress={onPress}
          onOpenUrl={onOpenUrl}
          viewMode="list"
        />
      );
    }

    return (
      <ItemCard
        item={item}
        onPress={onPress}
        onOpenUrl={onOpenUrl}
        viewMode="list"
        showActions={true}
        onCopyUrl={handleCopyUrl}
        onSetReminder={handleSetReminder}
        hasReminder={itemReminders[item.id] || false}
      />
    );
  };

  const handleSend = async (overrideQuery?: string) => {
    const query = overrideQuery || input.trim();
    if (!query || !user || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!overrideQuery) setInput('');
    setLoading(true);

    try {
      const searchResults = await searchWithAI(query);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: searchResults.message,
        items: searchResults.items,
        totalResults: searchResults.totalResults,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Let me try a basic search instead.',
        items: [],
      };
      setMessages((prev) => [...prev, errorMessage]);

      try {
        const fallbackResults = await fallbackSearch(query);
        if (fallbackResults.length > 0) {
          const fallbackMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: `I found ${fallbackResults.length} marks using a basic search:`,
            items: fallbackResults,
            totalResults: fallbackResults.length,
          };
          setMessages((prev) => [...prev, fallbackMessage]);
        }
      } catch {
        // silently fail fallback
      }
    } finally {
      setLoading(false);
    }
  };

  const searchWithAI = async (query: string): Promise<{ message: string; items: Item[]; totalResults: number }> => {
    const { data, error } = await supabase.functions.invoke('ai-chat-assistant', {
      body: {
        userId: user!.id,
        message: query,
        sessionId: sessionId,
        includeContext: true,
      },
    });

    if (error) throw error;

    if (data.sessionId && !sessionId) {
      setSessionId(data.sessionId);
    }

    let foundItems: Item[] = [];

    if (data.itemsReferenced && data.itemsReferenced.length > 0) {
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .in('id', data.itemsReferenced)
        .eq('user_id', user!.id);

      if (items) {
        const idOrder = data.itemsReferenced as string[];
        foundItems = items.sort((a: Item, b: Item) => idOrder.indexOf(a.id) - idOrder.indexOf(b.id));
      }
    }

    return {
      message: data.message || "I couldn't find anything matching that description.",
      items: foundItems,
      totalResults: data.totalResults || foundItems.length,
    };
  };

  const fallbackSearch = async (query: string): Promise<Item[]> => {
    const { data, error } = await supabase.rpc('search_user_items', {
      p_user_id: user!.id,
      p_query: query,
      p_limit: 10,
    });

    if (error || !data) return [];
    return data as Item[];
  };

  const handleFilterChip = (query: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    handleSend(query);
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const showFilterChips = messages.length <= 1;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <LogoHeader />

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View key={message.id} style={styles.messageWrapper}>
            <View
              style={[
                styles.messageBubble,
                message.role === 'user'
                  ? { backgroundColor: theme.primary, alignSelf: 'flex-end' }
                  : { backgroundColor: theme.surface, alignSelf: 'flex-start' },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  { color: message.role === 'user' ? '#FFFFFF' : theme.text },
                ]}
              >
                {message.content}
              </Text>
            </View>

            {message.items && message.items.length > 0 && (
              <View style={styles.itemsContainer}>
                {message.totalResults && message.totalResults > message.items.length && (
                  <Text style={[styles.resultCount, { color: theme.textSecondary }]}>
                    Showing {message.items.length} of {message.totalResults} results
                  </Text>
                )}
                {message.items.map((item) => (
                  <View key={item.id}>
                    {renderItemCard(
                      item,
                      () => {
                        setSelectedItem(item);
                        setModalVisible(true);
                      },
                      handleOpenUrl
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {showFilterChips && (
          <View style={styles.filterChipsContainer}>
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>
              Quick searches
            </Text>
            <View style={styles.filterChips}>
              {FILTER_CHIPS.map((chip) => (
                <TouchableOpacity
                  key={chip.label}
                  style={[styles.filterChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => handleFilterChip(chip.query)}
                  activeOpacity={0.7}
                >
                  <chip.icon size={14} color={theme.primary} />
                  <Text style={[styles.filterChipText, { color: theme.text }]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {loading && (
          <View style={[styles.loadingBubble, { backgroundColor: theme.surface }]}>
            <LoadingLogo size={20} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Searching your marks...
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
          placeholder="Search your marks..."
          placeholderTextColor={theme.textTertiary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => handleSend()}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: input.trim() ? theme.primary : theme.border }]}
          onPress={() => handleSend()}
          disabled={!input.trim() || loading}
        >
          <Send size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <LinkPreviewModal
        visible={modalVisible}
        item={selectedItem}
        onClose={() => {
          setModalVisible(false);
          setSelectedItem(null);
        }}
        onUpdate={(updatedItem) => {
          setSelectedItem(updatedItem);
        }}
      />

      <InAppBrowser
        url={browserUrl}
        visible={browserVisible}
        onClose={() => setBrowserVisible(false)}
      />

      <ReminderPickerModal
        visible={reminderModalVisible}
        onClose={() => {
          setReminderModalVisible(false);
          setSelectedReminderItem(null);
        }}
        onSelectDate={handleSelectReminderDate}
        itemTitle={selectedReminderItem?.og_title || selectedReminderItem?.title || selectedReminderItem?.raw_content}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
    gap: 16,
  },
  messageWrapper: {
    gap: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  itemsContainer: {
    gap: 12,
    width: '100%',
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '500',
    paddingLeft: 4,
    paddingBottom: 4,
  },
  filterChipsContainer: {
    gap: 12,
    paddingTop: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  loadingText: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
