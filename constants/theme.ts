export const lightTheme = {
  background: '#FFFFFF',
  surface: '#F7F9FC',
  surfaceSecondary: '#E8EDF5',
  text: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  accent: '#0EA5E9',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E2E8F0',
  cardBackground: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const darkTheme = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceSecondary: '#334155',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#64748B',
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  accent: '#0EA5E9',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  border: '#334155',
  cardBackground: '#1E293B',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export const blueTheme = {
  background: '#0A1628',
  surface: '#132F4C',
  surfaceSecondary: '#1E4976',
  text: '#E3F2FD',
  textSecondary: '#90CAF9',
  textTertiary: '#42A5F5',
  primary: '#2196F3',
  primaryLight: '#42A5F5',
  primaryDark: '#1976D2',
  accent: '#00BCD4',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF5350',
  border: '#1E4976',
  cardBackground: '#132F4C',
  overlay: 'rgba(33, 150, 243, 0.2)',
};

export type Theme = typeof lightTheme;
export type ThemeMode = 'light' | 'dark' | 'blue';

export const themes = {
  light: lightTheme,
  dark: darkTheme,
  blue: blueTheme,
};
