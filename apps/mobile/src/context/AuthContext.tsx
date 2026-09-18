import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchApi } from '../lib/api';

interface AuthContextType {
  token: string | null;
  user: any | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: any) => void;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  setUser: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async () => {
    try {
      const userData = await fetchApi<any>('/auth/me');
      setUser(userData.data || userData);
    } catch (error) {
      console.error('Kullanıcı bilgileri çekilemedi:', error);
    }
  };

  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('accessToken');
        if (storedToken) {
          setToken(storedToken);
          // Token varsa user bilgilerini de çek
          try {
            const userData = await fetchApi<any>('/auth/me');
            setUser(userData.data || userData);
          } catch (e: any) {
            if (e.message !== 'Unauthorized') {
              console.error('Initial user fetch error:', e);
            }
          }
        }
      } catch (error) {
        console.error('Token yüklenirken hata:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();

    const authSubscription = DeviceEventEmitter.addListener('auth:logout', () => {
      logout();
    });

    return () => {
      authSubscription.remove();
    };
  }, []);

  const login = async (newToken: string) => {
    try {
      await AsyncStorage.setItem('accessToken', newToken);
      setToken(newToken);
      // Login sonrası user çek
      const userData = await fetchApi<any>('/auth/me');
      setUser(userData.data || userData);
    } catch (error) {
      console.error('Token kaydedilirken veya user alınırken hata:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('accessToken');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Token silinirken hata:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
