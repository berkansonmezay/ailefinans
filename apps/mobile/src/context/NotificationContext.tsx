import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { fetchApi } from '../lib/api';
import { playNotificationAlert, setupPushNotifications, scheduleLocalNotification } from '../lib/notificationSound';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  bannerNotification: NotificationItem | null;
  dismissBanner: () => void;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  playTestAlert: () => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  bannerNotification: null,
  dismissBanner: () => {},
  refreshNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  playTestAlert: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { token, user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [bannerNotification, setBannerNotification] = useState<NotificationItem | null>(null);

  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef<boolean>(true);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissBanner = useCallback(() => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
    setBannerNotification(null);
  }, []);

  const triggerBannerWithSound = useCallback((item: NotificationItem) => {
    dismissBanner();
    setBannerNotification(item);
    playNotificationAlert();

    // 5 saniye sonra otomatik kapat
    bannerTimerRef.current = setTimeout(() => {
      setBannerNotification(null);
    }, 5000);
  }, [dismissBanner]);

  const loadNotifications = useCallback(async (isBackground: boolean = false) => {
    if (!token) return;
    try {
      if (!isBackground) setLoading(true);
      const res = await fetchApi<any>('/notifications');
      
      const items: NotificationItem[] = res.data?.data || res.items || res.data || [];
      const count: number = typeof res.data?.unreadCount === 'number' 
        ? res.data.unreadCount 
        : items.filter(n => !n.isRead).length;

      // Yeni okunmamış bildirim kontrolü
      if (!isFirstLoadRef.current) {
        const newlyArrived = items.find(n => !n.isRead && !knownIdsRef.current.has(n.id));
        if (newlyArrived) {
          triggerBannerWithSound(newlyArrived);
          scheduleLocalNotification(newlyArrived.title, newlyArrived.message, { id: newlyArrived.id });
        }
      }

      // Bilinen ID kümesini güncelle
      items.forEach(n => knownIdsRef.current.add(n.id));
      isFirstLoadRef.current = false;

      setNotifications(items);
      setUnreadCount(count);
    } catch (error) {
      console.warn('Bildirimler alınamadı:', error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [token, triggerBannerWithSound]);

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      knownIdsRef.current.clear();
      isFirstLoadRef.current = true;
      dismissBanner();
      return;
    }

    // İzinleri yapılandır
    setupPushNotifications();

    // İlk yükleme
    loadNotifications(false);

    // Her 30 saniyede bir yeni bildirimleri denetle (Polling)
    const interval = setInterval(() => {
      loadNotifications(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [token, loadNotifications, dismissBanner]);

  const markAsRead = async (id: string) => {
    try {
      await fetchApi(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (bannerNotification?.id === id) {
        dismissBanner();
      }
    } catch (error) {
      console.warn('Bildirim okundu işaretlenemedi:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetchApi('/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      dismissBanner();
    } catch (error) {
      console.warn('Tüm bildirimler okundu işaretlenemedi:', error);
    }
  };

  const playTestAlert = async () => {
    const testItem: NotificationItem = {
      id: 'test-' + Date.now(),
      title: 'Sesli Bildirim Testi 🔔',
      message: 'Bildirim sesi ve titreşim başarıyla çalışıyor!',
      type: 'SYSTEM',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    triggerBannerWithSound(testItem);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        bannerNotification,
        dismissBanner,
        refreshNotifications: () => loadNotifications(false),
        markAsRead,
        markAllAsRead,
        playTestAlert,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
