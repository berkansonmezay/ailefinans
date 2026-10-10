import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications, NotificationItem } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';

export const NotificationsScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    playTestAlert,
  } = useNotifications();

  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const filteredData = useMemo(() => {
    if (filter === 'UNREAD') {
      return notifications.filter(n => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return 'Az önce';
      if (diffMinutes < 60) return `${diffMinutes} dk önce`;
      if (diffHours < 24) return `${diffHours} saat önce`;
      if (diffDays === 1) return 'Dün ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      if (diffDays < 7) return `${diffDays} gün önce`;
      return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'INSTALLMENT_DUE':
      case 'INSTALLMENT_OVERDUE':
        return {
          icon: 'card',
          color: '#f59e0b',
          bg: '#fef3c7',
          targetScreen: 'Debts',
          badgeText: 'Taksit',
        };
      case 'SUBSCRIPTION_RENEWAL':
        return {
          icon: 'sync',
          color: '#3b82f6',
          bg: '#dbeafe',
          targetScreen: 'Subscriptions',
          badgeText: 'Abonelik',
        };
      case 'PAYMENT_REMINDER':
      case 'REMINDER':
        return {
          icon: 'time',
          color: '#8b5cf6',
          bg: '#ede9fe',
          targetScreen: 'Reminders',
          badgeText: 'Hatırlatıcı',
        };
      case 'WARRANTY_EXPIRING':
        return {
          icon: 'shield-checkmark',
          color: '#10b981',
          bg: '#d1fae5',
          targetScreen: 'Warranties',
          badgeText: 'Garanti',
        };
      default:
        return {
          icon: 'notifications',
          color: '#6366f1',
          bg: '#e0e7ff',
          targetScreen: null,
          badgeText: 'Sistem',
        };
    }
  };

  const handlePressItem = (item: NotificationItem) => {
    if (!item.isRead) {
      markAsRead(item.id);
    }
    const config = getNotificationConfig(item.type);
    if (config.targetScreen) {
      navigation.navigate(config.targetScreen);
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    Alert.alert(
      'Tümünü Okundu İşaretle',
      'Tüm bildirimleri okundu olarak işaretlemek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet, İşaretle', onPress: markAllAsRead },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDark ? colors.bgSecondary : '#f1f5f9' }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Bildirimler</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText}>{unreadCount} Yeni</Text>
            </View>
          )}
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={[styles.soundTestBtn, { backgroundColor: isDark ? colors.bgSecondary : '#f1f5f9' }]}
            onPress={playTestAlert}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="volume-medium-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={[styles.markAllBtn, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5' }]}
              onPress={handleMarkAllRead}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="checkmark-done-outline" size={20} color="#10b981" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs & Test Sound Bar */}
      <View style={styles.filterSection}>
        <View style={[styles.tabContainer, { backgroundColor: isDark ? colors.bgSecondary : '#e2e8f0' }]}>
          <TouchableOpacity
            style={[styles.tabBtn, filter === 'ALL' && [styles.tabBtnActive, { backgroundColor: colors.bgCard }]]}
            onPress={() => setFilter('ALL')}
          >
            <Text style={[styles.tabText, { color: colors.textMuted }, filter === 'ALL' && [styles.tabTextActive, { color: colors.textPrimary }]]}>
              Tümü ({notifications.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, filter === 'UNREAD' && [styles.tabBtnActive, { backgroundColor: colors.bgCard }]]}
            onPress={() => setFilter('UNREAD')}
          >
            <Text style={[styles.tabText, { color: colors.textMuted }, filter === 'UNREAD' && [styles.tabTextActive, { color: colors.textPrimary }]]}>
              Okunmamış ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.testAlertBadge, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#ede9fe' }]} onPress={playTestAlert}>
          <Ionicons name="play" size={12} color={colors.accent} />
          <Text style={[styles.testAlertText, { color: colors.accent }]}>Ses Deneme</Text>
        </TouchableOpacity>
      </View>

      {/* Notification List */}
      {loading && notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Bildirimler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
          }
          renderItem={({ item }) => {
            const config = getNotificationConfig(item.type);
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: isDark ? 1 : 0 },
                  !item.isRead && [styles.cardUnread, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : '#faf5ff' }],
                ]}
                activeOpacity={0.7}
                onPress={() => handlePressItem(item)}
              >
                {!item.isRead && <View style={styles.unreadDot} />}
                
                <View style={[styles.iconWrapper, { backgroundColor: config.bg }]}>
                  <Ionicons name={config.icon as any} size={22} color={config.color} />
                </View>

                <View style={styles.contentWrapper}>
                  <View style={styles.cardHeader}>
                    <View style={styles.typeBadge}>
                      <Text style={[styles.typeBadgeText, { color: config.color }]}>
                        {config.badgeText}
                      </Text>
                    </View>
                    <Text style={[styles.timeText, { color: colors.textMuted }]}>{formatRelativeTime(item.createdAt)}</Text>
                  </View>

                  <Text style={[styles.cardTitle, { color: colors.textPrimary }, !item.isRead && styles.cardTitleUnread]}>
                    {item.title}
                  </Text>
                  
                  <Text style={[styles.cardMessage, { color: colors.textSecondary }]} numberOfLines={3}>
                    {item.message}
                  </Text>

                  {config.targetScreen && (
                    <View style={styles.actionRow}>
                      <Text style={[styles.actionText, { color: colors.accent }]}>Detayı Görüntüle</Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.accent} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? colors.bgSecondary : '#f1f5f9' }]}>
                <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {filter === 'UNREAD' ? 'Okunmamış bildiriminiz yok' : 'Henüz bildiriminiz bulunmuyor'}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Taksit, abonelik, garanti veya ödeme hatırlatıcılarınız geldiğinde burada sesli uyarı ile birlikte listelenecektir.
              </Text>
              <TouchableOpacity style={styles.emptyTestBtn} onPress={playTestAlert}>
                <Ionicons name="notifications-outline" size={18} color="#ffffff" />
                <Text style={styles.emptyTestBtnText}>Sesli Uyarıyı Test Et</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
  },
  backButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  unreadPill: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  soundTestBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
  },
  markAllBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0f172a',
  },
  testAlertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#ede9fe',
  },
  testAlertText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366f1',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    position: 'relative',
  },
  cardUnread: {
    borderColor: '#c7d2fe',
    backgroundColor: '#faf5ff',
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentWrapper: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingRight: 12,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardTitleUnread: {
    fontWeight: '700',
    color: '#0f172a',
  },
  cardMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTestBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
