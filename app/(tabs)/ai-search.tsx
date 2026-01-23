import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Send, Sparkles } from 'lucide-react-native';
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
import { createReminder, getPendingRemindersForItems } from '@/lib/reminders';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  items?: Item[];
}

export default function AISearch() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your MeMark AI assistant. I help you remember things by understanding how you describe them.\n\nTry asking me naturally:\n\n• \"that article about AI from last week\"\n• \"the cooking video I saved\"\n• \"something about productivity\"\n• \"the Twitter post about design\"",
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

  const renderItemCard = (item: Item, onPress: () => void, onOpenUrl: (url: string) => void) => {
    const platformType = (item as any).platform_type;
    const embedHtml = (item as any).embed_html;
    const hasMetadata = item.og_image || item.og_title || item.og_description;

    const shouldUseSocialEmbed = platformType && ['youtube', 'twitter', 'instagram', 'tiktok', 'vimeo', 'facebook'].includes(platformType) && (embedHtml || hasMetadata);

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

  const handleSend = async () => {
    if (!input.trim() || !user || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data: allItems } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      const searchResults = await searchWithAI(input.trim(), allItems || []);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: searchResults.message,
        items: searchResults.items,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error searching your content.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const searchWithAI = async (query: string, items: Item[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-assistant', {
        body: {
          userId: user!.id,
          message: query,
          sessionId: null,
          includeContext: true,
        },
      });

      if (error) {
        throw error;
      }

      const foundItems = data.itemsReferenced
        ? items.filter((item) => data.itemsReferenced.includes(item.id))
        : basicSearch(query, items);

      return {
        message: data.message || "I couldn't find anything matching that description.",
        items: foundItems,
      };
    } catch (error) {
      console.error('AI search error:', error);
      return {
        message: "I had trouble searching. Let me try a basic search instead.",
        items: basicSearch(query, items),
      };
    }
  };

  const basicSearch = (query: string, items: Item[]) => {
    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(' ').filter((w) => w.length > 2);

    const scoredMatches = items.map((item) => {
      const itemData = item as any;
      let score = 0;

      const searchableText = `
        ${item.title || ''}
        ${item.summary || ''}
        ${item.raw_content || ''}
        ${item.tags?.join(' ') || ''}
        ${item.category || ''}
        ${itemData.content_topics?.join(' ') || ''}
        ${itemData.semantic_category || ''}
      `.toLowerCase();

      queryWords.forEach((word) => {
        if (searchableText.includes(word)) {
          score += 1;
        }

        if (itemData.content_topics) {
          itemData.content_topics.forEach((topic: string) => {
            if (topic.toLowerCase().includes(word) || word.includes(topic.toLowerCase())) {
              score += 3;
            }
          });
        }

        if (item.title?.toLowerCase().includes(word)) {
          score += 2;
        }
      });

      return { item, score };
    });

    return scoredMatches
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ item }) => item);
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

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

        {loading && (
          <View style={[styles.messageBubble, { backgroundColor: theme.surface }]}>
            <LoadingLogo size={20} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
          placeholder="Ask me anything..."
          placeholderTextColor={theme.textTertiary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: input.trim() ? theme.primary : theme.border }]}
          onPress={handleSend}
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
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
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
    lineHeight: 20,
  },
  itemsContainer: {
    gap: 12,
    width: '100%',
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
