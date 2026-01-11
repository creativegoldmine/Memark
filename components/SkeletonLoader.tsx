import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ItemCardSkeleton() {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <SkeletonLoader height={160} borderRadius={0} />

      <View style={styles.content}>
        <View style={styles.header}>
          <SkeletonLoader width={80} height={16} />
          <SkeletonLoader width={60} height={20} />
        </View>

        <SkeletonLoader width="90%" height={20} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="75%" height={20} style={{ marginBottom: 12 }} />

        <SkeletonLoader width="100%" height={16} style={{ marginBottom: 6 }} />
        <SkeletonLoader width="85%" height={16} style={{ marginBottom: 12 }} />

        <View style={styles.tags}>
          <SkeletonLoader width={60} height={24} />
          <SkeletonLoader width={70} height={24} />
          <SkeletonLoader width={55} height={24} />
        </View>

        <View style={styles.footer}>
          <SkeletonLoader width={60} height={14} />
          <SkeletonLoader width={80} height={14} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {},
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
