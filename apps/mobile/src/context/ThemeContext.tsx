import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  bgCardHover: string;
  bgInput: string;
  border: string;
  borderFocus: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  cardBorder: string;
  divider: string;
  chipBg: string;
  chipBorder: string;
  modalOverlay: string;
  bottomNavBg: string;
  bottomNavBorder: string;
}

export const lightColors: ThemeColors = {
  bgPrimary: '#f8fafc',
  bgSecondary: '#f1f5f9',
  bgCard: '#ffffff',
  bgCardHover: '#f8fafc',
  bgInput: '#ffffff',
  border: '#e2e8f0',
  borderFocus: '#6366f1',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  accent: '#6366f1',
  accentHover: '#4f46e5',
  accentLight: 'rgba(99, 102, 241, 0.1)',
  success: '#10b981',
  danger: '#f43f5e',
  warning: '#f59e0b',
  info: '#3b82f6',
  cardBorder: '#e2e8f0',
  divider: '#e2e8f0',
  chipBg: '#f8fafc',
  chipBorder: '#e2e8f0',
  modalOverlay: 'rgba(15, 23, 42, 0.45)',
  bottomNavBg: '#ffffff',
  bottomNavBorder: '#f1f5f9',
};

export const darkColors: ThemeColors = {
  bgPrimary: '#0a0f1e',
  bgSecondary: '#111827',
  bgCard: '#1a2237',
  bgCardHover: '#1e293b',
  bgInput: '#1e293b',
  border: '#2d3a4f',
  borderFocus: '#6366f1',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  accent: '#6366f1',
  accentHover: '#818cf8',
  accentLight: 'rgba(99, 102, 241, 0.2)',
  success: '#10b981',
  danger: '#f43f5e',
  warning: '#f59e0b',
  info: '#3b82f6',
  cardBorder: '#2d3a4f',
  divider: '#2d3a4f',
  chipBg: '#1e293b',
  chipBorder: '#334155',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
  bottomNavBg: '#111827',
  bottomNavBorder: '#1f2937',
};

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = '@app_theme_mode';

export const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  isDark: false,
  colors: lightColors,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const nativeColorScheme = useNativeColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadStoredTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemeModeState(stored);
        } else {
          setThemeModeState('system');
        }
      } catch (err) {
        console.error('Error loading theme mode:', err);
      } finally {
        setIsReady(true);
      }
    };
    loadStoredTheme();
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (err) {
      console.error('Error saving theme mode:', err);
    }
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return nativeColorScheme === 'dark';
  }, [themeMode, nativeColorScheme]);

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    await setThemeMode(nextMode);
  }, [isDark, setThemeMode]);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      colors,
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, isDark, colors, setThemeMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
