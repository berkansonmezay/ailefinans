'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { Trash2, Edit2, Search, Plus, Tag, ArrowUpCircle, ArrowDownCircle, Users, Building, Settings as SettingsIcon, UserPlus, ChevronDown, ChevronUp, Wallet, Shield, ArrowRight, Eye, EyeOff, Sparkles, Key, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { CategoriesTab } from '@/components/settings/CategoriesTab';
import { MerchantsTab } from '@/components/settings/MerchantsTab';

export default function SettingsPage() {
  const { confirm } = useConfirm();
  const { user, login } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'CURRENT' | 'TENANTS' | 'CATEGORIES' | 'MERCHANTS'>('CURRENT');
  const [showGuide, setShowGuide] = useState(false);
  
  // Profile States
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');

  // Current Tenant States
  const [tenant, setTenant] = useState<any>(null);
  const [tenantName, setTenantName] = useState('');
  const [currency, setCurrency] = useState('TRY');

  // Add Member Modal State (Model 1)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [showMemberPassword, setShowMemberPassword] = useState(false);
  const [memberForm, setMemberForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'MEMBER',
  });

  // Tenants List States
  const [myTenants, setMyTenants] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantCurrency, setNewTenantCurrency] = useState('TRY');
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');

  const loadCurrentTenant = async () => {
    try {
      if (user?.activeTenantId) {
        const res = await fetchApi<any>(`/tenants/${user.activeTenantId}`);
        const t = res.data || res;
        setTenant(t);
        setTenantName(t.name);
        setCurrency(t.currency || 'TRY');
      }
    } catch (error: any) {
      toast.error('Ayarlar yüklenemedi');
    }
  };

  const loadMyTenants = async () => {
    try {
      const res = await fetchApi<any>('/tenants');
      setMyTenants(res.data || res.items || res);
    } catch (error: any) {
      toast.error('Kurumlar yüklenemedi');
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await loadCurrentTenant();
      await loadMyTenants();
      
      if (user) {
        setUsername(user.username || '');
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
      }

      setLoading(false);
    };
    loadAll();
  }, [user]);

  const handleUpdateProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      const res = await fetchApi<any>('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({
          firstName,
          lastName,
          ...(username ? { username } : {}),
          ...(password ? { password } : {}),
        }),
      });
      toast.success('Profil bilgileriniz güncellendi');
      
      if (user && res) {
        // fetchApi returns the data object directly, so res might be the user object or have data inside it
        const updatePayload = res.data || res;
        const updatedUser = { ...user, ...updatePayload };
        useAuthStore.setState({ user: updatedUser });
      }
      setPassword(''); // Clear password field after successful update
    } catch (error: any) {
      toast.error(error.message || 'Profil güncellenemedi');
    }
  };

  const handleUpdateTenant = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user?.activeTenantId) return;
    try {
      const res = await fetchApi<any>(`/tenants/${user.activeTenantId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: tenantName, currency }),
      });
      toast.success('Aile/Kurum ayarları güncellendi');
      
      // Update local storage user state with new tenant name
      if (user && res) {
        const newName = res.name || res.data?.name;
        if (newName) {
          const updatedUser = { ...user, activeTenantName: newName };
          useAuthStore.setState({ user: updatedUser });
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Güncelleme başarısız');
    }
  };

  const canManageMembers = user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.systemRole === 'ADMIN' || user?.systemRole === 'SUPER_ADMIN';

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setMemberForm(prev => ({ ...prev, password: pass }));
  };

  const handleAddMember = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user?.activeTenantId) return;

    if (!memberForm.email.trim() || !memberForm.firstName.trim() || !memberForm.lastName.trim()) {
      toast.error('Lütfen ad, soyad ve e-posta alanlarını doldurun');
      return;
    }

    if (memberForm.password && memberForm.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setIsSubmittingMember(true);
    try {
      const res = await fetchApi<any>(`/tenants/${user.activeTenantId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          firstName: memberForm.firstName.trim(),
          lastName: memberForm.lastName.trim(),
          email: memberForm.email.trim(),
          password: memberForm.password.trim() || undefined,
          role: memberForm.role,
        }),
      });

      toast.success(res?.message || 'Üye başarıyla eklendi');
      setIsAddMemberModalOpen(false);
      setMemberForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'MEMBER',
      });
      setShowMemberPassword(false);
      loadCurrentTenant();
    } catch (error: any) {
      toast.error(error.message || 'Üye eklenirken hata oluştu');
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!user?.activeTenantId) return;
    const ok = await confirm({
      title: 'Üyeyi Çıkar',
      message: 'Bu üyeyi kurumdan çıkarmak istediğinize emin misiniz?',
      confirmText: 'Evet, Çıkar',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await fetchApi(`/tenants/${user.activeTenantId}/members/${memberUserId}`, {
        method: 'DELETE',
      });
      toast.success('Üye çıkarıldı');
      loadCurrentTenant();
    } catch (error: any) {
      toast.error(error.message || 'Üye çıkarılamadı');
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/tenants', {
        method: 'POST',
        body: JSON.stringify({ name: newTenantName, currency: newTenantCurrency }),
      });
      toast.success('Yeni kurum oluşturuldu');
      setIsModalOpen(false);
      setNewTenantName('');
      loadMyTenants();
    } catch (error: any) {
      toast.error(error.message || 'Kurum oluşturulamadı');
    }
  };

  const handleSwitchTenant = async (tenantId: string) => {
    if (tenantId === user?.activeTenantId) return;
    try {
      const res = await fetchApi<any>('/auth/switch-tenant', {
        method: 'POST',
        body: JSON.stringify({ tenantId }),
      });
      
      // The backend returns the new auth tokens and user object directly via fetchApi (which strips the outer {success, data} wrapper)
      if (res && res.accessToken) {
        login(res);
        toast.success('Kurum değiştirildi');
        window.location.href = '/'; // Reload completely to clear React states
      }
    } catch (error: any) {
      toast.error(error.message || 'Kurum değiştirilemedi');
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (tenantId === user?.activeTenantId) {
      toast.error('Aktif olduğunuz kurumu silemezsiniz. Lütfen önce başka bir kuruma geçiş yapın.');
      return;
    }
    const ok = await confirm({
      title: 'Kurumu Sil',
      message: 'Bu kurumu ve içindeki tüm verileri SİLMEK istediğinize emin misiniz? Bu işlem geri alınamaz!',
      confirmText: 'Kurumu Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    
    try {
      await fetchApi(`/tenants/${tenantId}`, {
        method: 'DELETE',
      });
      toast.success('Kurum başarıyla silindi');
      loadMyTenants();
    } catch (error: any) {
      toast.error(error.message || 'Kurum silinemedi');
    }
  };

  if (loading) return <div className="text-text-muted">Yükleniyor...</div>;
  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Ayarlar</h1>
        <p className="text-text-muted mt-1 text-sm">Aile veya işletmenizin temel ayarlarını yönetin.</p>
      </div>

      {/* KPI Cards - border-l-[5px] stili */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Aktif Kurum - Blue */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-blue-600 transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Aktif Kurum</p>
            <p className="text-base font-black text-text-primary tracking-tight mt-0.5 truncate">{tenant?.name || '—'}</p>
            <p className="text-xs text-text-muted mt-0.5 font-medium">Para birimi: {tenant?.currency || '—'}</p>
          </div>
        </div>

        {/* Kullanıcı Rolü - Purple */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-purple-500 transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Kullanıcı Rolü</p>
            <p className="text-base font-black text-text-primary tracking-tight mt-0.5 truncate">
              {user?.systemRole === 'SUPER_ADMIN' ? 'Kurucu' : user?.systemRole === 'ADMIN' ? 'Yönetici' : 'Üye'}
            </p>
            <p className="text-xs text-text-muted mt-0.5 font-medium">{user?.email || '—'}</p>
          </div>
        </div>

        {/* Üye Sayısı - Emerald */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-emerald-500 transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Kurum Üyeleri</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono mt-0.5">
              {myTenants.length}
            </p>
            <p className="text-xs text-text-muted mt-0.5 font-medium">Kayıtlı kurum sayısı</p>
          </div>
        </div>

        {/* Para Birimi - Amber */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-amber-500 transition-all hover:shadow-md">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Varsayılan Para Birimi</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono mt-0.5">{tenant?.currency || '—'}</p>
            <p className="text-xs text-text-muted mt-0.5 font-medium">Finansal raporlama birimi</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Modern style */}
      <div className="bg-bg-card p-1.5 rounded-2xl border border-border flex flex-wrap gap-1 shadow-sm">
        <button
          onClick={() => setActiveTab('CURRENT')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'CURRENT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
          }`}
        >
          Profil & Kurum
        </button>
        <button
          onClick={() => setActiveTab('CATEGORIES')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'CATEGORIES' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
          }`}
        >
          Kategoriler
        </button>
        <button
          onClick={() => setActiveTab('MERCHANTS')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'MERCHANTS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
          }`}
        >
          Harcama Yerleri
        </button>
        {user?.systemRole === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('TENANTS')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'TENANTS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
            }`}
          >
            Kurumlarım
          </button>
        )}
      </div>

      {activeTab === 'CURRENT' && (
        <div className="space-y-8 max-w-4xl">
          {/* Profil Bilgileri */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> Kişisel Profil Bilgileri
            </h3>
            <div className="bg-bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 sm:gap-4 hover:bg-bg-secondary/30 transition-colors">
                <div className="sm:w-1/3"><p className="text-sm font-medium text-text-primary">Ad</p></div>
                <div className="flex-1">
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 sm:gap-4 hover:bg-bg-secondary/30 transition-colors">
                <div className="sm:w-1/3"><p className="text-sm font-medium text-text-primary">Soyad</p></div>
                <div className="flex-1">
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 sm:gap-4 hover:bg-bg-secondary/30 transition-colors">
                <div className="sm:w-1/3">
                  <p className="text-sm font-medium text-text-primary">Kullanıcı Adı</p>
                  <p className="text-xs text-text-muted mt-0.5">Sisteme giriş yaparken kullanabileceğiniz benzersiz ad</p>
                </div>
                <div className="flex-1">
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="kullanici_adi" className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 sm:gap-4 hover:bg-bg-secondary/30 transition-colors">
                <div className="sm:w-1/3">
                  <p className="text-sm font-medium text-text-primary">Yeni Şifre</p>
                  <p className="text-xs text-text-muted mt-0.5">Değiştirmek istemiyorsanız boş bırakın</p>
                </div>
                <div className="flex-1">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
              </div>
              <div className="p-4 bg-bg-secondary/20 flex justify-end">
                <Button onClick={handleUpdateProfile}>Profili Güncelle</Button>
              </div>
            </div>
          </section>

          {/* Kurum Bilgileri */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-400" /> Aktif Aile / Kurum Bilgileri
            </h3>
            <div className="bg-bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 sm:gap-4 hover:bg-bg-secondary/30 transition-colors">
                <div className="sm:w-1/3">
                  <p className="text-sm font-medium text-text-primary">Aile/Kurum Adı</p>
                </div>
                <div className="flex-1">
                  <input type="text" value={tenantName} onChange={(e) => setTenantName(e.target.value)} required className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 sm:gap-4 hover:bg-bg-secondary/30 transition-colors">
                <div className="sm:w-1/3">
                  <p className="text-sm font-medium text-text-primary">Varsayılan Para Birimi</p>
                  <p className="text-xs text-text-muted mt-0.5">Tüm raporlarda baz alınacak kur</p>
                </div>
                <div className="flex-1">
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors appearance-none">
                    <option value="TRY">Türk Lirası (₺)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="EUR">Euro (€)</option>
                  </select>
                </div>
              </div>
              <div className="p-4 bg-bg-secondary/20 flex justify-end">
                <Button onClick={handleUpdateTenant}>Kurumu Güncelle</Button>
              </div>
            </div>
          </section>

          {/* Aile Üyeleri */}
          <section>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" /> Aile Üyeleri
                </h3>
                <span className="text-xs bg-bg-secondary text-text-secondary px-2.5 py-0.5 rounded-full font-medium">
                  {tenant?.members?.length || 0} Üye
                </span>
              </div>
              
              {canManageMembers && (
                <Button 
                  size="sm" 
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Yeni Üye Ekle
                </Button>
              )}
            </div>
            
            <div className="bg-bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
              {tenant?.members?.map((m: any) => (
                <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-bold text-xs uppercase shadow-sm shrink-0">
                      {m.firstName?.[0]}{m.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary flex items-center gap-2">
                        {m.firstName} {m.lastName}
                        {m.userId === user?.id && (
                          <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Siz
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-muted">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                      m.role === 'OWNER' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' :
                      m.role === 'ADMIN' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                      m.role === 'VIEWER' ? 'bg-gray-500/15 text-gray-400 border border-gray-500/30' :
                      'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                    }`}>
                      {m.role === 'OWNER' ? 'Kurucu' : m.role === 'ADMIN' ? 'Yönetici' : m.role === 'VIEWER' ? 'İzleyici' : 'Standart Üye'}
                    </span>
                    {canManageMembers && m.userId !== user?.id && (
                      <button 
                        onClick={() => handleRemoveMember(m.userId)} 
                        className="text-text-muted hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 cursor-pointer" 
                        title="Üyeyi Aileden Çıkar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {canManageMembers && (
                <div className="p-4 bg-bg-secondary/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-border/50">
                  <p className="text-xs text-text-muted">
                    Ailenize eşiniz, çocuklarınız veya ortaklarınızı ekleyerek bütçeyi birlikte yönetebilirsiniz.
                  </p>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => setIsAddMemberModalOpen(true)}
                    className="whitespace-nowrap text-xs cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Yeni Üye Ekle
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'TENANTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Kurum Ara..."
                value={tenantSearchQuery}
                onChange={(e) => setTenantSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="w-5 h-5 mr-2" />
              Yeni Kurum Ekle
            </Button>
          </div>
          
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {myTenants
                .filter((t: any) => t.name.toLowerCase().includes(tenantSearchQuery.toLowerCase()))
                .map((t: any) => (
                  <div key={t.id} className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-bg-secondary/50 ${t.id === user?.activeTenantId ? 'bg-emerald-500/5' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl flex-shrink-0 ${t.id === user?.activeTenantId ? 'bg-emerald-500/20 text-emerald-500' : 'bg-bg-secondary text-text-muted'}`}>
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-text-primary">{t.name}</h3>
                          {t.id === user?.activeTenantId && (
                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-text-muted mt-0.5">{t.currency} - {t.role === 'OWNER' ? 'Yönetici' : 'Üye'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {t.id !== user?.activeTenantId && (
                        <Button onClick={() => handleSwitchTenant(t.id)} variant="secondary" size="sm">
                          Geçiş Yap
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                      {t.role === 'OWNER' && t.id !== user?.activeTenantId && (
                        <Button onClick={() => handleDeleteTenant(t.id)} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-2">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
              ))}
              
              {myTenants.filter((t: any) => t.name.toLowerCase().includes(tenantSearchQuery.toLowerCase())).length === 0 && (
                <div className="p-8 text-center text-text-muted text-sm">
                  Arama kriterlerine uygun kurum bulunamadı.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'CATEGORIES' && <CategoriesTab />}
      {activeTab === 'MERCHANTS' && <MerchantsTab />}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yeni Kurum/Aile Oluştur">
        <form onSubmit={handleCreateTenant} className="space-y-4">
          <Input 
            label="Kurum veya Aile Adı" 
            placeholder="Örn: Yazlık Ev, Şirketim..." 
            value={newTenantName}
            onChange={(e) => setNewTenantName(e.target.value)}
            required
          />
          <Select
            label="Varsayılan Para Birimi"
            value={newTenantCurrency}
            onChange={(e) => setNewTenantCurrency(e.target.value)}
            options={[
              { value: 'TRY', label: 'Türk Lirası (₺)' },
              { value: 'USD', label: 'US Dollar ($)' },
              { value: 'EUR', label: 'Euro (€)' },
            ]}
          />
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>İptal</Button>
            <Button type="submit">Oluştur</Button>
          </div>
        </form>
      </Modal>

      {/* Aileye Yeni Üye Ekle Modalı (Model 1) */}
      <Modal 
        isOpen={isAddMemberModalOpen} 
        onClose={() => setIsAddMemberModalOpen(false)} 
        title="Aileye Yeni Üye Ekle"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <p className="text-xs text-text-muted leading-relaxed">
            Aile bireyinizin bilgilerini girerek doğrudan aile hesabınıza yeni bir kullanıcı ekleyin. Belirlediğiniz şifre ile anında giriş yapabilir.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Ad *</label>
              <input
                type="text"
                placeholder="Örn: Ayşe"
                value={memberForm.firstName}
                onChange={(e) => setMemberForm({ ...memberForm, firstName: e.target.value })}
                required
                className="w-full bg-bg-card border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Soyad *</label>
              <input
                type="text"
                placeholder="Örn: Sönmezay"
                value={memberForm.lastName}
                onChange={(e) => setMemberForm({ ...memberForm, lastName: e.target.value })}
                required
                className="w-full bg-bg-card border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">E-posta Adresi *</label>
            <input
              type="email"
              placeholder="Örn: ornek@gmail.com"
              value={memberForm.email}
              onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
              required
              className="w-full bg-bg-card border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Eğer bu e-posta adresi sistemde zaten kayıtlıysa, mevcut hesap doğrudan bu aileye bağlanır.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-text-secondary">Giriş Şifresi *</label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] text-emerald-500 hover:text-emerald-400 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Sparkles size={12} /> Rastgele Şifre Üret
              </button>
            </div>
            <div className="relative">
              <input
                type={showMemberPassword ? 'text' : 'password'}
                placeholder="En az 6 karakter"
                value={memberForm.password}
                onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                minLength={6}
                required
                className="w-full bg-bg-card border border-border rounded-xl pl-3 pr-10 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowMemberPassword(!showMemberPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
              >
                {showMemberPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Aile İçi Rolü</label>
            <select
              value={memberForm.role}
              onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
              className="w-full bg-bg-card border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors appearance-none"
            >
              <option value="MEMBER">Standart Üye (Gelir/Gider ekleyebilir, takip edebilir)</option>
              <option value="VIEWER">İzleyici (Sadece görüntüleyebilir, işlem ekleyemez)</option>
              <option value="OWNER">Yönetici (Tüm ayarları ve üyeleri yönetebilir)</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-border/50">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setIsAddMemberModalOpen(false)}
              disabled={isSubmittingMember}
            >
              İptal
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmittingMember}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
            >
              {isSubmittingMember ? (
                <span>Ekleniyor...</span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus size={16} /> Üyeyi Oluştur ve Ekle
                </span>
              )}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
