'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ArrowLeft } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, originalAccessToken, stopImpersonation, user, setUser, logout } = useAuthStore();
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!user) {
        // We are authenticated but user object is missing (e.g. after restoring from old impersonation state)
        // Refresh token to get the user object
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          fetchApi<any>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) })
            .then(res => {
              if (res.user) {
                setUser(res.user);
              } else {
                logout();
              }
            })
            .catch(() => logout());
        } else {
          logout();
        }
      }
    }
  }, [isAuthenticated, user, isMounted, router, setUser, logout]);

  if (!isMounted || !isAuthenticated) return null; // Wait for hydration

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {originalAccessToken && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-4 shadow-sm z-50 shrink-0">
            <span className="text-sm font-medium">Şu an <strong>{user?.firstName} {user?.lastName}</strong> kullanıcısının hesabı ile işlem yapıyorsunuz.</span>
            <button 
              onClick={() => {
                stopImpersonation();
                router.push('/admin');
                setTimeout(() => window.location.reload(), 100);
              }}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md text-sm font-semibold transition-colors"
            >
              <ArrowLeft size={16} /> Kendi Hesabıma Dön
            </button>
          </div>
        )}
        <Header />
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-2 md:p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
