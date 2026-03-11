import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageSquare, Sparkles, Brain, Copy, Check, ArrowRight, Loader } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';

const MEMARK_NUMBER = '+18623553847';
const MEMARK_NUMBER_DISPLAY = '+1 (862) 355-3847';

type Step = 'welcome' | 'copy' | 'waiting' | 'success';

export default function Onboarding() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [copied, setCopied] = useState(false);
  const [firstItemId, setFirstItemId] = useState<string | null>(null);
  const [dotAnim] = useState([new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === 'waiting') {
      startDotAnimation();
      startPulseAnimation();
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [step, user?.id]);

  const startDotAnimation = () => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ).start();

    animate(dotAnim[0], 0);
    animate(dotAnim[1], 200);
    animate(dotAnim[2], 400);
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  };

  const startPolling = () => {
    if (!user?.id) return;
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('items')
        .select('id, title, type, processing_status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setFirstItemId(data[0].id);
        setStep('success');
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(MEMARK_NUMBER);
    setCopied(true);
    if (Platform.OS !== 'web') {
      const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');
      impactAsync(ImpactFeedbackStyle.Medium);
    }
    setTimeout(() => {
      setStep('waiting');
    }, 1200);
  };

  const handleFinish = () => {
    router.replace('/(tabs)');
  };

  if (step === 'welcome') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <View style={[styles.heroIcon, { backgroundColor: theme.primary }]}>
            <Brain size={56} color="#FFFFFF" />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>
            Your Second Brain
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
            Memark remembers everything so you don't have to. Text any link, article, or idea — AI organizes it and reminds you to revisit what matters.
          </Text>

          <View style={styles.featureList}>
            {[
              { icon: MessageSquare, text: 'Save anything via SMS — no app switching' },
              { icon: Sparkles, text: 'AI auto-categorizes, summarizes, and tags' },
              { icon: Brain, text: 'Spaced repetition ensures you never forget' },
            ].map(({ icon: Icon, text }, i) => (
              <View key={i} style={[styles.featureItem, { backgroundColor: theme.surface }]}>
                <View style={[styles.featureItemIcon, { backgroundColor: theme.primary + '20' }]}>
                  <Icon size={20} color={theme.primary} />
                </View>
                <Text style={[styles.featureItemText, { color: theme.text }]}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
          onPress={() => setStep('copy')}
        >
          <Text style={styles.primaryBtnText}>Get Started</Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleFinish}>
          <Text style={[styles.skipText, { color: theme.textTertiary }]}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'copy') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <View style={[styles.stepBadge, { backgroundColor: theme.primary + '15' }]}>
            <Text style={[styles.stepBadgeText, { color: theme.primary }]}>STEP 1 OF 2</Text>
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>
            Save your Memark number
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
            This single number is how you save everything. Copy it now and add it to your contacts as "Memark".
          </Text>

          <View style={[styles.numberCard, { backgroundColor: theme.cardBackground, borderColor: theme.primary + '40' }]}>
            <Text style={[styles.numberLabel, { color: theme.textTertiary }]}>YOUR MEMARK NUMBER</Text>
            <Text style={[styles.numberDisplay, { color: theme.primary }]}>{MEMARK_NUMBER_DISPLAY}</Text>
            <Text style={[styles.numberHint, { color: theme.textSecondary }]}>
              Shared with all Memark users. Your phone number identifies your account — 100% private.
            </Text>
          </View>

          <View style={styles.instructionList}>
            {[
              'Copy the number below',
              'Open Messages and paste as recipient',
              'Send any link or thought',
            ].map((text, i) => (
              <View key={i} style={styles.instructionItem}>
                <View style={[styles.instructionNum, { backgroundColor: theme.primary }]}>
                  <Text style={styles.instructionNumText}>{i + 1}</Text>
                </View>
                <Text style={[styles.instructionText, { color: theme.textSecondary }]}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: copied ? theme.success : theme.primary }]}
          onPress={handleCopy}
        >
          {copied ? (
            <>
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Copied! Opening your vault...</Text>
            </>
          ) : (
            <>
              <Copy size={20} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Copy {MEMARK_NUMBER_DISPLAY}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleFinish}>
          <Text style={[styles.skipText, { color: theme.textTertiary }]}>I'll do this later</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'waiting') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <View style={[styles.stepBadge, { backgroundColor: theme.primary + '15' }]}>
            <Text style={[styles.stepBadgeText, { color: theme.primary }]}>STEP 2 OF 2</Text>
          </View>

          <Animated.View style={[styles.waitingIconContainer, { backgroundColor: theme.primary + '15', transform: [{ scale: pulseAnim }] }]}>
            <MessageSquare size={52} color={theme.primary} />
          </Animated.View>

          <Text style={[styles.heroTitle, { color: theme.text }]}>
            Waiting for your first save...
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
            Paste{' '}
            <Text style={{ fontWeight: '700', color: theme.primary }}>{MEMARK_NUMBER_DISPLAY}</Text>
            {' '}into Messages, send any link, and watch the magic happen.
          </Text>

          <View style={[styles.waitingDots, { backgroundColor: theme.surface }]}>
            <Text style={[styles.waitingLabel, { color: theme.textSecondary }]}>Listening for your SMS</Text>
            <View style={styles.dotsRow}>
              {dotAnim.map((anim, i) => (
                <Animated.View
                  key={i}
                  style={[styles.dot, { backgroundColor: theme.primary, opacity: anim }]}
                />
              ))}
            </View>
          </View>

          <View style={[styles.exampleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.exampleLabel, { color: theme.textTertiary }]}>Try texting one of these:</Text>
            {[
              'https://youtube.com/... (any YouTube video)',
              'https://twitter.com/... (any tweet)',
              'Just a thought you want to remember',
            ].map((ex, i) => (
              <View key={i} style={styles.exampleRow}>
                <Text style={[styles.exampleBullet, { color: theme.primary }]}>›</Text>
                <Text style={[styles.exampleText, { color: theme.textSecondary }]}>{ex}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: theme.border }]}
          onPress={handleFinish}
        >
          <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>Go to my vault — I'll text later</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={[styles.successIcon, { backgroundColor: theme.success + '20' }]}>
          <Check size={56} color={theme.success} />
        </View>
        <Text style={[styles.heroTitle, { color: theme.text }]}>
          Your first mark is in!
        </Text>
        <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
          AI is categorizing and summarizing it now. This is your knowledge vault working exactly as designed.
        </Text>

        <View style={[styles.successInfo, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Sparkles size={20} color={theme.primary} />
          <Text style={[styles.successInfoText, { color: theme.textSecondary }]}>
            Memark will remind you to review this at the perfect time using spaced repetition — so you actually remember it.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
        onPress={handleFinish}
      >
        <Text style={styles.primaryBtnText}>Open my vault</Text>
        <ArrowRight size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  heroIcon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 340,
  },
  featureList: {
    width: '100%',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
  },
  featureItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
    marginTop: 10,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  numberCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
  },
  numberLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  numberDisplay: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  numberHint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  instructionList: {
    width: '100%',
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  instructionNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionNumText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  waitingIconContainer: {
    width: 112,
    height: 112,
    borderRadius: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 10,
  },
  waitingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 40,
    marginBottom: 28,
  },
  waitingLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  exampleCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  exampleRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  exampleBullet: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  exampleText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  successIcon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 20,
  },
  successInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
  },
  successInfoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    borderRadius: 14,
    width: '100%',
    marginBottom: 16,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
  },
});
