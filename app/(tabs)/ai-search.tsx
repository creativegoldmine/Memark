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
  ActivityIndicator,
} from 'react-native';
import { Send, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Item } from '@/lib/supabase';
import { ItemCard } from '@/components/ItemCard';
import { LogoHeader } from '@/components/LogoHeader';

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
      content: "Hi! I'm your MeMark AI assistant. Ask me to find anything you've saved, like:\n\n• \"Find that coding course I saved\"\n• \"Show me articles about design\"\n• \"What videos did I save last week?\"\n• \"Find links about productivity\"",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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
    const lowerQuery = query.toLowerCase();

    const matches = items.filter((item) => {
      const searchText = `${item.title} ${item.summary} ${item.raw_content} ${item.tags?.join(' ')} ${item.category}`.toLowerCase();
      const queryWords = lowerQuery.split(' ').filter((w) => w.length > 2);
      return queryWords.some((word) => searchText.includes(word));
    });

    if (matches.length === 0) {
      return {
        message: "I couldn't find anything matching that. Try different keywords or check your saved content.",
        items: [],
      };
    }

    const categories = [...new Set(matches.map((i) => i.type))].join(', ');
    const message =
      matches.length === 1
        ? `I found 1 ${matches[0].type} that matches your search:`
        : `I found ${matches.length} items matching your search (${categories}):`;

    return {
      message,
      items: matches.slice(0, 10),
    };
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
      <LogoHeader pageTitle="AI SEARCH" />

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
                  <ItemCard key={item.id} item={item} onPress={() => {}} />
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
    padding: 20,
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
