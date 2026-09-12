'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { fetchApi } from '@/lib/api';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      toast.error('Geçersiz veya eksik şifre sıfırlama bağlantısı.');
      router.push('/login');
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor.');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    setIsLoading(true);

    try {
      const data = await fetchApi<any>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      
      toast.success(data.message || 'Şifreniz başarıyla güncellendi.');
      setIsSuccess(true);
    } catch (error: any) {
      toast.error(error.message || 'Şifre güncellenirken bir hata oluştu. Linkin süresi dolmuş olabilir.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white overflow-hidden flex items-center justify-center">
              <Image src="/logo.jpg" alt="Logo" width={64} height={64} className="object-cover" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-2">Yeni Şifre Belirle</h1>
          <p className="text-text-muted text-center mb-8">
            {isSuccess 
              ? "Şifreniz başarıyla güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz." 
              : "Lütfen hesabınız için yeni bir şifre girin."}
          </p>

          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Yeni Şifre</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Yeni Şifre (Tekrar)</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !password || !confirmPassword}
                className="w-full bg-accent hover:bg-accent-hover text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-70 mt-6"
              >
                {isLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
              </button>
            </form>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-accent hover:bg-accent-hover text-white py-2.5 rounded-xl font-medium transition-colors mt-6"
            >
              Giriş Sayfasına Git
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
