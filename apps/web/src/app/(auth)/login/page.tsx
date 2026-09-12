'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await fetchApi<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      
      login(data);
      toast.success('Giriş başarılı!');
      router.push('/');
    } catch (error: any) {
      toast.error(error.message || 'Giriş başarısız.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white overflow-hidden flex items-center justify-center">
              <Image src="/logo.jpg" alt="Logo" width={64} height={64} className="object-cover" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-2">Hoş Geldiniz</h1>
          <p className="text-text-muted text-center mb-8">Devam etmek için giriş yapın.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">E-posta veya Kullanıcı Adı</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full"
                placeholder="Kullanıcı adı veya e-posta"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex justify-end mt-2">
              <Link href="/forgot-password" className="text-sm text-accent hover:underline">
                Şifrenizi mi unuttunuz?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent hover:bg-accent-hover text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-70 mt-6"
            >
              {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-text-muted">
            Hesabınız yok mu?{' '}
            <Link href="/register" className="text-accent hover:underline">
              Kayıt Olun
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
