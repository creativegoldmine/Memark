import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { X, Crown, Check, Sparkles, Globe, Zap } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
}

export function UpgradeModal({ visible, onClose, feature }: UpgradeModalProps) {
  const { theme } = useTheme();

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  const handleUpgrade = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const features = [
    { icon: Globe, text: 'Public Linktree-style profile' },
    { icon: Sparkles, text: 'Advanced AI categorization' },
    { icon: Zap, text: 'Unlimited items & storage' },
    { icon: Crown, text: 'Dedicated SMS number' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.cardBackground }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={theme.textSecondary} />
          </TouchableOpacity>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
              <Crown size={48} color={theme.primary} />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>Upgrade to Pro</Text>

            {feature && (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {feature} is a Pro feature
              </Text>
            )}

            <View style={styles.featuresContainer}>
              {features.map((item, index) => {
                const Icon = item.icon;
                return (
                  <View key={index} style={styles.featureRow}>
                    <View style={[styles.featureIcon, { backgroundColor: theme.primary + '15' }]}>
                      <Icon size={20} color={theme.primary} />
                    </View>
                    <Text style={[styles.featureText, { color: theme.text }]}>{item.text}</Text>
                    <Check size={20} color={theme.success} />
                  </View>
                );
              })}
            </View>

            <View style={styles.pricingContainer}>
              <View style={[styles.priceCard, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
                <View style={[styles.popularBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
                <Text style={[styles.planName, { color: theme.text }]}>Pro Monthly</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: theme.primary }]}>$9.99</Text>
                  <Text style={[styles.period, { color: theme.textSecondary }]}>/month</Text>
                </View>
                <TouchableOpacity
                  style={[styles.upgradeButton, { backgroundColor: theme.primary }]}
                  onPress={handleUpgrade}
                >
                  <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.priceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.planName, { color: theme.text }]}>Pro Annual</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: theme.primary }]}>$99.99</Text>
                  <Text style={[styles.period, { color: theme.textSecondary }]}>/year</Text>
                </View>
                <Text style={[styles.savings, { color: theme.success }]}>Save 17%</Text>
                <TouchableOpacity
                  style={[styles.upgradeButton, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 2 }]}
                  onPress={handleUpgrade}
                >
                  <Text style={[styles.upgradeButtonTextAlt, { color: theme.primary }]}>Upgrade Now</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.disclaimer, { color: theme.textTertiary }]}>
              Cancel anytime. No commitment required.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
    } : {
      elevation: 8,
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  featuresContainer: {
    gap: 16,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  pricingContainer: {
    gap: 16,
    marginBottom: 24,
  },
  priceCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
  },
  period: {
    fontSize: 16,
    marginLeft: 4,
  },
  savings: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  upgradeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  upgradeButtonTextAlt: {
    fontSize: 16,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
