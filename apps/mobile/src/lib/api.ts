import { Platform, DeviceEventEmitter, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getBaseUrl = () => {
  // If explicitly configured with a non-localhost URL (e.g. Render or custom LAN IP)
  if (
    process.env.EXPO_PUBLIC_API_URL &&
    !process.env.EXPO_PUBLIC_API_URL.includes('localhost') &&
    !process.env.EXPO_PUBLIC_API_URL.includes('127.0.0.1')
  ) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (__DEV__) {
    // Dynamically detect host IP from Metro bundle URL (works on real phones, Android emulators, and iOS devices!)
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return `http://${match[1]}:4000/api/v1`;
      }
    }

    // Default LAN IP of development machine for Expo Go physical device testing
    return 'http://192.168.1.8:4000/api/v1';
  }

  // Canlı Render.com API adresi
  return 'https://ailefinans-api.onrender.com/api/v1';
};

const BASE_URL = getBaseUrl();

interface CacheEntry {
  data: any;
  timestamp: number;
}

const apiCache = new Map<string, CacheEntry>();
const CACHEABLE_ENDPOINTS = ['/categories', '/accounts', '/merchants'];
const CACHE_TTL_MS = 60 * 1000; // 60 saniye

export const clearApiCache = () => {
  apiCache.clear();
};

export const getAvatarUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const apiBase = getBaseUrl().replace(/\/api\/v1\/?$/, '');
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
};


export const fetchApi = async <T,>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  try {
    const currentBase = getBaseUrl();
    const url = `${currentBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const method = (options.method || 'GET').toUpperCase();
    
    // Get token dynamically from storage
    const token = await AsyncStorage.getItem('accessToken');

    // Invalidate cache on mutations (POST, PUT, DELETE, PATCH)
    if (method !== 'GET') {
      apiCache.clear();
    } else {
      const isCacheable = CACHEABLE_ENDPOINTS.some(p => endpoint.startsWith(p));
      if (isCacheable) {
        const cacheKey = `${token || ''}:${endpoint}`;
        const cached = apiCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
          return cached.data as T;
        }
      }
    }

    const headers: any = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...options.headers,
    };

    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        apiCache.clear();
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('userData');
        DeviceEventEmitter.emit('auth:logout');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // Return null for 204 No Content
    if (response.status === 204) {
      return null as any;
    }

    const data = await response.json();
    const result = data.data !== undefined ? (data.data as T) : (data as T);

    if (method === 'GET' && CACHEABLE_ENDPOINTS.some(p => endpoint.startsWith(p))) {
      const cacheKey = `${token || ''}:${endpoint}`;
      apiCache.set(cacheKey, { data: result, timestamp: Date.now() });
    }

    return result;
  } catch (error: any) {
    if (error.message !== 'Unauthorized') {
      console.error(`API Error (${endpoint}):`, error);
    }
    throw error;
  }
};
