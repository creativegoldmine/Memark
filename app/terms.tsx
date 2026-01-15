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

export default function TermsOfService() {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.lastUpdated}>Last Updated: January 15, 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing or using Memark, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.paragraph}>
            Memark is a personal knowledge vault application that allows users to capture, organize, and retrieve links, notes, screenshots, PDFs, and voice memos. Our AI-powered features automatically categorize, summarize, and organize your saved content.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.paragraph}>
            To use Memark, you must create an account by providing accurate and complete information. You are responsible for:
          </Text>
          <Text style={styles.listItem}>• Maintaining the security of your account credentials</Text>
          <Text style={styles.listItem}>• All activities that occur under your account</Text>
          <Text style={styles.listItem}>• Notifying us immediately of any unauthorized access</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. SMS Service</Text>
          <Text style={styles.paragraph}>
            Memark provides SMS-based content saving features. By using this service:
          </Text>
          <Text style={styles.listItem}>• You consent to receive SMS messages from our service number</Text>
          <Text style={styles.listItem}>• Standard message and data rates may apply from your carrier</Text>
          <Text style={styles.listItem}>• Premium subscribers may receive a dedicated phone number</Text>
          <Text style={styles.listItem}>• You can opt out by texting "STOP" or canceling your subscription</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Subscription Plans</Text>
          <Text style={styles.paragraph}>
            Memark offers multiple subscription tiers with different features and limits. By subscribing:
          </Text>
          <Text style={styles.listItem}>• You authorize recurring charges to your payment method</Text>
          <Text style={styles.listItem}>• Subscriptions auto-renew unless canceled before the renewal date</Text>
          <Text style={styles.listItem}>• We reserve the right to modify pricing with 30 days notice</Text>
          <Text style={styles.listItem}>• Refunds are provided according to our refund policy</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. User Content</Text>
          <Text style={styles.paragraph}>
            You retain ownership of all content you save to Memark. By using our service:
          </Text>
          <Text style={styles.listItem}>• You grant us a license to store, process, and display your content</Text>
          <Text style={styles.listItem}>• You are responsible for ensuring you have rights to save content</Text>
          <Text style={styles.listItem}>• You must not upload illegal, harmful, or infringing content</Text>
          <Text style={styles.listItem}>• We may remove content that violates these terms</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. AI Processing</Text>
          <Text style={styles.paragraph}>
            Our AI features process your content to provide categorization, summarization, and search capabilities. We use your content solely to provide these services and do not train external AI models with your private data.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Public Profiles</Text>
          <Text style={styles.paragraph}>
            Premium users can create public profiles to share selected content. When you make content public:
          </Text>
          <Text style={styles.listItem}>• The content becomes visible to anyone with the link</Text>
          <Text style={styles.listItem}>• You can toggle content between public and private at any time</Text>
          <Text style={styles.listItem}>• You remain responsible for the shared content</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Prohibited Uses</Text>
          <Text style={styles.paragraph}>You may not use Memark to:</Text>
          <Text style={styles.listItem}>• Violate any laws or regulations</Text>
          <Text style={styles.listItem}>• Infringe on intellectual property rights</Text>
          <Text style={styles.listItem}>• Upload malicious code or spam</Text>
          <Text style={styles.listItem}>• Attempt to access other users' data</Text>
          <Text style={styles.listItem}>• Use automated systems to scrape or abuse the service</Text>
          <Text style={styles.listItem}>• Resell or redistribute the service without authorization</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Service Availability</Text>
          <Text style={styles.paragraph}>
            We strive to maintain high availability but do not guarantee uninterrupted service. We reserve the right to modify, suspend, or discontinue features with reasonable notice.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            To the maximum extent permitted by law, Memark shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate or suspend your account immediately for violations of these terms. Upon termination, your right to use the service ceases, and we may delete your data according to our data retention policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We may update these Terms of Service periodically. We will notify users of significant changes via email or in-app notification. Continued use after changes constitutes acceptance.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Governing Law</Text>
          <Text style={styles.paragraph}>
            These terms are governed by the laws of the United States. Any disputes shall be resolved in the courts of the jurisdiction where Memark is headquartered.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. Contact Information</Text>
          <Text style={styles.paragraph}>
            For questions about these Terms of Service, please contact us through the Contact page or email{' '}
            <Text style={styles.highlight}>support@memark.com</Text>
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
