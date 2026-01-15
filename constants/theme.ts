export const lightTheme = {
  background: '#FFFFFF',
  surface: '#FAFAFA',
  surfaceSecondary: '#F5F5F5',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9B9B',
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  accent: '#EC4899',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  cardBackground: '#FFFFFF',
  cardBackgroundHover: '#FAFAFA',
  overlay: 'rgba(0, 0, 0, 0.5)',
  statusBar: 'dark' as const,
  gradient: {
    primary: ['#8B5CF6', '#A78BFA'],
    accent: ['#EC4899', '#F472B6'],
    subtle: ['#FAFAFA', '#FFFFFF'],
  },
  shadow: {
    sm: 'rgba(0, 0, 0, 0.04)',
    md: 'rgba(0, 0, 0, 0.08)',
    lg: 'rgba(0, 0, 0, 0.12)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
  },
};

export const darkTheme = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceSecondary: '#2A2A2A',
  text: '#FAFAFA',
  textSecondary: '#A3A3A3',
  textTertiary: '#737373',
  primary: '#A78BFA',
  primaryLight: '#C4B5FD',
  primaryDark: '#8B5CF6',
  accent: '#F472B6',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  border: '#2A2A2A',
  borderLight: '#333333',
  cardBackground: '#1A1A1A',
  cardBackgroundHover: '#2A2A2A',
  overlay: 'rgba(0, 0, 0, 0.7)',
  statusBar: 'light' as const,
  gradient: {
    primary: ['#8B5CF6', '#A78BFA'],
    accent: ['#EC4899', '#F472B6'],
    subtle: ['#1A1A1A', '#0A0A0A'],
  },
  shadow: {
    sm: 'rgba(0, 0, 0, 0.2)',
    md: 'rgba(0, 0, 0, 0.3)',
    lg: 'rgba(0, 0, 0, 0.4)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
  },
};

export const purpleTheme = {
  background: '#1A0B2E',
  surface: '#2D1B4E',
  surfaceSecondary: '#3F2A5F',
  text: '#F3E8FF',
  textSecondary: '#D8B4FE',
  textTertiary: '#C084FC',
  primary: '#A78BFA',
  primaryLight: '#C4B5FD',
  primaryDark: '#8B5CF6',
  accent: '#EC4899',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#F87171',
  border: '#3F2A5F',
  borderLight: '#4C3570',
  cardBackground: '#2D1B4E',
  cardBackgroundHover: '#3F2A5F',
  overlay: 'rgba(139, 92, 246, 0.2)',
  statusBar: 'light' as const,
  gradient: {
    primary: ['#8B5CF6', '#A78BFA'],
    accent: ['#EC4899', '#F472B6'],
    subtle: ['#2D1B4E', '#1A0B2E'],
  },
  shadow: {
    sm: 'rgba(139, 92, 246, 0.1)',
    md: 'rgba(139, 92, 246, 0.2)',
    lg: 'rgba(139, 92, 246, 0.3)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
  },
};

export type Theme = {
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  border: string;
  borderLight: string;
  cardBackground: string;
  cardBackgroundHover: string;
  overlay: string;
  statusBar: 'light' | 'dark' | 'auto';
  gradient: {
    primary: readonly string[];
    accent: readonly string[];
    subtle: readonly string[];
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
};

export type ThemeMode = 'light' | 'dark' | 'purple';

export const themes = {
  light: lightTheme,
  dark: darkTheme,
  purple: purpleTheme,
};

export const collectionIconNames = [
  'recipe',
  'book',
  'video',
  'music',
  'art',
  'work',
  'fitness',
  'travel',
  'game',
  'folder',
  'library',
  'favorite',
  'shopping',
  'home',
] as const;

export type CollectionIconName = typeof collectionIconNames[number];

export const collectionIconDisplayNames: Record<CollectionIconName, string> = {
  recipe: 'Recipe',
  book: 'Book',
  video: 'Video',
  music: 'Music',
  art: 'Art',
  work: 'Work',
  fitness: 'Fitness',
  travel: 'Travel',
  game: 'Game',
  folder: 'Folder',
  library: 'Library',
  favorite: 'Favorite',
  shopping: 'Shopping',
  home: 'Home',
};
