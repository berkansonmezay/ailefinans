'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    tenantName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await fetchApi<any>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      
      toast.success('Kayıt başarılı! Sistem yöneticisinin onayından sonra giriş yapabilirsiniz.', { duration: 6000 });
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message || 'Kayıt işlemi başarısız.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md bg-bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white overflow-hidden flex items-center justify-center">
              <Image src="/logo.jpg" alt="Logo" width={64} height={64} className="object-cover" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-2">Hesap Oluşturun</h1>
          <p className="text-text-muted text-center mb-8">Ailenizin finansal yönetimini hemen başlatın.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Kullanıcı Adı</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full"
                placeholder="Örn: mehmet123"
                pattern="^[a-zA-Z0-9_.-]*$"
                title="Sadece harf, rakam, alt çizgi, nokta ve tire kullanabilirsiniz"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Adınız</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Soyadınız</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Aile / Hane Adı</label>
              <input
                type="text"
                name="tenantName"
                value={formData.tenantName}
                onChange={handleChange}
                className="w-full"
                placeholder="Örn: Yılmaz Ailesi"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">E-posta</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Şifre</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent hover:bg-accent-hover text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-70 mt-6"
            >
              {isLoading ? 'Oluşturuluyor...' : 'Kayıt Ol'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-text-muted">
            Zaten hesabınız var mı?{' '}
            <Link href="/login" className="text-accent hover:underline">
              Giriş Yapın
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
