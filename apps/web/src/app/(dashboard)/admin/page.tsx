'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Shield, CheckCircle, XCircle, Trash2, ShieldAlert, Key, Search, X, LogIn, Users, UserCheck, Clock, ShieldCheck, UserPlus, Eye, EyeOff } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  isActive: boolean;
  systemRole: string;
  createdAt: string;
  tenantName: string;
}

export default function AdminUsersPage() {
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [addFormData, setAddFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    tenantName: '',
    systemRole: 'USER',
    isActive: true,
  });

  const resetAddForm = () => {
    setAddFormData({
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      tenantName: '',
      systemRole: 'USER',
      isActive: true,
    });
    setShowPassword(false);
  };

  // Password Reset Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user: currentUser, startImpersonation } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) return;
    if (!currentUser.systemRole || !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.systemRole)) {
      router.push('/');
      return;
    }
    loadUsers();
  }, [currentUser]);

  const loadUsers = async () => {
    try {
      const res = await fetchApi<User[]>('/admin/users');
      setUsers(res);
    } catch (error: any) {
      toast.error('Kullanıcılar yüklenemedi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      await fetchApi(`/admin/users/${userId}/approve`, { method: 'PUT' });
      toast.success('Kullanıcı başarıyla onaylandı.');
      loadUsers();
    } catch (error: any) {
      toast.error('Onaylanırken hata oluştu: ' + error.message);
    }
  };

  const deleteUser = async (userId: string) => {
    const ok = await confirm({
      title: 'Kullanıcıyı Sil',
      message: 'Bu kullanıcıyı ve tüm verilerini kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    
    try {
      await fetchApi(`/admin/users/${userId}`, { method: 'DELETE' });
      toast.success('Kullanıcı reddedildi/silindi.');
      loadUsers();
    } catch (error: any) {
      toast.error('Silinirken hata oluştu: ' + error.message);
    }
  };

  const handleImpersonate = async (userId: string, userName: string) => {
    const ok = await confirm({
      title: 'Hesaba Geçiş Yap (Impersonate)',
      message: `${userName} adlı kullanıcının hesabına geçiş yapmak istediğinize emin misiniz?`,
      confirmText: 'Hesaba Geç',
      cancelText: 'Vazgeç',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      const res = await fetchApi<any>(`/admin/users/${userId}/impersonate`, { method: 'POST' });
      startImpersonation({
        user: res.user,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken
      });
      toast.success(`${userName} hesabına geçiş yapıldı.`);
      router.push('/');
    } catch (error: any) {
      toast.error('Geçiş işlemi başarısız: ' + error.message);
    }
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setSelectedUser(null);
    setNewPassword('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      setIsSubmitting(true);
      await fetchApi(`/admin/users/${selectedUser.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword })
      });
      toast.success(`${selectedUser.firstName} adlı kullanıcının şifresi başarıyla güncellendi.`);
      closePasswordModal();
    } catch (error: any) {
      toast.error('Şifre güncellenirken hata oluştu: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.firstName || !addFormData.lastName || !addFormData.email || !addFormData.password) {
      toast.error('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    if (addFormData.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      setIsSubmittingAdd(true);
      await fetchApi('/admin/users', {
        method: 'POST',
        body: JSON.stringify(addFormData),
      });
      toast.success(`${addFormData.firstName} ${addFormData.lastName} kullanıcısı başarıyla oluşturuldu.`);
      setIsAddModalOpen(false);
      resetAddForm();
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Kullanıcı oluşturulurken bir hata oluştu.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const searchStr = searchTerm.toLowerCase();
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const username = (u.username || '').toLowerCase();
    return fullName.includes(searchStr) || u.email.toLowerCase().includes(searchStr) || username.includes(searchStr);
  });

  if (isLoading) return <div className="p-8 text-center text-text-muted">Yükleniyor...</div>;

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const pendingUsers = users.filter(u => !u.isActive).length;
  const adminUsers = users.filter(u => ['ADMIN', 'SUPER_ADMIN'].includes(u.systemRole)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Sistem Yönetimi</h1>
          <p className="text-text-muted mt-1 text-sm">Sisteme kayıt olan yeni kullanıcıları onaylayın veya yönetin.</p>
        </div>
        <Button
          onClick={() => { resetAddForm(); setIsAddModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-2 rounded-xl px-4 py-2.5 shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Yeni Kullanıcı Ekle</span>
        </Button>
      </div>

      {/* KPI Cards - border-l-[5px] stili */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Toplam Kullanıcı - Blue */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-blue-600 transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Toplam Kullanıcı</p>
            <p className="text-2xl font-black text-text-primary tracking-tight font-mono mt-0.5">{totalUsers}</p>
            <p className="text-xs text-text-muted mt-0.5 font-medium">Kayıtlı hesap</p>
          </div>
        </div>

        {/* Onaylı Hesaplar - Emerald */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-emerald-500 transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Onaylı Hesaplar</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono mt-0.5">{activeUsers}</p>
            <p className="text-xs text-text-muted mt-0.5 font-medium">Aktif oturum izni</p>
          </div>
        </div>

        {/* Onay Bekleyenler - Amber */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-amber-500 transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Onay Bekleyenler</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono mt-0.5">{pendingUsers}</p>
            <p className="text-xs text-text-muted mt-0.5 font-medium">Onay gerektiren hesap</p>
          </div>
        </div>

        {/* Yöneticiler - Purple */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-purple-500 transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Yöneticiler</p>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight font-mono mt-0.5">{adminUsers}</p>
            <p className="text-xs text-text-muted mt-0.5 font-medium">Admin & Kurucu</p>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="İsim veya E-posta ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-bg-secondary/60 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-colors"
          />
        </div>
        <p className="text-xs text-text-muted font-medium">
          {filteredUsers.length} / {totalUsers} kullanıcı gösteriliyor
        </p>
      </div>

      {/* User Table */}
      <div className="bg-bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-sidebar border-b border-border">
              <tr>
                <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider">Kullanıcı</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider">Kurum (Aile)</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider">Kullanıcı Adı</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider">Mail Adresi</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider">Kayıt Tarihi</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider">Yetki</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider">Durum</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-bg-sidebar/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-text-primary">{u.firstName} {u.lastName}</div>
                  </td>
                  <td className="px-5 py-3.5 text-text-secondary text-sm">
                    {u.tenantName}
                  </td>
                  <td className="px-5 py-3.5 text-text-secondary text-sm font-mono">
                    {u.username ? `@${u.username}` : '-'}
                  </td>
                  <td className="px-5 py-3.5 text-text-secondary text-sm">
                    {u.email}
                  </td>
                  <td className="px-5 py-3.5 text-text-secondary text-sm">
                    {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-5 py-3.5">
                    {u.systemRole === 'SUPER_ADMIN' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        Kurucu
                      </span>
                    ) : u.systemRole === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Yönetici
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-bg-secondary text-text-muted border border-border">
                        Kullanıcı
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-500">
                        <CheckCircle size={12} /> Onaylı
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-500">
                        <ShieldAlert size={12} /> Bekliyor
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!u.isActive && (
                        <button
                          onClick={() => approveUser(u.id)}
                          className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 text-xs font-semibold rounded-lg hover:text-white transition-colors"
                        >
                          Onayla
                        </button>
                      )}
                      
                      {u.isActive && currentUser?.systemRole === 'SUPER_ADMIN' && currentUser.id !== u.id && (
                        <button
                          onClick={() => handleImpersonate(u.id, `${u.firstName} ${u.lastName}`)}
                          className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Bu hesapla giriş yap (Impersonate)"
                        >
                          <LogIn size={16} />
                        </button>
                      )}

                      <button
                        onClick={() => openPasswordModal(u)}
                        className="p-1.5 text-text-muted hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="Şifreyi Sıfırla / Değiştir"
                      >
                        <Key size={16} />
                      </button>

                      {u.systemRole !== 'ADMIN' && (
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Sil / Reddet"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-text-muted">
                    Kullanıcı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Reset Modal */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                Şifre Sıfırlama
              </h3>
              <button 
                onClick={closePasswordModal}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-text-secondary mb-4">
                  <strong className="text-text-primary">{selectedUser.firstName} {selectedUser.lastName}</strong> adlı kullanıcının şifresini değiştirmek üzeresiniz. Yeni şifreyi aşağıya girin.
                </p>
                
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Yeni Şifre
                </label>
                <input
                  type="text" // using text so admin can see what they are setting easily
                  autoComplete="off"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  className="w-full px-4 py-2 bg-bg-sidebar border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={closePasswordModal}>
                  İptal
                </Button>
                <Button type="submit" disabled={isSubmitting || newPassword.length < 6}>
                  {isSubmitting ? 'Kaydediliyor...' : 'Şifreyi Değiştir'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Yeni Kullanıcı Ekleme Modalı */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-secondary/20">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                Yeni Kullanıcı Ekle
              </h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); resetAddForm(); }}
                className="text-text-muted hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Ad <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addFormData.firstName}
                    onChange={(e) => setAddFormData({ ...addFormData, firstName: e.target.value })}
                    placeholder="Örn: Ahmet"
                    className="w-full px-3.5 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Soyad <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addFormData.lastName}
                    onChange={(e) => setAddFormData({ ...addFormData, lastName: e.target.value })}
                    placeholder="Örn: Yılmaz"
                    className="w-full px-3.5 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  E-Posta Adresi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                  placeholder="ahmet@example.com"
                  className="w-full px-3.5 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Kullanıcı Adı <span className="text-text-muted text-[10px] font-normal lowercase">(isteğe bağlı)</span>
                  </label>
                  <input
                    type="text"
                    value={addFormData.username}
                    onChange={(e) => setAddFormData({ ...addFormData, username: e.target.value })}
                    placeholder="Boşsa e-postadan üretilir"
                    className="w-full px-3.5 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Şifre <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={addFormData.password}
                      onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                      placeholder="En az 6 karakter"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                      title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Aile / Kurum Adı <span className="text-text-muted text-[10px] font-normal lowercase">(isteğe bağlı)</span>
                  </label>
                  <input
                    type="text"
                    value={addFormData.tenantName}
                    onChange={(e) => setAddFormData({ ...addFormData, tenantName: e.target.value })}
                    placeholder={addFormData.firstName ? `${addFormData.firstName} Ailesi` : "Örn: Yılmaz Ailesi"}
                    className="w-full px-3.5 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Sistem Yetkisi
                  </label>
                  <select
                    value={addFormData.systemRole}
                    onChange={(e) => setAddFormData({ ...addFormData, systemRole: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all"
                  >
                    <option value="USER">Standart Kullanıcı (USER)</option>
                    <option value="ADMIN">Sistem Yöneticisi (ADMIN)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-xl bg-bg-secondary/30 border border-border hover:bg-bg-secondary/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={addFormData.isActive}
                    onChange={(e) => setAddFormData({ ...addFormData, isActive: e.target.checked })}
                    className="w-4 h-4 mt-0.5 text-emerald-600 rounded border-border focus:ring-emerald-500/50"
                  />
                  <div>
                    <span className="text-sm font-semibold text-text-primary">Doğrudan Onayla & Aktif Et</span>
                    <p className="text-xs text-text-muted mt-0.5">İşaretlendiğinde kullanıcı yönetici onayı beklemeden hemen giriş yapabilir.</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border mt-4">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => { setIsAddModalOpen(false); resetAddForm(); }}
                >
                  Vazgeç
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmittingAdd}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-2"
                >
                  {isSubmittingAdd ? 'Oluşturuluyor...' : 'Kullanıcıyı Oluştur'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
