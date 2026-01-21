import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { MessageCircle, Send, X, Sparkles } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatAssistantProps {
  visible: boolean;
  onClose: () => void;
}

export function AIChatAssistant({ visible, onClose }: AIChatAssistantProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hi! I'm your Memark AI Assistant. I can help you:\n\n- Find specific marks using natural language\n- Answer questions about Memark features\n- Provide insights about your saved content\n- Suggest ways to organize your knowledge vault\n\nWhat would you like to know?",
          timestamp: new Date(),
        },
      ]);
      loadInitialSuggestions();
    }
  }, [visible]);

  const loadInitialSuggestions = () => {
    setSuggestions([
      'Show me my coding content',
      'What topics do I save most?',
      'Find recent educational marks',
      'How do folders work?',
    ]);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-assistant', {
        body: {
          userId: user.id,
          message: text,
          sessionId,
          includeContext: true,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      if (data.sessionId) setSessionId(data.sessionId);
      if (data.suggestions) setSuggestions(data.suggestions);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble responding right now. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm your Memark AI Assistant. What would you like to know?",
        timestamp: new Date(),
      },
    ]);
    setSessionId(null);
    loadInitialSuggestions();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <Sparkles size={24} color={theme.primary} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>AI Assistant</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={clearChat} style={styles.headerButton}>
              <Text style={[styles.clearText, { color: theme.primary }]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <X size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={[styles.messagesContainer, { backgroundColor: theme.background }]}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(message => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === 'user'
                  ? [styles.userBubble, { backgroundColor: theme.primary }]
                  : [styles.assistantBubble, { backgroundColor: theme.cardBackground, borderColor: theme.border }],
              ]}
            >
              {message.role === 'assistant' && (
                <View style={[styles.assistantIcon, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <Sparkles size={16} color={theme.primary} />
                </View>
              )}
              <Text
                style={[
                  styles.messageText,
                  message.role === 'user'
                    ? styles.userText
                    : [styles.assistantText, { color: theme.text }],
                ]}
              >
                {message.content}
              </Text>
            </View>
          ))}

          {loading && (
            <View style={[styles.loadingContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Thinking...</Text>
            </View>
          )}

          {suggestions.length > 0 && !loading && (
            <View style={styles.suggestionsContainer}>
              <Text style={[styles.suggestionsTitle, { color: theme.textTertiary }]}>Suggestions:</Text>
              {suggestions.map((suggestion, index) => (
                <Pressable
                  key={index}
                  style={[styles.suggestionChip, { backgroundColor: theme.surface, borderColor: theme.primary }]}
                  onPress={() => handleSuggestionPress(suggestion)}
                >
                  <Text style={[styles.suggestionText, { color: theme.primary }]}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
            placeholder="Ask me anything..."
            placeholderTextColor={theme.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => sendMessage(inputText)}
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: theme.primary },
              (!inputText.trim() || loading) && [styles.sendButtonDisabled, { backgroundColor: theme.surface }]
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || loading}
          >
            <Send size={20} color={inputText.trim() && !loading ? '#fff' : theme.textTertiary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function AIChatButton({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity style={[styles.floatingButton, { backgroundColor: theme.primary }]} onPress={onPress}>
      <Sparkles size={24} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 80,
  },
  messageBubble: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  assistantIcon: {
    position: 'absolute',
    top: -8,
    left: -8,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {},
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    marginTop: 16,
    gap: 8,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {},
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
