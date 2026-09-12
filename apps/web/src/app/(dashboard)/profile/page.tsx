'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { User as UserIcon, Lock, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data: any = {};
      if (username !== user?.username) data.username = username;
      if (firstName !== user?.firstName) data.firstName = firstName;
      if (lastName !== user?.lastName) data.lastName = lastName;
      
      if (password) {
        if (password !== confirmPassword) {
          toast.error('Şifreler eşleşmiyor');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          toast.error('Şifre en az 6 karakter olmalıdır');
          setLoading(false);
          return;
        }
        data.password = password;
      }
      
      if (Object.keys(data).length === 0) {
        toast('Değişiklik yapılmadı');
        setLoading(false);
        return;
      }
      
      const res = await fetchApi<any>('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      
      if (user && res.data) {
        setUser({
          ...user,
          username: res.data.username,
          firstName: res.data.firstName,
          lastName: res.data.lastName,
        });
      }
      
      toast.success('Profil güncellendi');
      setPassword('');
      setConfirmPassword('');
      
    } catch (error: any) {
      toast.error(error.message || 'Profil güncellenemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2">
          <UserIcon className="w-8 h-8 text-text-muted" />
          Profilim
        </h1>
        <p className="text-text-muted mt-1">Kişisel bilgilerinizi ve şifrenizi güncelleyin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title={
            <div className="flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-indigo-400" />
              Kişisel Bilgiler
            </div>
          } />
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <Input
                label="Kullanıcı Adı"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kullanıcı adınızı girin"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Ad"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <Input
                  label="Soyad"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <Input
                label="E-posta Adresi (Değiştirilemez)"
                value={user?.email || ''}
                disabled
              />
              
              <div className="pt-6 border-t border-border">
                <h4 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-text-muted" />
                  Şifre Değiştirme
                </h4>
                <div className="space-y-4">
                  <Input
                    type="password"
                    label="Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    label="Yeni Şifre Tekrar"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Hesap Güvenliği & Rol
            </div>
          } />
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-bg-card rounded-xl border border-border">
                <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1">Aktif Kurum Rolünüz</p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-medium text-text-primary">{user?.activeTenantName}</p>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    user?.role === 'OWNER' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 'bg-bg-secondary text-text-secondary'
                  }`}>
                    {user?.role === 'OWNER' ? 'Yönetici (Kurucu)' : 'Standart Üye'}
                  </span>
                </div>
                {user?.role === 'OWNER' && (
                  <p className="text-sm text-text-muted mt-3">
                    Yönetici olduğunuz için bu kuruma yeni üyeler ekleyebilir, kurum ayarlarını değiştirebilir veya kurumu silebilirsiniz.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
