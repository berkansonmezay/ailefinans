import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchApi } from '../lib/api';

interface AuthContextType {
  token: string | null;
  user: any | null;
  isLoading: boolean;
  login: (token: string, initialUser?: any) => Promise<void>;
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
      const u = userData.data || userData;
      setUser(u);
      await AsyncStorage.setItem('userData', JSON.stringify(u));
    } catch (error) {
      console.error('Kullanıcı bilgileri çekilemedi:', error);
    }
  };

  useEffect(() => {
    const loadToken = async () => {
      try {
        const [storedToken, storedUserData] = await Promise.all([
          AsyncStorage.getItem('accessToken'),
          AsyncStorage.getItem('userData'),
        ]);

        if (storedToken) {
          setToken(storedToken);
          if (storedUserData) {
            try {
              setUser(JSON.parse(storedUserData));
            } catch (e) {
              console.error('UserData parse error:', e);
            }
          }
          // Anında açılış (Zero delay): Kullanıcıyı beklemeden içeri al
          setIsLoading(false);

          // Arka planda sessizce kullanıcı bilgilerini tazele (kullanıcıyı bloke etmez)
          fetchApi<any>('/auth/me')
            .then(async (userData) => {
              const u = userData.data || userData;
              setUser(u);
              await AsyncStorage.setItem('userData', JSON.stringify(u));
            })
            .catch((e: any) => {
              if (e.message !== 'Unauthorized') {
                console.log('Arka plan kullanıcı güncelleme:', e.message);
              }
            });
          return;
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

  const login = async (newToken: string, initialUser?: any) => {
    try {
      await AsyncStorage.setItem('accessToken', newToken);
      setToken(newToken);
      if (initialUser) {
        setUser(initialUser);
        await AsyncStorage.setItem('userData', JSON.stringify(initialUser));
      } else {
        const userData = await fetchApi<any>('/auth/me');
        const u = userData.data || userData;
        setUser(u);
        await AsyncStorage.setItem('userData', JSON.stringify(u));
      }
    } catch (error) {
      console.error('Token kaydedilirken veya user alınırken hata:', error);
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('accessToken'),
        AsyncStorage.removeItem('userData'),
      ]);
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
