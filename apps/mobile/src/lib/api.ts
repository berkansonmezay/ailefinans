import { Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseUrl = () => {
  // Use the local network IP so that both iOS/Android physical devices and emulators can reach the backend.
  return 'http://192.168.1.8:4000/api/v1';
};

const BASE_URL = getBaseUrl();

export const fetchApi = async <T,>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  try {
    const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    // Get token dynamically from storage
    const token = await AsyncStorage.getItem('accessToken');

    const headers: any = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Oturum süresi dolmuş veya geçersiz
        await AsyncStorage.removeItem('accessToken');
        // AuthContext'i tetikleyerek login'e atmak için event fırlat
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
    // The backend returns { success: true, data: [...] }
    return data.data !== undefined ? data.data as T : data as T;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};
