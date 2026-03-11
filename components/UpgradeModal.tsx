import { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { X, Crown, Check, Sparkles, Globe, Zap, MessageSquare, Users } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { openCheckout, PLAN_PRICES, type PlanType, type BillingCycle } from '@/lib/stripe';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
  defaultPlan?: PlanType;
}

export function UpgradeModal({ visible, onClose, feature, defaultPlan = 'pro' }: UpgradeModalProps) {
  const { theme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(defaultPlan === 'teams' ? 'teams' : 'pro');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loading, setLoading] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  const handleUpgrade = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setLoading(true);
    setNotConfigured(false);

    const { error } = await openCheckout(selectedPlan, billingCycle);

    setLoading(false);

    if (error === 'payment_not_configured') {
      setNotConfigured(true);
      return;
    }

    if (error) {
      Alert.alert('Something went wrong', 'Unable to open checkout. Please try again.');
    } else {
      onClose();
    }
  };

  const proFeatures = [
    { icon: Sparkles, text: 'Unlimited saves & AI processing' },
    { icon: Globe, text: 'Public Linktree-style profile' },
    { icon: Zap, text: 'Daily digest emails & smart reminders' },
    { icon: MessageSquare, text: 'Ask My Library — AI synthesis' },
  ];

  const teamsFeatures = [
    { icon: Users, text: 'Shared team knowledge bases' },
    { icon: Sparkles, text: 'Everything in Pro' },
    { icon: Crown, text: 'Admin controls & team analytics' },
    { icon: Zap, text: 'Priority AI processing' },
  ];

  const features = selectedPlan === 'teams' ? teamsFeatures : proFeatures;
  const paidPlan = selectedPlan as 'pro' | 'teams';
  const price = PLAN_PRICES[paidPlan]?.[billingCycle] ?? 0;
  const annualMonthly = billingCycle === 'annual' ? (price / 12).toFixed(2) : null;
  const annualSavings = billingCycle === 'annual'
    ? Math.round((1 - price / (PLAN_PRICES[paidPlan].monthly * 12)) * 100)
    : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.cardBackground }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={theme.textSecondary} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
              <Crown size={44} color={theme.primary} />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>Unlock Your Full Potential</Text>

            {feature && (
              <View style={[styles.featureGateBadge, { backgroundColor: theme.warning + '15', borderColor: theme.warning + '40' }]}>
                <Text style={[styles.featureGateText, { color: theme.warning }]}>
                  {feature} requires an upgrade
                </Text>
              </View>
            )}

            <View style={[styles.planToggle, { backgroundColor: theme.surface }]}>
              {(['pro', 'teams'] as PlanType[]).map((plan) => (
                <TouchableOpacity
                  key={plan}
                  style={[
                    styles.planToggleBtn,
                    selectedPlan === plan && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setSelectedPlan(plan)}
                >
                  <Text style={[
                    styles.planToggleBtnText,
                    { color: selectedPlan === plan ? '#FFFFFF' : theme.textSecondary },
                  ]}>
                    {plan === 'pro' ? 'Pro' : 'Teams'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.featuresContainer}>
              {features.map((item, index) => {
                const Icon = item.icon;
                return (
                  <View key={index} style={[styles.featureRow, { borderBottomColor: theme.border }]}>
                    <View style={[styles.featureIcon, { backgroundColor: theme.primary + '15' }]}>
                      <Icon size={18} color={theme.primary} />
                    </View>
                    <Text style={[styles.featureText, { color: theme.text }]}>{item.text}</Text>
                    <Check size={16} color={theme.success} />
                  </View>
                );
              })}
            </View>

            <View style={[styles.billingToggle, { backgroundColor: theme.surface }]}>
              {(['monthly', 'annual'] as BillingCycle[]).map((cycle) => (
                <TouchableOpacity
                  key={cycle}
                  style={[
                    styles.billingToggleBtn,
                    billingCycle === cycle && { backgroundColor: theme.cardBackground },
                  ]}
                  onPress={() => setBillingCycle(cycle)}
                >
                  <Text style={[
                    styles.billingToggleBtnText,
                    { color: billingCycle === cycle ? theme.text : theme.textTertiary },
                  ]}>
                    {cycle === 'monthly' ? 'Monthly' : 'Annual'}
                  </Text>
                  {cycle === 'annual' && (
                    <View style={[styles.savingsBadge, { backgroundColor: theme.success + '20' }]}>
                      <Text style={[styles.savingsBadgeText, { color: theme.success }]}>Save {annualSavings}%</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.priceDisplay, { borderColor: theme.primary + '30', backgroundColor: theme.primary + '08' }]}>
              {billingCycle === 'annual' ? (
                <>
                  <Text style={[styles.priceMain, { color: theme.primary }]}>${annualMonthly}</Text>
                  <Text style={[styles.pricePeriod, { color: theme.textSecondary }]}>/mo · billed ${price}/yr</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.priceMain, { color: theme.primary }]}>${price}</Text>
                  <Text style={[styles.pricePeriod, { color: theme.textSecondary }]}>/month</Text>
                </>
              )}
            </View>

            {notConfigured && (
              <View style={[styles.notConfiguredBox, { backgroundColor: theme.warning + '15', borderColor: theme.warning + '40' }]}>
                <Text style={[styles.notConfiguredText, { color: theme.warning }]}>
                  Payment processing is not yet configured. Add your Stripe keys in Supabase Edge Function secrets to enable billing.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: loading ? theme.primary + '80' : theme.primary }]}
              onPress={handleUpgrade}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.upgradeButtonText}>
                  Upgrade to {selectedPlan === 'teams' ? 'Teams' : 'Pro'} →
                </Text>
              )}
            </TouchableOpacity>

            <Text style={[styles.disclaimer, { color: theme.textTertiary }]}>
              Cancel anytime. Secure checkout via Stripe.
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 32,
    gap: 16,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  featureGateBadge: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  featureGateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  planToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  planToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  planToggleBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  featuresContainer: {
    gap: 0,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  billingToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  billingToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  billingToggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  savingsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savingsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  priceDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  priceMain: {
    fontSize: 36,
    fontWeight: '800',
  },
  pricePeriod: {
    fontSize: 15,
  },
  notConfiguredBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  notConfiguredText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  upgradeButton: {
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
  },
});
