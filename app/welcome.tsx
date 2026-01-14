import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Send, Brain, Folder, Search, MessageSquare, Zap, Lock, Globe, Check } from 'lucide-react-native';
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
      <View style={styles.heroBackground} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/copy_of_memark.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.heroDescription, { color: '#FFFFFF' }]}>
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
                <Text style={[styles.stepTitle, { color: theme.text }]}>Sign Up Free</Text>
                <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                  Create your account in seconds and get your personal phone number
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>Send Anything</Text>
                <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                  Text links, paste URLs, or save directly from your browser
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: theme.success }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>AI Organizes & Recall</Text>
                <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                  Auto-categorization and smart search to find anything instantly
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

        <View style={[styles.section, { backgroundColor: theme.background }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Simple Pricing
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Choose the plan that fits your needs
            </Text>
          </View>

          <View style={styles.pricingGrid}>
            <View style={[styles.pricingCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.pricingPlanName, { color: theme.text }]}>Basic</Text>
              <View style={styles.pricingPriceContainer}>
                <Text style={[styles.pricingPrice, { color: theme.primary }]}>$9.99</Text>
                <Text style={[styles.pricingPeriod, { color: theme.textSecondary }]}>/month</Text>
              </View>
              <View style={styles.pricingFeaturesList}>
                <View style={styles.pricingFeature}>
                  <Check size={20} color={theme.success} strokeWidth={2} />
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>1,000 items</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <Check size={20} color={theme.success} strokeWidth={2} />
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>Shared SMS number</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <Check size={20} color={theme.success} strokeWidth={2} />
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>Basic AI features</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <Check size={20} color={theme.success} strokeWidth={2} />
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>Smart search</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.pricingButton, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/signup')}
              >
                <Text style={styles.pricingButtonText}>Start Free Trial</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.pricingCard, styles.pricingCardFeatured, { backgroundColor: theme.primary }]}>
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>POPULAR</Text>
              </View>
              <Text style={styles.pricingPlanNameFeatured}>Pro</Text>
              <View style={styles.pricingPriceContainer}>
                <Text style={styles.pricingPriceFeatured}>$19.99</Text>
                <Text style={styles.pricingPeriodFeatured}>/month</Text>
              </View>
              <View style={styles.pricingFeaturesList}>
                <View style={styles.pricingFeature}>
                  <Check size={20} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.pricingFeatureTextFeatured}>Unlimited items</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <Check size={20} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.pricingFeatureTextFeatured}>Dedicated SMS number</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <Check size={20} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.pricingFeatureTextFeatured}>Advanced AI agents</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <Check size={20} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.pricingFeatureTextFeatured}>Smart reminders</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <Check size={20} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.pricingFeatureTextFeatured}>Export to X & Notion</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.pricingButtonFeatured}
                onPress={() => router.push('/signup')}
              >
                <Text style={[styles.pricingButtonTextFeatured, { color: theme.primary }]}>Start Free Trial</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.pricingCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.pricingPlanName, { color: theme.text }]}>Enterprise</Text>
              <View style={styles.pricingPriceContainer}>
                <Text style={[styles.pricingPrice, { color: theme.primary }]}>$29.99</Text>
                <Text style={[styles.pricingPeriod, { color: theme.textSecondary }]}>/month</Text>
              </View>
              <View style={styles.pricingFeaturesList}>
                <View style={styles.pricingFeature}>
                  <Check size={20} color={theme.success} strokeWidth={2} />
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>Everything in Pro</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <Check size={20} color={theme.success} strokeWidth={2} />
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>Team collaboration</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <Check size={20} color={theme.success} strokeWidth={2} />
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>Custom integrations</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <Check size={20} color={theme.success} strokeWidth={2} />
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>Priority support</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.pricingButton, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/signup')}
              >
                <Text style={styles.pricingButtonText}>Start Free Trial</Text>
              </TouchableOpacity>
            </View>
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
          <Image
            source={require('@/assets/images/copy_of_memark.png')}
            style={styles.footerLogo}
            resizeMode="contain"
          />

          <View style={styles.footerLinks}>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: theme.textSecondary }]}>
                Terms of Service
              </Text>
            </TouchableOpacity>
            <Text style={[styles.footerDivider, { color: theme.textTertiary }]}>•</Text>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: theme.textSecondary }]}>
                Privacy Policy
              </Text>
            </TouchableOpacity>
            <Text style={[styles.footerDivider, { color: theme.textTertiary }]}>•</Text>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: theme.textSecondary }]}>
                Contact
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.footerCopyright, { color: theme.textTertiary }]}>
            © 2024 MeMark. All rights reserved.
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
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#000000',
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  heroLogo: {
    width: 380,
    height: 85,
  },
  heroDescription: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 500,
    fontWeight: '500',
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
  pricingGrid: {
    gap: 20,
  },
  pricingCard: {
    padding: 28,
    borderRadius: 20,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  pricingCardFeatured: {
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ scale: 1.02 }],
  },
  featuredBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pricingPlanName: {
    fontSize: 22,
    fontWeight: '700',
  },
  pricingPlanNameFeatured: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pricingPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pricingPrice: {
    fontSize: 40,
    fontWeight: '800',
  },
  pricingPriceFeatured: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pricingPeriod: {
    fontSize: 16,
  },
  pricingPeriodFeatured: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  pricingFeaturesList: {
    gap: 12,
  },
  pricingFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pricingFeatureText: {
    fontSize: 15,
    flex: 1,
  },
  pricingFeatureTextFeatured: {
    fontSize: 15,
    flex: 1,
    color: '#FFFFFF',
  },
  pricingButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  pricingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pricingButtonFeatured: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  pricingButtonTextFeatured: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 24,
  },
  footerLogo: {
    width: 180,
    height: 40,
    marginBottom: 8,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerDivider: {
    fontSize: 14,
  },
  footerCopyright: {
    fontSize: 13,
    marginTop: 8,
  },
});
