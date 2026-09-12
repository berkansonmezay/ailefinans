'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { fetchApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await fetchApi<any>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      
      toast.success(data.message || 'Şifre sıfırlama bağlantısı gönderildi.');
      setIsSent(true);
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu.');
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
          
          <h1 className="text-2xl font-bold text-center mb-2">Şifremi Unuttum</h1>
          <p className="text-text-muted text-center mb-8">
            {isSent 
              ? "E-postanızı kontrol edin. Gelen kutunuzda veya spam klasöründe şifre sıfırlama bağlantısını bulabilirsiniz." 
              : "Kayıtlı e-posta adresinizi girin, size bir şifre sıfırlama bağlantısı gönderelim."}
          </p>

          {!isSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">E-posta Adresi</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  placeholder="ornek@email.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-accent hover:bg-accent-hover text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-70 mt-6"
              >
                {isLoading ? 'Gönderiliyor...' : 'Bağlantı Gönder'}
              </button>
            </form>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-bg-secondary hover:bg-border text-text-primary py-2.5 rounded-xl font-medium transition-colors mt-6"
            >
              Giriş Sayfasına Dön
            </button>
          )}

          <div className="mt-8 text-center text-sm text-text-muted">
            <Link href="/login" className="text-accent hover:underline flex items-center justify-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Giriş Ekranına Dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
