import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function PrivacyPolicy() {
  const router = useRouter();
  const { theme } = useTheme();

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
    lastUpdated: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 24,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    paragraph: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.textSecondary,
      marginBottom: 12,
    },
    listItem: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.textSecondary,
      marginBottom: 8,
      paddingLeft: 16,
    },
    highlight: {
      color: '#8B5CF6',
      fontWeight: '600',
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last Updated: January 15, 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.paragraph}>
            Memark respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, store, and protect your information when you use our service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect several types of information to provide and improve our service:
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.highlight}>Account Information:</Text>
          </Text>
          <Text style={styles.listItem}>• Email address</Text>
          <Text style={styles.listItem}>• Phone number (for SMS features)</Text>
          <Text style={styles.listItem}>• Display name and username</Text>
          <Text style={styles.listItem}>• Profile picture (optional)</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.highlight}>Content You Save:</Text>
          </Text>
          <Text style={styles.listItem}>• Links, notes, screenshots, PDFs, voice memos</Text>
          <Text style={styles.listItem}>• Categories, collections, and tags</Text>
          <Text style={styles.listItem}>• Metadata extracted from saved content</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.highlight}>Usage Information:</Text>
          </Text>
          <Text style={styles.listItem}>• Device information (model, OS version)</Text>
          <Text style={styles.listItem}>• App interactions and feature usage</Text>
          <Text style={styles.listItem}>• Search queries and AI interactions</Text>
          <Text style={styles.listItem}>• Performance and error logs</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.highlight}>Communication Data:</Text>
          </Text>
          <Text style={styles.listItem}>• SMS messages sent to our service</Text>
          <Text style={styles.listItem}>• Customer support interactions</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.paragraph}>We use your information to:</Text>
          <Text style={styles.listItem}>• Provide and maintain the Memark service</Text>
          <Text style={styles.listItem}>• Process and organize your saved content</Text>
          <Text style={styles.listItem}>• Generate AI-powered categorization, summaries, and insights</Text>
          <Text style={styles.listItem}>• Send you spaced repetition reminders and digests</Text>
          <Text style={styles.listItem}>• Process payments and manage subscriptions</Text>
          <Text style={styles.listItem}>• Send important service notifications</Text>
          <Text style={styles.listItem}>• Improve our service and develop new features</Text>
          <Text style={styles.listItem}>• Prevent fraud and ensure security</Text>
          <Text style={styles.listItem}>• Comply with legal obligations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Storage and Security</Text>
          <Text style={styles.paragraph}>
            Your data is stored securely using industry-standard practices:
          </Text>
          <Text style={styles.listItem}>• All data is encrypted in transit (TLS/SSL)</Text>
          <Text style={styles.listItem}>• Database encryption at rest</Text>
          <Text style={styles.listItem}>• Row-level security ensures users only access their own data</Text>
          <Text style={styles.listItem}>• Regular security audits and updates</Text>
          <Text style={styles.listItem}>• Secure data centers with physical security measures</Text>
          <Text style={styles.paragraph}>
            We use Supabase for database hosting and Twilio for SMS services, both of which maintain SOC 2 Type II compliance.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. AI Processing</Text>
          <Text style={styles.paragraph}>
            We use AI services to process your content for categorization, summarization, and search. Important points:
          </Text>
          <Text style={styles.listItem}>• Your private content is not used to train third-party AI models</Text>
          <Text style={styles.listItem}>• AI processing occurs in real-time and data is not retained by AI providers</Text>
          <Text style={styles.listItem}>• You can opt out of AI features in your settings</Text>
          <Text style={styles.listItem}>• Public profile content may be visible to others but is still not used for training</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Data Sharing</Text>
          <Text style={styles.paragraph}>
            We do not sell your personal data. We share data only in limited circumstances:
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.highlight}>With Your Consent:</Text>
          </Text>
          <Text style={styles.listItem}>• When you create a public profile and choose to share content</Text>
          <Text style={styles.listItem}>• When you export content to third-party services (X, Notion, etc.)</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.highlight}>Service Providers:</Text>
          </Text>
          <Text style={styles.listItem}>• Payment processing (Stripe)</Text>
          <Text style={styles.listItem}>• SMS delivery (Twilio)</Text>
          <Text style={styles.listItem}>• Database hosting (Supabase)</Text>
          <Text style={styles.listItem}>• AI processing (OpenAI, Grok)</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.highlight}>Legal Requirements:</Text>
          </Text>
          <Text style={styles.listItem}>• When required by law or legal process</Text>
          <Text style={styles.listItem}>• To protect our rights, property, or safety</Text>
          <Text style={styles.listItem}>• To prevent fraud or security threats</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Your Rights and Choices</Text>
          <Text style={styles.paragraph}>You have the following rights regarding your data:</Text>
          <Text style={styles.listItem}>• Access: Request a copy of your personal data</Text>
          <Text style={styles.listItem}>• Correction: Update or correct your information</Text>
          <Text style={styles.listItem}>• Deletion: Request deletion of your account and data</Text>
          <Text style={styles.listItem}>• Export: Download your data in a portable format</Text>
          <Text style={styles.listItem}>• Opt-out: Disable SMS notifications or AI processing</Text>
          <Text style={styles.listItem}>• Object: Object to certain data processing activities</Text>
          <Text style={styles.paragraph}>
            To exercise these rights, visit your Settings page or contact us at{' '}
            <Text style={styles.highlight}>privacy@memark.com</Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your data for as long as your account is active. When you delete your account:
          </Text>
          <Text style={styles.listItem}>• Your content is immediately made inaccessible</Text>
          <Text style={styles.listItem}>• Data is permanently deleted within 30 days</Text>
          <Text style={styles.listItem}>• Some data may be retained for legal compliance (e.g., billing records)</Text>
          <Text style={styles.listItem}>• Backup systems may retain data for up to 90 days</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Cookies and Tracking</Text>
          <Text style={styles.paragraph}>
            We use essential cookies and tracking technologies to:
          </Text>
          <Text style={styles.listItem}>• Maintain your login session</Text>
          <Text style={styles.listItem}>• Remember your preferences</Text>
          <Text style={styles.listItem}>• Analyze app usage and performance</Text>
          <Text style={styles.listItem}>• Prevent fraud and improve security</Text>
          <Text style={styles.paragraph}>
            You can disable non-essential tracking in your browser or device settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Memark is not intended for users under 13 years of age. We do not knowingly collect data from children. If we discover that we have collected data from a child under 13, we will delete it promptly.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. International Data Transfers</Text>
          <Text style={styles.paragraph}>
            Your data may be transferred to and stored in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy and applicable law.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy periodically. We will notify you of significant changes via email or in-app notification. The "Last Updated" date at the top indicates when the policy was last revised.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions about this Privacy Policy or our data practices, please contact us:
          </Text>
          <Text style={styles.listItem}>• Email: <Text style={styles.highlight}>privacy@memark.com</Text></Text>
          <Text style={styles.listItem}>• Support: <Text style={styles.highlight}>support@memark.com</Text></Text>
          <Text style={styles.listItem}>• Contact page: Available in the app</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. GDPR Compliance (EU Users)</Text>
          <Text style={styles.paragraph}>
            If you are in the European Union, you have additional rights under GDPR:
          </Text>
          <Text style={styles.listItem}>• Right to data portability</Text>
          <Text style={styles.listItem}>• Right to restriction of processing</Text>
          <Text style={styles.listItem}>• Right to lodge a complaint with a supervisory authority</Text>
          <Text style={styles.paragraph}>
            Our lawful basis for processing is typically consent or contract performance. Contact us to exercise your GDPR rights.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. California Privacy Rights (CCPA)</Text>
          <Text style={styles.paragraph}>
            California residents have specific privacy rights including:
          </Text>
          <Text style={styles.listItem}>• Right to know what personal information is collected</Text>
          <Text style={styles.listItem}>• Right to delete personal information</Text>
          <Text style={styles.listItem}>• Right to opt-out of sale (we do not sell data)</Text>
          <Text style={styles.listItem}>• Right to non-discrimination for exercising rights</Text>
          <Text style={styles.paragraph}>
            Contact <Text style={styles.highlight}>privacy@memark.com</Text> to exercise your CCPA rights.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
