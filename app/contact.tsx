import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Mail, MessageSquare, Send } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function ContactUs() {
  const router = useRouter();
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      if (Platform.OS === 'web') {
        alert('Please fill in all fields');
      } else {
        Alert.alert('Error', 'Please fill in all fields');
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const response = {
        name,
        email,
        subject,
        message,
        timestamp: new Date().toISOString(),
      };

      console.log('Contact form submission:', response);

      if (Platform.OS === 'web') {
        alert('Thank you for contacting us! We will respond within 24 hours.');
      } else {
        Alert.alert(
          'Message Sent',
          'Thank you for contacting us! We will respond within 24 hours.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }

      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (error) {
      console.error('Error submitting contact form:', error);
      if (Platform.OS === 'web') {
        alert('Failed to send message. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 20,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
    },
    scrollContent: {
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 32,
      lineHeight: 24,
    },
    contactMethod: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    contactIcon: {
      marginRight: 12,
    },
    contactInfo: {
      flex: 1,
    },
    contactLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    contactValue: {
      fontSize: 16,
      fontWeight: '600',
      color: '#8B5CF6',
    },
    formSection: {
      marginTop: 32,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.text,
    },
    textArea: {
      height: 150,
      textAlignVertical: 'top',
    },
    submitButton: {
      backgroundColor: '#8B5CF6',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      marginTop: 8,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginRight: 8,
    },
    infoSection: {
      marginTop: 32,
      padding: 20,
      backgroundColor: theme.surface,
      borderRadius: 12,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    infoText: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 22,
      marginBottom: 8,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style={theme.statusBar} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Get in Touch</Text>
        <Text style={styles.subtitle}>
          Have questions, feedback, or need support? We're here to help!
        </Text>

        <View style={styles.contactMethod}>
          <Mail size={24} color="#8B5CF6" style={styles.contactIcon} />
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Email Support</Text>
            <Text style={styles.contactValue}>support@memark.com</Text>
          </View>
        </View>

        <View style={styles.contactMethod}>
          <MessageSquare size={24} color="#8B5CF6" style={styles.contactIcon} />
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>General Inquiries</Text>
            <Text style={styles.contactValue}>hello@memark.com</Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Send us a Message</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="What's this about?"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us more..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={6}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </Text>
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Response Time</Text>
          <Text style={styles.infoText}>
            We typically respond to all inquiries within 24 hours during business days. For urgent matters, please mark your subject line with "URGENT".
          </Text>
          <Text style={styles.infoText}>
            For account-specific issues, please include your email address or username to help us assist you faster.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
