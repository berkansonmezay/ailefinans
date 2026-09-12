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
  setUser: (user: User | null) => void;
  login: (data: { user: User; accessToken: string; refreshToken: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
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
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
