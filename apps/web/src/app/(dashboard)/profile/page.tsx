'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fetchApi } from '@/lib/api';
import { getAvatarUrl } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { User as UserIcon, Lock, Shield, Camera, Upload, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(user?.username || '');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const compressImageForAvatar = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDim = 400;
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.85);
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = objectUrl;
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fotoğraf boyutu 10 MB\'tan küçük olmalıdır.');
      return;
    }

    const isImageMime = file.type?.startsWith('image/');
    const isImageExt = /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || '');

    if (!isImageMime && !isImageExt) {
      toast.error('Lütfen geçerli bir resim dosyası seçin (JPG, PNG, WEBP).');
      return;
    }

    setUploadingAvatar(true);
    try {
      const processedBlob = await compressImageForAvatar(file);
      const formData = new FormData();
      formData.append('file', processedBlob, 'avatar.jpg');

      const res = await fetchApi<any>('/auth/avatar', {
        method: 'POST',
        body: formData,
      });

      const newAvatarUrl = res?.data?.avatarUrl || res?.avatarUrl;
      if (newAvatarUrl && user) {
        setAvatarError(false);
        setUser({
          ...user,
          avatarUrl: newAvatarUrl,
        });
        toast.success('Profil fotoğrafınız güncellendi.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Fotoğraf yüklenemedi.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.avatarUrl) return;

    setUploadingAvatar(true);
    try {
      await fetchApi('/auth/avatar', {
        method: 'DELETE',
      });

      if (user) {
        setUser({
          ...user,
          avatarUrl: null,
        });
      }
      toast.success('Profil fotoğrafınız kaldırıldı.');
    } catch (err: any) {
      toast.error(err.message || 'Fotoğraf kaldırılamadı.');
    } finally {
      setUploadingAvatar(false);
    }
  };

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
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-bg-secondary/40 border border-border/70 mb-5">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500/30 bg-bg-card shadow-md flex items-center justify-center relative">
                  {user?.avatarUrl && !avatarError ? (
                    <img
                      src={getAvatarUrl(user.avatarUrl)}
                      alt={`${user.firstName} ${user.lastName}`}
                      onError={() => setAvatarError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-blue-500/20 flex items-center justify-center text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {(user?.firstName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                    </div>
                  )}

                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer border-2 border-bg-card"
                  title="Fotoğrafı Değiştir"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-semibold text-sm text-text-primary">Profil Fotoğrafı</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  JPG, PNG veya WEBP (Maksimum 10 MB). Web ve mobil uygulamanızda görüntülenir.
                </p>

                <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />

                  <Button
                    type="button"
                    size="sm"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{user?.avatarUrl ? 'Fotoğrafı Değiştir' : 'Fotoğraf Yükle'}</span>
                  </Button>

                  {user?.avatarUrl && (
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={handleRemoveAvatar}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:text-white hover:bg-rose-500/90 border border-rose-500/20 bg-rose-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Kaldır</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

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
