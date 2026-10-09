export function formatCurrency(val: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
}

export function getAvatarUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // When running in the browser on another computer or device (e.g. 192.168.x.x, domain),
  // a relative URL should load through the current origin (Next.js proxy) rather than hardcoded localhost:4000!
  if (typeof window !== 'undefined') {
    const envUrl = process.env.NEXT_PUBLIC_API_URL || '';
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return url.startsWith('/') ? url : `/${url}`;
      }
    }
  }
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
}

