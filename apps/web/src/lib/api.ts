const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(public status: number, public data: any) {
    super(data?.message || 'API request failed');
  }
}

// In-memory cache for fast UI transitions and low latency
interface CacheEntry {
  data: any;
  timestamp: number;
}

const apiCache = new Map<string, CacheEntry>();

// Cacheable endpoints (static data that changes rarely)
const CACHEABLE_ENDPOINTS = ['/categories', '/accounts', '/merchants', '/tenants'];
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function clearApiCache() {
  apiCache.clear();
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  // Invalidate cache on mutations (POST, PUT, DELETE, PATCH)
  if (method !== 'GET') {
    apiCache.clear();
  } else if (options.cache !== 'no-store') {
    // Check in-memory cache for GET requests on cacheable endpoints
    const isCacheable = CACHEABLE_ENDPOINTS.some(p => endpoint.startsWith(p));
    if (isCacheable) {
      const cacheKey = `${token || ''}:${endpoint}`;
      const cached = apiCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data as T;
      }
    }
  }

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  const result = data?.data !== undefined ? data.data : data;

  // Save to cache if cacheable
  if (method === 'GET' && options.cache !== 'no-store') {
    const isCacheable = CACHEABLE_ENDPOINTS.some(p => endpoint.startsWith(p));
    if (isCacheable) {
      const cacheKey = `${token || ''}:${endpoint}`;
      apiCache.set(cacheKey, { data: result, timestamp: Date.now() });
    }
  }

  return result as T;
}
