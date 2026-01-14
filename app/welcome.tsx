import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Send, Brain, Folder, Search, MessageSquare, Zap, Lock, Globe } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function Welcome() {
  const router = useRouter();
  const { theme } = useTheme();

  const features = [
    {
      icon: Send,
      title: 'Text to Save',
      description: 'Send links and ideas via SMS. Your content is automatically saved and organized.',
    },
    {
      icon: Sparkles,
      title: 'AI Organization',
      description: 'Smart categorization automatically sorts your content into the right collections.',
    },
    {
      icon: Search,
      title: 'AI Recall',
      description: 'Ask questions in natural language and instantly find what you need.',
    },
    {
      icon: Folder,
      title: 'Smart Collections',
      description: 'Organize everything with collections and folders that work the way you think.',
    },
    {
      icon: Globe,
      title: 'Link Previews',
      description: 'Rich previews with titles, descriptions, and images for all your saved links.',
    },
    {
      icon: Lock,
      title: 'Private & Secure',
      description: 'Your data is encrypted and private. Share only what you want, when you want.',
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primary, theme.primaryDark]}
        style={styles.heroGradient}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Image
                source={require('@/assets/images/copy_of_memark.png')}
                style={styles.heroLogo}
                resizeMode="contain"
              />
            </View>
          </View>
          <Text style={styles.heroDescription}>
            Send, save, and actually review your ideas.
            Never lose a link, article, or thought again.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: theme.background }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              How It Works
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Three simple steps to organize your digital life
            </Text>
          </View>

          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>Send Anything</Text>
                <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                  Text a link, paste a URL, or save directly from your browser
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>AI Organizes</Text>
                <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                  Smart AI automatically categorizes and tags your content
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: theme.success }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>Find Instantly</Text>
                <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                  Search naturally or browse collections to rediscover anything
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Powerful Features
            </Text>
          </View>

          <View style={styles.featuresGrid}>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <View
                  key={index}
                  style={[styles.featureCard, { backgroundColor: theme.cardBackground }]}
                >
                  <View style={[styles.featureIconContainer, { backgroundColor: `${theme.primary}15` }]}>
                    <Icon size={24} color={theme.primary} strokeWidth={2} />
                  </View>
                  <Text style={[styles.featureTitle, { color: theme.text }]}>
                    {feature.title}
                  </Text>
                  <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                    {feature.description}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, styles.ctaSection, { backgroundColor: theme.background }]}>
          <View style={[styles.ctaCard, { backgroundColor: theme.primary }]}>
            <Zap size={48} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
            <Text style={styles.ctaDescription}>
              Join thousands of people who never lose track of their ideas again
            </Text>

            <TouchableOpacity
              style={styles.ctaPrimaryButton}
              onPress={() => router.push('/signup')}
            >
              <Text style={[styles.ctaPrimaryButtonText, { color: theme.primary }]}>
                Create Free Account
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ctaSecondaryButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.ctaSecondaryButtonText}>
                Already have an account? Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textTertiary }]}>
            MeMark © 2024
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
  },
  scrollView: {
    flex: 1,
  },
  hero: {
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 60,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logoBackground: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  heroLogo: {
    width: 320,
    height: 72,
  },
  heroDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 400,
  },
  section: {
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    marginBottom: 32,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  stepsContainer: {
    gap: 24,
  },
  step: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    padding: 20,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  ctaSection: {
    paddingVertical: 64,
  },
  ctaCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    gap: 16,
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  ctaPrimaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  ctaPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  ctaSecondaryButton: {
    paddingVertical: 12,
  },
  ctaSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
});
