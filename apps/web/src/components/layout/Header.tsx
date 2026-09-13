'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { Bell, Search, User as UserIcon, LogOut, Check, Moon, Sun, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';
import { fetchApi } from '@/lib/api';
import clsx from 'clsx';
import { QuickAddModal } from '@/components/shared/QuickAddModal';

interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      if (!user) return;
      const res = await fetchApi<any>('/notifications');
      setNotifications(res.items || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadNotifications();
    
    // Auto refresh notifications every minute
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const [myTenants, setMyTenants] = useState<any[]>([]);
  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false);
  const tenantDropdownRef = useRef<HTMLDivElement>(null);

  const loadMyTenants = async () => {
    try {
      if (!user) return;
      const res = await fetchApi<any>('/tenants');
      setMyTenants(res.data || res.items || res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadMyTenants();
  }, [user]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (tenantDropdownRef.current && !tenantDropdownRef.current.contains(event.target as Node)) {
        setIsTenantDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitchTenant = async (tenantId: string) => {
    if (tenantId === user?.activeTenantId) return;
    try {
      const res = await fetchApi<any>('/auth/switch-tenant', {
        method: 'POST',
        body: JSON.stringify({ tenantId }),
      });
      if (res && res.accessToken) {
        useAuthStore.getState().login(res);
        toast.success('Kurum değiştirildi');
        window.location.href = '/'; 
      }
    } catch (error: any) {
      toast.error('Kurum değiştirilemedi');
    }
  };



  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await fetchApi('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      logout();
      router.push('/login');
      toast.success('Çıkış yapıldı.');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetchApi(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetchApi('/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="h-[var(--header-height)] bg-bg-primary/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center flex-1">
        {/* Placeholder to keep right side items pushed to the right, or we can just let justify-between handle it */}
      </div>

      <div className="flex items-center gap-4">
        {user?.activeTenantName && user?.systemRole === 'ADMIN' && (
          <div className="relative hidden md:block" ref={tenantDropdownRef}>
            <button 
              onClick={() => setIsTenantDropdownOpen(!isTenantDropdownOpen)}
              className="flex items-center px-3 py-1.5 bg-bg-card rounded-full border border-border text-sm hover:border-accent/50 transition-colors"
            >
              <span className="text-text-muted mr-2">Aile:</span>
              <span className="font-medium text-text-primary">{user.activeTenantName}</span>
              <span className="ml-2 text-text-muted text-[10px]">▼</span>
            </button>
            
            {isTenantDropdownOpen && myTenants.length > 0 && (
              <div className="absolute right-0 mt-2 w-56 bg-bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
                <div className="p-3 border-b border-border bg-bg-card">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Kurumlarım</p>
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                  {myTenants.map((t: any) => (
                    <button
                      key={t.id}
                      onClick={() => handleSwitchTenant(t.id)}
                      className={clsx(
                        "w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-colors mb-1",
                        t.id === user.activeTenantId 
                          ? "bg-accent/10 text-accent font-medium" 
                          : "text-text-secondary hover:bg-bg-secondary"
                      )}
                    >
                      <span className="truncate">{t.name}</span>
                      {t.id === user.activeTenantId && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hızlı Ekle Button */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-full shadow-lg shadow-indigo-500/20 transition-all border border-indigo-500/10"
          >
            <Plus size={16} />
            Hızlı Ekle
          </button>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-full hover:bg-bg-card transition-colors text-text-muted hover:text-text-primary"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-text-primary border-2 border-bg-primary">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="font-semibold text-text-primary">Bildirimler</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-accent hover:text-accent-light transition-colors">
                    Tümünü Okundu İşaretle
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-text-muted text-sm">
                    Yeni bildiriminiz yok.
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={clsx(
                        "p-4 border-b border-border flex items-start gap-3 transition-colors",
                        notif.isRead ? "opacity-75" : "bg-white/[0.02]"
                      )}
                    >
                      <div className={clsx(
                        "mt-1 w-2 h-2 rounded-full shrink-0", 
                        !notif.isRead ? "bg-accent" : "bg-transparent"
                      )} />
                      <div className="flex-1">
                        <p className={clsx("text-sm", notif.isRead ? "text-text-muted" : "text-text-primary font-medium")}>
                          {notif.message}
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          {new Date(notif.createdAt).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      {!notif.isRead && (
                        <button 
                          onClick={() => markAsRead(notif.id)}
                          className="p-1.5 text-text-muted hover:text-emerald-400 hover:bg-bg-secondary rounded-lg transition-colors"
                          title="Okundu işaretle"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full hover:bg-bg-card transition-colors text-text-muted hover:text-text-primary"
            title="Temayı Değiştir"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        )}

        <div className="h-6 w-px bg-border mx-2 hidden md:block"></div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            {/* Ad ve rol Profil sayfasına taşındı */}
          </div>
          <button onClick={() => router.push('/profile')} className="w-9 h-9 rounded-full bg-accent-light text-accent flex items-center justify-center border border-accent/20 hover:bg-accent hover:text-text-primary transition-colors" title="Profilim">
            <UserIcon size={18} />
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-danger-bg hover:text-danger transition-colors text-text-muted ml-1"
            title="Çıkış Yap"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <QuickAddModal 
        isOpen={isQuickAddOpen} 
        onClose={() => setIsQuickAddOpen(false)} 
      />
    </header>
  );
}
