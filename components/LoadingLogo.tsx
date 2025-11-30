import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';

interface LoadingLogoProps {
  size?: number;
}

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

export function LoadingLogo({ size = 60 }: LoadingLogoProps) {
  const { theme, themeMode } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const color = themeMode === 'dark' ? '#FFFFFF' : theme.primary;

  return (
    <View style={styles.container}>
      <AnimatedSvg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ transform: [{ rotate }] }}
      >
        <Path
          d="M30 25 L20 60 L28 60 L32 47 L40 70 L48 70 L56 47 L60 60 L68 60 L58 25 L50 25 L40 50 L30 25 Z"
          fill={color}
          opacity={0.9}
        />
      </AnimatedSvg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
