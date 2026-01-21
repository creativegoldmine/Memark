import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { LogoHeader } from '@/components/LogoHeader';
import { ReviewFeed } from '@/components/ReviewFeed';
import { LinkPreviewModal } from '@/components/LinkPreviewModal';
import { Item } from '@/lib/supabase';

export default function ReviewScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleItemPress = (item: Item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LogoHeader />

      <ReviewFeed onItemPress={handleItemPress} />

      <LinkPreviewModal
        visible={modalVisible}
        item={selectedItem}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
