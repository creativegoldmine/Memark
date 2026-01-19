import { View, Image, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue
} from 'react-native-reanimated';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const HEADER_MAX_HEIGHT = 56;
const HEADER_MIN_HEIGHT = 48;
const LOGO_MAX_SIZE = 54;
const LOGO_MIN_SIZE = 46;
const SCROLL_THRESHOLD = 50;

interface CollapsibleHeaderProps {
  scrollY: SharedValue<number>;
  showBackButton?: boolean;
  onBackPress?: () => void;
  unreadCount?: number;
  onNotificationPress?: () => void;
  title?: string;
}

export function CollapsibleHeader({
  scrollY,
  showBackButton = false,
  onBackPress,
  unreadCount = 0,
  onNotificationPress
}: CollapsibleHeaderProps) {
  const { theme, themeMode } = useTheme();
  const insets = useSafeAreaInsets();

  const animatedHeaderStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
      Extrapolation.CLAMP
    );

    return {
      height,
    };
  });

  const animatedLogoContainerStyle = useAnimatedStyle(() => {
    const containerHeight = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [HEADER_MAX_HEIGHT - 2, HEADER_MIN_HEIGHT - 2],
      Extrapolation.CLAMP
    );

    return {
      width: containerHeight,
      height: containerHeight,
    };
  });

  const animatedLogoStyle = useAnimatedStyle(() => {
    const containerHeight = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [HEADER_MAX_HEIGHT - 2, HEADER_MIN_HEIGHT - 2],
      Extrapolation.CLAMP
    );

    return {
      width: containerHeight * 5,
      height: containerHeight * 5,
    };
  });

  const animatedBackButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [SCROLL_THRESHOLD * 0.3, SCROLL_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );

    const translateX = interpolate(
      scrollY.value,
      [SCROLL_THRESHOLD * 0.3, SCROLL_THRESHOLD],
      [-20, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateX }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.header,
        animatedHeaderStyle,
        {
          backgroundColor: theme.cardBackground,
          borderBottomColor: theme.border,
          paddingTop: insets.top
        }
      ]}
    >
      <View style={styles.headerContent}>
        {showBackButton && (
          <Animated.View style={[styles.backButtonContainer, animatedBackButtonStyle]}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: theme.surface }]}
              onPress={onBackPress}
            >
              <ArrowLeft size={20} color={theme.text} />
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View style={[styles.logoContainer, animatedLogoContainerStyle]}>
          <Animated.Image
            source={require('@/assets/images/copy_of_memark.png')}
            style={[
              styles.logo,
              animatedLogoStyle,
              themeMode === 'purple' && { tintColor: '#FFFFFF' }
            ]}
            resizeMode="cover"
          />
        </Animated.View>

        <TouchableOpacity
          style={styles.notificationButton}
          onPress={onNotificationPress}
        >
          <Bell size={22} color={theme.text} />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.error }]}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    } : {
      elevation: 2,
    }),
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 1,
  },
  backButtonContainer: {
    position: 'absolute',
    left: 12,
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginLeft: 3,
  },
  logo: {},
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
