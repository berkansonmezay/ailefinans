import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style }) => {
  const { isDark } = useTheme();
  return (
    <View style={[styles.container, isDark && styles.containerDark, style]}>
      <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  containerDark: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  content: {
    padding: 16,
  },
});
