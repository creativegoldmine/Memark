import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { ItemCard } from './ItemCard';
import { Item } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_SPACING = 20;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface SwipeableFeedProps {
  items: Item[];
  onOpenUrl?: (url: string) => void;
  onItemPress?: (item: Item) => void;
}

export function SwipeableFeed({ items, onOpenUrl, onItemPress }: SwipeableFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const updateIndex = (newIndex: number) => {
    setCurrentIndex(newIndex);
    scrollViewRef.current?.scrollTo({
      x: newIndex * (CARD_WIDTH + CARD_SPACING),
      animated: true,
    });
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD && currentIndex < items.length - 1;
      const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD && currentIndex > 0;

      if (shouldSwipeLeft) {
        runOnJS(updateIndex)(currentIndex + 1);
      } else if (shouldSwipeRight) {
        runOnJS(updateIndex)(currentIndex - 1);
      }

      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  if (Platform.OS === 'web') {
    return (
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        contentContainerStyle={styles.webContainer}
      >
        {items.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.cardWrapper,
              { width: CARD_WIDTH, marginRight: index === items.length - 1 ? 0 : CARD_SPACING }
            ]}
          >
            <ItemCard
              item={item}
              onPress={() => onItemPress?.(item)}
              onOpenUrl={onOpenUrl}
              viewMode="list"
            />
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.cardsContainer, animatedStyle]}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            decelerationRate="fast"
            contentContainerStyle={styles.scrollContent}
          >
            {items.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.cardWrapper,
                  { width: CARD_WIDTH, marginRight: index === items.length - 1 ? 0 : CARD_SPACING }
                ]}
              >
                <ItemCard
                  item={item}
                  onPress={() => onItemPress?.(item)}
                  onOpenUrl={onOpenUrl}
                  viewMode="list"
                />
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </GestureDetector>

      <View style={styles.pagination}>
        {items.slice(0, 10).map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              currentIndex === index && styles.paginationDotActive,
            ]}
          />
        ))}
        {items.length > 10 && (
          <View style={styles.paginationMore}>
            <View style={styles.paginationDot} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardsContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
    alignItems: 'center',
  },
  webContainer: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
    alignItems: 'center',
  },
  cardWrapper: {
    justifyContent: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#8B5CF6',
  },
  paginationMore: {
    opacity: 0.5,
  },
});
