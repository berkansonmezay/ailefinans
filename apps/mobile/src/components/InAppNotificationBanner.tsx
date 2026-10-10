import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications, NotificationItem } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';

interface InAppNotificationBannerProps {
  onPressNotification?: (item: NotificationItem) => void;
}

export const InAppNotificationBanner = ({ onPressNotification }: InAppNotificationBannerProps) => {
  const { bannerNotification, dismissBanner, markAsRead } = useNotifications();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    if (bannerNotification) {
      Animated.spring(slideAnim, {
        toValue: insets.top + (Platform.OS === 'ios' ? 8 : 16),
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [bannerNotification, insets.top, slideAnim]);

  if (!bannerNotification) return null;

  const getIconConfig = (type: string) => {
    switch (type) {
      case 'INSTALLMENT_DUE':
      case 'INSTALLMENT_OVERDUE':
        return { name: 'card', color: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7' };
      case 'SUBSCRIPTION_RENEWAL':
        return { name: 'sync', color: '#3b82f6', bg: isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe' };
      case 'PAYMENT_REMINDER':
      case 'REMINDER':
        return { name: 'time', color: '#8b5cf6', bg: isDark ? 'rgba(139,92,246,0.2)' : '#ede9fe' };
      case 'WARRANTY_EXPIRING':
        return { name: 'shield-checkmark', color: '#10b981', bg: isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5' };
      default:
        return { name: 'notifications', color: '#6366f1', bg: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff' };
    }
  };

  const iconConfig = getIconConfig(bannerNotification.type);

  const handlePress = () => {
    if (bannerNotification) {
      markAsRead(bannerNotification.id);
      if (onPressNotification) {
        onPressNotification(bannerNotification);
      }
      dismissBanner();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        activeOpacity={0.9}
        onPress={handlePress}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
          <Ionicons name={iconConfig.name as any} size={22} color={iconConfig.color} />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {bannerNotification.title}
            </Text>
            <Text style={styles.timeText}>Şimdi</Text>
          </View>
          <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
            {bannerNotification.message}
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.closeBtn, { backgroundColor: isDark ? colors.bgPrimary : '#f8fafc' }]} 
          onPress={dismissBanner} 
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    paddingRight: 6,
  },
  timeText: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '600',
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
  },
});

