import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Send, Brain, Folder, Search, Lock, Globe, Check, ArrowRight, Star, Users, Zap, TrendingUp } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function Welcome() {
  const router = useRouter();
  const { theme } = useTheme();

  const features = [
    {
      icon: Send,
      title: 'Text to Save',
      description: 'Send links and ideas via SMS. Instantly saved and organized by AI.',
      gradient: ['#EC4899', '#8B5CF6'],
    },
    {
      icon: Sparkles,
      title: 'AI Organization',
      description: 'Smart categorization that understands context and intent.',
      gradient: ['#8B5CF6', '#3B82F6'],
    },
    {
      icon: Brain,
      title: 'AI Recall',
      description: 'Ask questions naturally and find anything in seconds.',
      gradient: ['#3B82F6', '#06B6D4'],
    },
    {
      icon: Folder,
      title: 'Smart Collections',
      description: 'Auto-organized collections that match how you think.',
      gradient: ['#06B6D4', '#10B981'],
    },
    {
      icon: Globe,
      title: 'Rich Previews',
      description: 'Beautiful previews with images, titles, and summaries.',
      gradient: ['#10B981', '#84CC16'],
    },
    {
      icon: Lock,
      title: 'Private & Secure',
      description: 'Bank-level encryption. Your data belongs to you.',
      gradient: ['#F59E0B', '#EC4899'],
    },
  ];

  const stats = [
    { value: '10K+', label: 'Active Users' },
    { value: '500K+', label: 'Items Saved' },
    { value: '99.9%', label: 'Uptime' },
    { value: '4.9/5', label: 'Rating' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#334155']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroContent}>
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/copy_of_memark.png')}
                style={styles.heroLogo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.heroTitle}>
              Your Second Brain.{'\n'}
              <Text style={styles.heroTitleGradient}>AI-Powered.</Text>
            </Text>

            <Text style={styles.heroSubtitle}>
              Never lose a brilliant idea again. Send anything via text, let AI organize it, and recall it instantly when you need it.
            </Text>

            <View style={styles.heroCTAContainer}>
              <TouchableOpacity
                style={styles.heroPrimaryButton}
                onPress={() => router.push('/signup')}
              >
                <LinearGradient
                  colors={['#EC4899', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.heroPrimaryButtonText}>Start Free Trial</Text>
                  <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroSecondaryButton}
                onPress={() => router.push('/login')}
              >
                <Text style={styles.heroSecondaryButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.trustBadges}>
              <View style={styles.trustBadge}>
                <Star size={16} color="#F59E0B" fill="#F59E0B" strokeWidth={2} />
                <Text style={styles.trustBadgeText}>4.9/5 Rating</Text>
              </View>
              <View style={styles.trustBadge}>
                <Users size={16} color="#10B981" strokeWidth={2} />
                <Text style={styles.trustBadgeText}>10K+ Users</Text>
              </View>
              <View style={styles.trustBadge}>
                <Lock size={16} color="#3B82F6" strokeWidth={2} />
                <Text style={styles.trustBadgeText}>Bank-Level Security</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Section */}
        <View style={[styles.statsSection, { backgroundColor: theme.background }]}>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <Text style={[styles.statValue, { color: theme.primary }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Features Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Zap size={14} color="#F59E0B" strokeWidth={2.5} />
              <Text style={styles.sectionBadgeText}>POWERFUL FEATURES</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Everything You Need{'\n'}In One Place
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Capture, organize, and recall your knowledge with AI-powered intelligence
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
                  <LinearGradient
                    colors={feature.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.featureIconContainer}
                  >
                    <Icon size={28} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
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

        {/* How It Works */}
        <View style={[styles.section, { backgroundColor: theme.background }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <TrendingUp size={14} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.sectionBadgeText}>SIMPLE PROCESS</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Get Started in Seconds
            </Text>
          </View>

          <View style={styles.stepsContainer}>
            <View style={styles.stepCard}>
              <LinearGradient
                colors={['#EC4899', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.stepNumber}
              >
                <Text style={styles.stepNumberText}>1</Text>
              </LinearGradient>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>Sign Up Free</Text>
                <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                  Create your account in 30 seconds. No credit card required.
                </Text>
              </View>
            </View>

            <View style={styles.stepCard}>
              <LinearGradient
                colors={['#8B5CF6', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.stepNumber}
              >
                <Text style={styles.stepNumberText}>2</Text>
              </LinearGradient>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>Send Anything</Text>
                <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                  Text links, ideas, or thoughts. Save from any app with share.
                </Text>
              </View>
            </View>

            <View style={styles.stepCard}>
              <LinearGradient
                colors={['#3B82F6', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.stepNumber}
              >
                <Text style={styles.stepNumberText}>3</Text>
              </LinearGradient>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>AI Does the Rest</Text>
                <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                  Auto-categorized, tagged, and ready to recall instantly.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pricing Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Check size={14} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.sectionBadgeText}>TRANSPARENT PRICING</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Choose Your Plan
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Start free, upgrade anytime. Cancel whenever you want.
            </Text>
          </View>

          <View style={styles.pricingGrid}>
            <View style={[styles.pricingCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.pricingPlanName, { color: theme.text }]}>Basic</Text>
              <View style={styles.pricingPriceContainer}>
                <Text style={[styles.pricingPrice, { color: theme.primary }]}>$9.99</Text>
                <Text style={[styles.pricingPeriod, { color: theme.textSecondary }]}>/mo</Text>
              </View>
              <View style={styles.pricingFeaturesList}>
                <View style={styles.pricingFeature}>
                  <View style={[styles.checkIcon, { backgroundColor: `${theme.success}20` }]}>
                    <Check size={16} color={theme.success} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>1,000 items</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <View style={[styles.checkIcon, { backgroundColor: `${theme.success}20` }]}>
                    <Check size={16} color={theme.success} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>Shared SMS number</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <View style={[styles.checkIcon, { backgroundColor: `${theme.success}20` }]}>
                    <Check size={16} color={theme.success} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>Basic AI features</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <View style={[styles.checkIcon, { backgroundColor: `${theme.success}20` }]}>
                    <Check size={16} color={theme.success} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>Smart search</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.pricingButton, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/signup')}
              >
                <Text style={styles.pricingButtonText}>Get Started</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.pricingCard, styles.pricingCardFeatured]}>
              <LinearGradient
                colors={['#EC4899', '#8B5CF6', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pricingCardGradient}
              >
                <View style={styles.featuredBadge}>
                  <Star size={12} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.featuredBadgeText}>MOST POPULAR</Text>
                </View>
                <Text style={styles.pricingPlanNameFeatured}>Pro</Text>
                <View style={styles.pricingPriceContainer}>
                  <Text style={styles.pricingPriceFeatured}>$19.99</Text>
                  <Text style={styles.pricingPeriodFeatured}>/mo</Text>
                </View>
                <View style={styles.pricingFeaturesList}>
                  <View style={styles.pricingFeature}>
                    <View style={styles.checkIconWhite}>
                      <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                    <Text style={styles.pricingFeatureTextFeatured}>Unlimited items</Text>
                  </View>
                  <View style={styles.pricingFeature}>
                    <View style={styles.checkIconWhite}>
                      <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                    <Text style={styles.pricingFeatureTextFeatured}>Dedicated SMS number</Text>
                  </View>
                  <View style={styles.pricingFeature}>
                    <View style={styles.checkIconWhite}>
                      <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                    <Text style={styles.pricingFeatureTextFeatured}>Advanced AI agents</Text>
                  </View>
                  <View style={styles.pricingFeature}>
                    <View style={styles.checkIconWhite}>
                      <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                    <Text style={styles.pricingFeatureTextFeatured}>Smart reminders</Text>
                  </View>
                  <View style={styles.pricingFeature}>
                    <View style={styles.checkIconWhite}>
                      <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                    <Text style={styles.pricingFeatureTextFeatured}>Export to X & Notion</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.pricingButtonFeatured}
                  onPress={() => router.push('/signup')}
                >
                  <Text style={styles.pricingButtonTextFeatured}>Get Started</Text>
                  <ArrowRight size={18} color="#8B5CF6" strokeWidth={2.5} />
                </TouchableOpacity>
              </LinearGradient>
            </View>

            <View style={[styles.pricingCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.pricingPlanName, { color: theme.text }]}>Enterprise</Text>
              <View style={styles.pricingPriceContainer}>
                <Text style={[styles.pricingPrice, { color: theme.primary }]}>$29.99</Text>
                <Text style={[styles.pricingPeriod, { color: theme.textSecondary }]}>/mo</Text>
              </View>
              <View style={styles.pricingFeaturesList}>
                <View style={styles.pricingFeature}>
                  <View style={[styles.checkIcon, { backgroundColor: `${theme.success}20` }]}>
                    <Check size={16} color={theme.success} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>Everything in Pro</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <View style={[styles.checkIcon, { backgroundColor: `${theme.success}20` }]}>
                    <Check size={16} color={theme.success} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>Team collaboration</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <View style={[styles.checkIcon, { backgroundColor: `${theme.success}20` }]}>
                    <Check size={16} color={theme.success} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>Custom integrations</Text>
                </View>
                <View style={styles.pricingFeature}>
                  <View style={[styles.checkIcon, { backgroundColor: `${theme.success}20` }]}>
                    <Check size={16} color={theme.success} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.pricingFeatureText, { color: theme.text }]}>Priority support</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.pricingButton, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/signup')}
              >
                <Text style={styles.pricingButtonText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <LinearGradient
          colors={['#EC4899', '#8B5CF6', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaSection}
        >
          <View style={styles.ctaContent}>
            <Sparkles size={56} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.ctaTitle}>Ready to Never Forget?</Text>
            <Text style={styles.ctaDescription}>
              Join thousands who've transformed how they capture and recall knowledge
            </Text>

            <TouchableOpacity
              style={styles.ctaPrimaryButton}
              onPress={() => router.push('/signup')}
            >
              <Text style={styles.ctaPrimaryButtonText}>Start Free Trial</Text>
              <ArrowRight size={20} color="#8B5CF6" strokeWidth={2.5} />
            </TouchableOpacity>

            <Text style={styles.ctaFootnote}>
              No credit card required • Cancel anytime • 14-day free trial
            </Text>
          </View>
        </LinearGradient>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          <View style={styles.footerLogoContainer}>
            <Image
              source={require('@/assets/images/copy_of_memark.png')}
              style={styles.footerLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.footerLinks}>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: theme.textSecondary }]}>Terms</Text>
            </TouchableOpacity>
            <Text style={[styles.footerDivider, { color: theme.textTertiary }]}>•</Text>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: theme.textSecondary }]}>Privacy</Text>
            </TouchableOpacity>
            <Text style={[styles.footerDivider, { color: theme.textTertiary }]}>•</Text>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: theme.textSecondary }]}>Contact</Text>
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
  scrollView: {
    flex: 1,
  },
  hero: {
    paddingTop: 80,
    paddingBottom: 80,
    paddingHorizontal: 24,
  },
  heroContent: {
    alignItems: 'center',
  },
  logoContainer: {
    backgroundColor: '#000000',
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderRadius: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  heroLogo: {
    width: 320,
    height: 72,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 52,
  },
  heroTitleGradient: {
    color: '#EC4899',
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 600,
    marginBottom: 40,
  },
  heroCTAContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroPrimaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 8,
  },
  heroPrimaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSecondaryButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroSecondaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trustBadges: {
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  trustBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsSection: {
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 32,
  },
  statCard: {
    alignItems: 'center',
    minWidth: 100,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    marginBottom: 48,
    alignItems: 'center',
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 44,
  },
  sectionSubtitle: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 600,
  },
  featuresGrid: {
    gap: 20,
  },
  featureCard: {
    padding: 28,
    borderRadius: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  featureDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  stepsContainer: {
    gap: 24,
  },
  stepCard: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stepNumberText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
    paddingTop: 8,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  pricingGrid: {
    gap: 24,
  },
  pricingCard: {
    padding: 32,
    borderRadius: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  pricingCardFeatured: {
    borderWidth: 0,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  pricingCardGradient: {
    padding: 32,
    borderRadius: 24,
    gap: 20,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  pricingPlanName: {
    fontSize: 24,
    fontWeight: '800',
  },
  pricingPlanNameFeatured: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pricingPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  pricingPrice: {
    fontSize: 48,
    fontWeight: '900',
  },
  pricingPriceFeatured: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pricingPeriod: {
    fontSize: 18,
    fontWeight: '600',
  },
  pricingPeriodFeatured: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  pricingFeaturesList: {
    gap: 14,
  },
  pricingFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIconWhite: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pricingFeatureText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  pricingFeatureTextFeatured: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    color: '#FFFFFF',
  },
  pricingButton: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  pricingButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  pricingButtonFeatured: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  pricingButtonTextFeatured: {
    fontSize: 17,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  ctaSection: {
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  ctaContent: {
    alignItems: 'center',
    gap: 20,
  },
  ctaTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 500,
    marginBottom: 12,
  },
  ctaPrimaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaPrimaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  ctaFootnote: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 24,
  },
  footerLogoContainer: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  footerLogo: {
    width: 180,
    height: 40,
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
    fontWeight: '600',
  },
  footerDivider: {
    fontSize: 14,
  },
  footerCopyright: {
    fontSize: 13,
    marginTop: 8,
  },
});
