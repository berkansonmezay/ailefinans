'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Shield, CheckCircle, XCircle, Trash2, ShieldAlert, Key, Search, X, LogIn } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  systemRole: string;
  createdAt: string;
  tenantName: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Password Reset Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user: currentUser, startImpersonation } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) return;
    if (!['ADMIN', 'SUPER_ADMIN'].includes(currentUser.systemRole)) {
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
    if (!confirm('Bu kullanıcıyı ve tüm verilerini kalıcı olarak silmek istediğinize emin misiniz?')) return;
    
    try {
      await fetchApi(`/admin/users/${userId}`, { method: 'DELETE' });
      toast.success('Kullanıcı reddedildi/silindi.');
      loadUsers();
    } catch (error: any) {
      toast.error('Silinirken hata oluştu: ' + error.message);
    }
  };

  const handleImpersonate = async (userId: string, userName: string) => {
    if (!confirm(`${userName} adlı kullanıcının hesabına geçiş yapmak istediğinize emin misiniz?`)) return;
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

  const filteredUsers = users.filter(u => {
    const searchStr = searchTerm.toLowerCase();
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    return fullName.includes(searchStr) || u.email.toLowerCase().includes(searchStr);
  });

  if (isLoading) return <div className="p-8 text-center text-text-muted">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Shield className="w-8 h-8 text-red-500" />
            Sistem Yönetimi
          </h1>
          <p className="text-text-secondary mt-1">Sisteme kayıt olan yeni kullanıcıları onaylayın veya yönetin.</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-text-muted" />
          </div>
          <input
            type="text"
            placeholder="İsim veya E-posta ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl bg-bg-card text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent sm:text-sm transition-colors"
          />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-sidebar border-b border-border">
              <tr>
                <th className="px-4 py-2.5 font-semibold text-text-secondary">Kullanıcı</th>
                <th className="px-4 py-2.5 font-semibold text-text-secondary">Kurum (Aile)</th>
                <th className="px-4 py-2.5 font-semibold text-text-secondary">Kayıt Tarihi</th>
                <th className="px-4 py-2.5 font-semibold text-text-secondary">Yetki</th>
                <th className="px-4 py-2.5 font-semibold text-text-secondary">Durum</th>
                <th className="px-4 py-2.5 font-semibold text-text-secondary text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-bg-sidebar/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-text-primary">{u.firstName} {u.lastName}</div>
                    <div className="text-text-muted text-xs">{u.email}</div>
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    {u.tenantName}
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-4 py-2.5">
                    {u.systemRole === 'SUPER_ADMIN' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        Kurucu
                      </span>
                    ) : u.systemRole === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Yönetici
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-bg-secondary text-text-muted border border-border">
                        Kullanıcı
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-500">
                        <CheckCircle size={14} /> Onaylı
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500">
                        <ShieldAlert size={14} /> Bekliyor
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!u.isActive && (
                        <button
                          onClick={() => approveUser(u.id)}
                          className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 text-xs font-medium rounded-lg hover:text-text-primary transition-colors"
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
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                    Kullanıcı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

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
    </div>
  );
}
