import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  activeTenantId: string;
  activeTenantName: string;
  role: string;
  systemRole?: string;
  tenants: Array<{ id: string; name: string; role: string }>;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  originalAccessToken: string | null;
  originalRefreshToken: string | null;
  originalUser: User | null;
  setUser: (user: User | null) => void;
  login: (data: { user: User; accessToken: string; refreshToken: string }) => void;
  logout: () => void;
  startImpersonation: (data: { user: User; accessToken: string; refreshToken: string }) => void;
  stopImpersonation: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      originalAccessToken: null,
      originalRefreshToken: null,
      originalUser: null,
      setUser: (user) => set({ user }),
      login: (data) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', data.accessToken);
          localStorage.setItem('refresh_token', data.refreshToken);
        }
        set({ user: data.user, isAuthenticated: true });
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
        set({ user: null, isAuthenticated: false, originalAccessToken: null, originalRefreshToken: null, originalUser: null });
      },
      startImpersonation: (data) => {
        if (typeof window !== 'undefined') {
          const currentAccess = localStorage.getItem('access_token');
          const currentRefresh = localStorage.getItem('refresh_token');
          localStorage.setItem('access_token', data.accessToken);
          localStorage.setItem('refresh_token', data.refreshToken);
          
          set((state) => ({
            user: data.user,
            isAuthenticated: true,
            originalAccessToken: currentAccess,
            originalRefreshToken: currentRefresh,
            originalUser: state.user,
          }));
        }
      },
      stopImpersonation: () => {
        if (typeof window !== 'undefined') {
          set((state) => {
            if (state.originalAccessToken && state.originalRefreshToken) {
              localStorage.setItem('access_token', state.originalAccessToken);
              localStorage.setItem('refresh_token', state.originalRefreshToken);
            } else {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
            }
            return {
              user: state.originalUser,
              isAuthenticated: !!state.originalAccessToken,
              originalAccessToken: null,
              originalRefreshToken: null,
              originalUser: null,
            };
          });
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
