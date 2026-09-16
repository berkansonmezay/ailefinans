'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Trash2, Edit2, Search, Plus, Tag, ArrowUpCircle, ArrowDownCircle, Users, Building, Settings as SettingsIcon, UserPlus, Cloud, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { CategoriesTab } from '@/components/settings/CategoriesTab';
import { MerchantsTab } from '@/components/settings/MerchantsTab';

export default function SettingsPage() {
  const { user, login } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'CURRENT' | 'TENANTS' | 'CATEGORIES' | 'MERCHANTS'>('CURRENT');
  
  // Profile States
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');

  // Current Tenant States
  const [tenant, setTenant] = useState<any>(null);
  const [tenantName, setTenantName] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('MEMBER');

  // Tenants List States
  const [myTenants, setMyTenants] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantCurrency, setNewTenantCurrency] = useState('TRY');
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');
  
  const [integrationInfoModalOpen, setIntegrationInfoModalOpen] = useState(false);

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

  const handleAddMember = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user?.activeTenantId) return;
    try {
      await fetchApi(`/tenants/${user.activeTenantId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: newMemberEmail, role: newMemberRole }),
      });
      toast.success('Üye davet edildi');
      setNewMemberEmail('');
      loadCurrentTenant();
    } catch (error: any) {
      toast.error(error.message || 'Üye eklenirken hata oluştu');
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!user?.activeTenantId) return;
    if (!confirm('Bu üyeyi çıkarmak istediğinize emin misiniz?')) return;
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
    if (!confirm('Bu kurumu ve içindeki tüm verileri SİLMEK istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
    
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
      <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-7 h-7 text-text-muted" />
            Ayarlar
          </h1>
          <p className="text-text-muted mt-1">Aile veya işletmenizin temel ayarlarını yönetin.</p>
        </div>

        <div className="bg-bg-card p-1 rounded-xl border border-border flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('CURRENT')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'CURRENT' ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Profil & Kurum
          </button>
          <button
            onClick={() => setActiveTab('CATEGORIES')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'CATEGORIES' ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Kategoriler
          </button>
          <button
            onClick={() => setActiveTab('MERCHANTS')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'MERCHANTS' ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Harcama Yerleri
          </button>
          {user?.systemRole === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('TENANTS')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'TENANTS' ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Kurumlarım
            </button>
          )}
        </div>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" /> Aile Üyeleri
              </h3>
              <span className="text-xs bg-bg-secondary text-text-secondary px-2.5 py-1 rounded-full font-medium">
                {tenant?.members?.length || 0} Üye
              </span>
            </div>
            
            <div className="bg-bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
              {tenant?.members?.map((m: any) => (
                <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center text-text-muted font-bold text-xs uppercase">
                      {m.firstName?.[0]}{m.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{m.firstName} {m.lastName}</p>
                      <p className="text-xs text-text-muted">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      m.role === 'OWNER' ? 'bg-amber-500/15 text-amber-500' : 'bg-bg-secondary text-text-secondary'
                    }`}>
                      {m.role === 'OWNER' ? 'Yönetici' : 'Üye'}
                    </span>
                    {user?.role === 'OWNER' && m.userId !== user.id && (
                      <button onClick={() => handleRemoveMember(m.userId)} className="text-text-muted hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10" title="Üyeyi Çıkar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {user?.role === 'OWNER' && (
                <div className="p-4 bg-bg-secondary/10 flex flex-col sm:flex-row items-end sm:items-center gap-3 border-t border-border/50 mt-2">
                  <div className="flex-1 w-full">
                    <input type="email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="Davet edilecek E-posta" className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                  <div className="w-full sm:w-auto">
                    <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)} className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors appearance-none min-w-[130px]">
                      <option value="MEMBER">Standart Üye</option>
                      <option value="OWNER">Yönetici</option>
                    </select>
                  </div>
                  <Button onClick={handleAddMember} className="w-full sm:w-auto whitespace-nowrap"><UserPlus className="w-4 h-4 mr-2"/>Davet Et</Button>
                </div>
              )}
            </div>
          </section>

          {/* Entegrasyonlar */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-400" /> Entegrasyonlar
              </h3>
              <button onClick={() => setIntegrationInfoModalOpen(true)} className="text-text-muted hover:text-blue-500 transition-colors" title="Nasıl Yapılır?">
                <Info className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 sm:gap-4 hover:bg-bg-secondary/30 transition-colors">
                <div className="sm:w-1/2">
                  <p className="text-sm font-medium text-text-primary">Google Drive Bağlantısı</p>
                  <p className="text-xs text-text-muted mt-0.5">Garanti ve fatura belgeleriniz kendi Google Drive hesabınızda güvenle saklansın.</p>
                </div>
                <div className="flex-1 flex justify-end">
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetchApi<any>('/integrations/google-drive/auth');
                        if (res && res.url) {
                          window.location.href = res.url;
                        }
                      } catch (error: any) {
                        toast.error(error.message || 'Drive bağlantısı başlatılamadı');
                      }
                    }} 
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Cloud className="w-4 h-4" /> Drive'ı Bağla
                  </button>
                </div>
              </div>
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

      <Modal isOpen={integrationInfoModalOpen} onClose={() => setIntegrationInfoModalOpen(false)} title="Google Drive Entegrasyon Rehberi">
        <div className="space-y-4 text-sm text-text-secondary pb-4">
          <p>
            Google Drive entegrasyonu sayesinde garanti belgelerinizi ve fatura görsellerinizi uygulamanın sunucusu yerine
            doğrudan <strong>kendi Google Drive alanınızda</strong> saklayabilirsiniz.
          </p>
          
          <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
            <h4 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" /> Sistem Yöneticisi İçin Kurulum Adımları
            </h4>
            <ul className="list-decimal list-inside space-y-2">
              <li><a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Cloud Console</a>'a giriş yapın.</li>
              <li>Yeni bir proje oluşturun ve <strong>Google Drive API</strong>'yi aktif hale getirin.</li>
              <li><strong>OAuth Consent Screen</strong> ayarlarını yapılandırın.</li>
              <li>Credentials bölümünden <strong>OAuth Client ID</strong> (Web Application) oluşturun.</li>
              <li>
                Yönlendirme (Redirect URI) adresi olarak şu anki sunucunuzun callback adresini girin: <br />
                <code className="bg-bg-secondary px-2 py-1 rounded text-xs break-all mt-1 inline-block text-text-primary">
                  {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/integrations/google-drive/callback
                </code>
              </li>
              <li>Oluşan <strong>Client ID</strong> ve <strong>Client Secret</strong> değerlerini backend uygulamanızın `.env` dosyasına kaydedip sunucuyu yeniden başlatın.</li>
            </ul>
          </div>
          
          <p>
            Yukarıdaki adımlar tamamlandıktan sonra <strong>"Drive'ı Bağla"</strong> butonunu kullanarak yetkilendirme işlemini gerçekleştirebilirsiniz.
          </p>

          <div className="pt-4 flex justify-end">
            <Button onClick={() => setIntegrationInfoModalOpen(false)}>Anladım</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
