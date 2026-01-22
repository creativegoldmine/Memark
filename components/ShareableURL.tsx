import { View, Text, StyleSheet, TouchableOpacity, Platform, Share as RNShare, Alert } from 'react-native';
import { Copy, Share2, Check } from 'lucide-react-native';
import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';

interface ShareableURLProps {
  url: string;
  title?: string;
  description?: string;
  itemId?: string;
  onShareSuccess?: () => void;
}

export function ShareableURL({ url, title, description, itemId, onShareSuccess }: ShareableURLProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    await Clipboard.setStringAsync(url);
    setCopied(true);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const shareMessage = title
        ? `${title}\n\n${url}`
        : url;

      await RNShare.share({
        message: Platform.OS === 'ios' ? shareMessage : `${shareMessage}\n${url}`,
        url: Platform.OS === 'ios' ? url : undefined,
        title: title || 'Share from Memark',
      });

      onShareSuccess?.();

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      if (err.message !== 'User did not share') {
        console.error('Error sharing:', err);
        Alert.alert('Error', 'Failed to share');
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Share this link</Text>
      </View>

      <View style={[styles.urlContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Text style={[styles.url, { color: theme.text }]} numberOfLines={1}>
          {url}
        </Text>
        <TouchableOpacity
          style={[styles.copyButton, { backgroundColor: copied ? theme.success : theme.primary }]}
          onPress={handleCopy}
          activeOpacity={0.7}
        >
          {copied ? (
            <Check size={16} color="#FFFFFF" />
          ) : (
            <Copy size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.shareButton, { backgroundColor: theme.primary }]}
        onPress={handleShare}
        activeOpacity={0.8}
      >
        <Share2 size={20} color="#FFFFFF" />
        <Text style={styles.shareButtonText}>Share Post</Text>
      </TouchableOpacity>

      {copied && (
        <View style={[styles.copiedToast, { backgroundColor: theme.success }]}>
          <Check size={16} color="#FFFFFF" />
          <Text style={styles.copiedText}>Link copied!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginVertical: 16,
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    } : {
      elevation: 3,
    }),
  },
  header: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  url: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    } : {
      elevation: 4,
    }),
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  copiedToast: {
    position: 'absolute',
    top: -40,
    left: '50%',
    transform: [{ translateX: -60 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    } : {
      elevation: 8,
    }),
  },
  copiedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
