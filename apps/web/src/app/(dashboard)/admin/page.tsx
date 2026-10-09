'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { 
  Shield, CheckCircle, XCircle, Trash2, ShieldAlert, Key, Search, X, LogIn, 
  Users, UserCheck, Clock, ShieldCheck, UserPlus, Eye, EyeOff, SlidersHorizontal, 
  Package, Zap, Crown, Pencil, Home, Building2, Plus, ArrowRight,
  FolderTree, ChevronDown, ChevronRight, CornerDownRight, ListTree
} from 'lucide-react';
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
  avatarUrl?: string | null;
  isActive: boolean;
  systemRole: string;
  disabledMenus?: string[];
  createdAt: string;
  tenantId?: string | null;
  tenantName: string;
  tenantRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
}

interface TenantMemberInfo {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  username?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  isActive: boolean;
  joinedAt: string;
}

interface Tenant {
  id: string;
  name: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  owner: {
    id: string;
    fullName: string;
    email: string;
    username?: string;
  } | null;
  members: TenantMemberInfo[];
  stats: {
    memberCount: number;
    accountCount: number;
    transactionCount: number;
    debtCount: number;
  };
}

const MENU_PACKAGES = [
  {
    id: 'basic',
    name: 'Temel Paket',
    badge: 'Temel',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    icon: Package,
    iconColor: 'text-blue-500 bg-blue-500/10',
    description: 'Gelir-gider, taksitli borç/alacaklar, hesaplar ve raporlar',
    menus: [
      { key: 'overview', name: 'Kontrol Paneli', description: 'Finansal özet ve grafikler' },
      { key: 'transactions', name: 'İşlemler', description: 'Gelir ve gider kayıtları' },
      { key: 'debts', name: 'Taksitli Borçlar', description: 'Borç takipleri ve taksitler' },
      { key: 'receivables', name: 'Taksitli Alacaklar', description: 'Alacak takipleri ve taksitler' },
      { key: 'reports', name: 'Raporlar', description: 'Detaylı finansal grafikler' },
      { key: 'accounts', name: 'Hesaplar', description: 'Banka hesapları ve cüzdanlar' },
      { key: 'settings', name: 'Ayarlar', description: 'Kurum ve kategori ayarları' },
      { key: 'guide', name: 'Yardım', description: 'Kullanım rehberi' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro Paket',
    badge: 'Pro',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
    icon: Zap,
    iconColor: 'text-purple-500 bg-purple-500/10',
    description: 'Mali takvim, abonelik takipleri, hatırlatıcılar ve garanti takipleri',
    menus: [
      { key: 'subscriptions', name: 'Abonelikler', description: 'Düzenli abonelik ödemeleri' },
      { key: 'reminders', name: 'Hatırlatıcılar', description: 'Ödeme ve etkinlik bildirimleri' },
      { key: 'calendar', name: 'Takvim', description: 'Mali takvim ve vadeler' },
      { key: 'warranties', name: 'Garanti & Fatura', description: 'Ürün garanti takipleri' },
    ],
  },
  {
    id: 'premium',
    name: 'Premium Paket',
    badge: 'Premium',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    icon: Crown,
    iconColor: 'text-amber-500 bg-amber-500/10',
    description: 'Yatırım portföyleri (Hisse, Kripto, Döviz/Altın) ve AI Fatura Tarama',
    menus: [
      { key: 'savings', name: 'Altın & Döviz', description: 'Kıymetli maden ve döviz birikimleri' },
      { key: 'stocks', name: 'Hisselerim', description: 'Borsa ve hisse senedi takibi' },
      { key: 'crypto', name: 'Kripto Varlıklar', description: 'Kripto para portföyü' },
      { key: 'invoices', name: 'Fatura Tarama (AI)', description: 'Fiş ve fatura okuma (Yapay Zeka)' },
    ],
  },
];

const ALL_APP_MENUS = MENU_PACKAGES.flatMap(pkg => pkg.menus);

export default function AdminUsersPage() {
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'tenants'>('users');
  const [isFamilyView, setIsFamilyView] = useState(false);
  const [collapsedFamilies, setCollapsedFamilies] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleFamilyCollapse = (tenantId: string) => {
    setCollapsedFamilies(prev => {
      const next = new Set(prev);
      if (next.has(tenantId)) {
        next.delete(tenantId);
      } else {
        next.add(tenantId);
      }
      return next;
    });
  };

  const expandAllFamilies = () => {
    setCollapsedFamilies(new Set());
  };

  const collapseAllFamilies = (allTenantIds: string[]) => {
    setCollapsedFamilies(new Set(allTenantIds));
  };
  
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
    tenantMode: 'new' as 'new' | 'existing',
    tenantName: '',
    existingTenantId: '',
    tenantRole: 'MEMBER' as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER',
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
      tenantMode: 'new',
      tenantName: '',
      existingTenantId: '',
      tenantRole: 'MEMBER',
      systemRole: 'USER',
      isActive: true,
    });
    setShowPassword(false);
  };

  const openAddUserForTenant = (tenantId: string) => {
    resetAddForm();
    setAddFormData({
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      tenantMode: 'existing',
      tenantName: '',
      existingTenantId: tenantId,
      tenantRole: 'MEMBER',
      systemRole: 'USER',
      isActive: true,
    });
    setIsAddModalOpen(true);
  };

  // Password Reset Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Menu Permissions Modal State
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [selectedUserForMenus, setSelectedUserForMenus] = useState<User | null>(null);
  const [menuFormData, setMenuFormData] = useState<string[]>([]);
  const [isSubmittingMenus, setIsSubmittingMenus] = useState(false);

  const openMenuModal = (user: User) => {
    setSelectedUserForMenus(user);
    setMenuFormData(user.disabledMenus || []);
    setIsMenuModalOpen(true);
  };

  const closeMenuModal = () => {
    setIsMenuModalOpen(false);
    setSelectedUserForMenus(null);
    setMenuFormData([]);
  };

  const toggleMenu = (key: string) => {
    setMenuFormData(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const applyPreset = (preset: 'basic' | 'pro' | 'premium' | 'none') => {
    if (preset === 'none') {
      // Tümünü gizle
      setMenuFormData(ALL_APP_MENUS.map(m => m.key));
    } else if (preset === 'basic') {
      // Yalnızca Temel Paket açık (Pro ve Premium kapalı)
      const basicKeys = MENU_PACKAGES.find(p => p.id === 'basic')!.menus.map(m => m.key);
      const disabled = ALL_APP_MENUS.map(m => m.key).filter(k => !basicKeys.includes(k));
      setMenuFormData(disabled);
    } else if (preset === 'pro') {
      // Temel + Pro açık (Premium kapalı)
      const allowedKeys = [
        ...MENU_PACKAGES.find(p => p.id === 'basic')!.menus.map(m => m.key),
        ...MENU_PACKAGES.find(p => p.id === 'pro')!.menus.map(m => m.key),
      ];
      const disabled = ALL_APP_MENUS.map(m => m.key).filter(k => !allowedKeys.includes(k));
      setMenuFormData(disabled);
    } else if (preset === 'premium') {
      // Tüm menüler açık
      setMenuFormData([]);
    }
  };

  const togglePackageMenus = (packageId: string, enableAll: boolean) => {
    const pkg = MENU_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return;
    const pkgKeys = pkg.menus.map(m => m.key);
    
    if (enableAll) {
      // Paketteki tüm menüleri aç (disabled listesinden çıkar)
      setMenuFormData(prev => prev.filter(k => !pkgKeys.includes(k)));
    } else {
      // Paketteki tüm menüleri gizle (disabled listesine ekle)
      setMenuFormData(prev => Array.from(new Set([...prev, ...pkgKeys])));
    }
  };

  const handleSaveMenus = async () => {
    if (!selectedUserForMenus) return;
    try {
      setIsSubmittingMenus(true);
      await fetchApi(`/admin/users/${selectedUserForMenus.id}/menus`, {
        method: 'PUT',
        body: JSON.stringify({ disabledMenus: menuFormData }),
      });
      toast.success(`${selectedUserForMenus.firstName} adlı kullanıcının menü izinleri güncellendi.`);
      closeMenuModal();
      loadData();
    } catch (error: any) {
      toast.error('Menü izinleri kaydedilirken hata oluştu: ' + error.message);
    } finally {
      setIsSubmittingMenus(false);
    }
  };

  // Edit User Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    tenantName: '',
    existingTenantId: '',
    tenantRole: 'MEMBER' as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER',
    systemRole: 'USER',
    isActive: true,
  });

  const openEditModal = (user: User) => {
    setSelectedUserForEdit(user);
    setEditFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      username: user.username || '',
      tenantName: user.tenantName || '',
      existingTenantId: user.tenantId || '',
      tenantRole: user.tenantRole || 'MEMBER',
      systemRole: user.systemRole || 'USER',
      isActive: user.isActive,
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedUserForEdit(null);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;

    try {
      setIsSubmittingEdit(true);
      await fetchApi(`/admin/users/${selectedUserForEdit.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData),
      });

      toast.success(`${editFormData.firstName} adlı kullanıcının bilgileri güncellendi.`);
      closeEditModal();
      loadData();
    } catch (error: any) {
      toast.error('Güncelleme başarısız: ' + error.message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const { user: currentUser, startImpersonation } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) return;
    if (!currentUser.systemRole || !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.systemRole)) {
      router.push('/');
      return;
    }
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    try {
      const [usersRes, tenantsRes] = await Promise.all([
        fetchApi<User[]>('/admin/users'),
        fetchApi<Tenant[]>('/admin/tenants', { cache: 'no-store' }),
      ]);
      setUsers(usersRes);
      setTenants(tenantsRes);
    } catch (error: any) {
      toast.error('Veriler yüklenemedi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      await fetchApi(`/admin/users/${userId}/approve`, { method: 'PUT' });
      toast.success('Kullanıcı başarıyla onaylandı.');
      loadData();
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
      loadData();
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

    if (addFormData.tenantMode === 'existing' && !addFormData.existingTenantId) {
      toast.error('Lütfen dahil edilecek aile hesabını seçin.');
      return;
    }

    try {
      setIsSubmittingAdd(true);
      const payload: any = {
        firstName: addFormData.firstName,
        lastName: addFormData.lastName,
        email: addFormData.email,
        username: addFormData.username,
        password: addFormData.password,
        systemRole: addFormData.systemRole,
        isActive: addFormData.isActive,
      };

      if (addFormData.tenantMode === 'existing') {
        payload.existingTenantId = addFormData.existingTenantId;
        payload.tenantRole = addFormData.tenantRole;
      } else {
        payload.tenantName = addFormData.tenantName;
      }

      await fetchApi('/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast.success(
        addFormData.tenantMode === 'existing'
          ? `${addFormData.firstName} ${addFormData.lastName} aileye başarıyla eklendi.`
          : `${addFormData.firstName} ${addFormData.lastName} kullanıcısı ve yeni aile hesabı oluşturuldu.`
      );
      setIsAddModalOpen(false);
      resetAddForm();
      loadData();
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
    const tenantName = (u.tenantName || '').toLowerCase();
    return fullName.includes(searchStr) || u.email.toLowerCase().includes(searchStr) || username.includes(searchStr) || tenantName.includes(searchStr);
  });

  const filteredTenants = tenants.filter(t => {
    const searchStr = searchTerm.toLowerCase();
    const nameMatch = t.name.toLowerCase().includes(searchStr);
    const ownerMatch = (t.owner?.fullName || '').toLowerCase().includes(searchStr) || (t.owner?.email || '').toLowerCase().includes(searchStr);
    const memberMatch = t.members.some(m => m.fullName.toLowerCase().includes(searchStr) || m.email.toLowerCase().includes(searchStr) || (m.username || '').toLowerCase().includes(searchStr));
    return nameMatch || ownerMatch || memberMatch;
  });

  const familyGroups = React.useMemo(() => {
    const groupsMap = new Map<string, {
      tenantId: string;
      tenantName: string;
      currency: string;
      ownerName?: string;
      stats?: any;
      members: User[];
    }>();

    filteredUsers.forEach((u) => {
      const key = u.tenantId || (u.tenantName ? `name_${u.tenantName}` : 'no_family');
      if (!groupsMap.has(key)) {
        const foundTenant = tenants.find(t => (u.tenantId && t.id === u.tenantId) || (u.tenantName && t.name === u.tenantName));
        groupsMap.set(key, {
          tenantId: u.tenantId || key,
          tenantName: u.tenantName || foundTenant?.name || 'Ailesiz / Bağımsız Kullanıcılar',
          currency: foundTenant?.currency || 'TRY',
          ownerName: foundTenant?.owner?.fullName,
          stats: foundTenant?.stats,
          members: [],
        });
      }
      groupsMap.get(key)!.members.push(u);
    });

    const roleWeight: Record<string, number> = { OWNER: 1, ADMIN: 2, MEMBER: 3, VIEWER: 4 };
    const groups = Array.from(groupsMap.values());

    groups.forEach((grp) => {
      grp.members.sort((a, b) => {
        const wa = roleWeight[a.tenantRole || 'MEMBER'] || 99;
        const wb = roleWeight[b.tenantRole || 'MEMBER'] || 99;
        if (wa !== wb) return wa - wb;
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'tr');
      });
    });

    groups.sort((a, b) => a.tenantName.localeCompare(b.tenantName, 'tr'));
    return groups;
  }, [filteredUsers, tenants]);

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
          <p className="text-text-muted mt-1 text-sm">Kullanıcıları, yetkilerini ve aile bütçe hesaplarını yönetin.</p>
        </div>
        <Button
          onClick={() => { resetAddForm(); setIsAddModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-2 rounded-xl px-4 py-2.5 shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Yeni Kullanıcı Ekle</span>
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-px">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 pb-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Kullanıcılar</span>
          <span className={`px-2 py-0.5 text-xs rounded-full font-mono ${
            activeTab === 'users' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-bg-secondary text-text-muted'
          }`}>
            {users.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('tenants')}
          className={`flex items-center gap-2 pb-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'tenants'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Aile Hesapları (Tenants)</span>
          <span className={`px-2 py-0.5 text-xs rounded-full font-mono ${
            activeTab === 'tenants' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-bg-secondary text-text-muted'
          }`}>
            {tenants.length}
          </span>
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-6">
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
          <div className="bg-bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="İsim, e-posta veya aile adı ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-bg-secondary/60 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-colors"
                />
              </div>

              {/* View Toggle (Aile Görünümü) */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsFamilyView(!isFamilyView)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                    isFamilyView
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-primary border-border hover:border-text-muted/30'
                  }`}
                  title="Kullanıcıları ailelere göre gruplanmış ağaç hiyerarşisinde görüntüle"
                >
                  <FolderTree className={`w-4 h-4 ${isFamilyView ? 'text-white' : 'text-emerald-500'}`} />
                  <span>Aile Görünümü</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isFamilyView
                      ? 'bg-white/20 text-white'
                      : 'bg-bg-card text-text-muted border border-border'
                  }`}>
                    {isFamilyView ? 'Açık' : 'Kapalı'}
                  </span>
                </button>

                {isFamilyView && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={expandAllFamilies}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-text-muted hover:text-text-primary hover:bg-bg-secondary border border-border transition-colors cursor-pointer"
                      title="Tüm aile dallarını genişlet"
                    >
                      Tümünü Aç
                    </button>
                    <button
                      type="button"
                      onClick={() => collapseAllFamilies(familyGroups.map(g => g.tenantId))}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-text-muted hover:text-text-primary hover:bg-bg-secondary border border-border transition-colors cursor-pointer"
                      title="Tüm aile dallarını daralt"
                    >
                      Kapat
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-text-muted font-medium shrink-0">
              {filteredUsers.length} / {totalUsers} kullanıcı gösteriliyor
            </p>
          </div>

          {isFamilyView ? (
            /* Family Tree View (Ağaç Yapısı) */
            <div className="space-y-4">
              {familyGroups.length === 0 ? (
                <div className="bg-bg-card border border-border rounded-2xl p-12 text-center text-text-muted shadow-sm">
                  <Home className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
                  <p className="font-semibold text-text-primary">Eşleşen aile veya kullanıcı bulunamadı</p>
                  <p className="text-xs text-text-muted mt-1">Arama filtrenizi değiştirerek tekrar deneyebilirsiniz.</p>
                </div>
              ) : (
                familyGroups.map((family) => {
                  const isCollapsed = collapsedFamilies.has(family.tenantId);
                  return (
                    <div
                      key={family.tenantId}
                      className="bg-bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm transition-all hover:border-emerald-500/30"
                    >
                      {/* Family Node Header (Ağaç Kökü) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleFamilyCollapse(family.tenantId)}
                            className="p-1.5 rounded-lg hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                            title={isCollapsed ? 'Genişlet' : 'Daralt'}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-5 h-5 text-emerald-500 transition-transform" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-emerald-500 transition-transform" />
                            )}
                          </button>

                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                            <Home className="w-5 h-5" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-base text-text-primary tracking-tight">
                                {family.tenantName}
                              </h3>
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {family.members.length} Kullanıcı
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-bg-secondary text-text-secondary border border-border">
                                {family.currency}
                              </span>
                            </div>
                            {family.ownerName && (
                              <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                                <Crown className="w-3 h-3 text-amber-500" />
                                <span>Aile Kurucusu: <strong className="text-text-secondary font-medium">{family.ownerName}</strong></span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Family Quick Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-auto pl-10 sm:pl-0">
                          <button
                            type="button"
                            onClick={() => {
                              resetAddForm();
                              setAddFormData(prev => ({
                                ...prev,
                                tenantMode: 'existing',
                                existingTenantId: family.tenantId.startsWith('name_') || family.tenantId === 'no_family' ? '' : family.tenantId,
                                tenantRole: 'MEMBER',
                              }));
                              setIsAddModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-colors cursor-pointer"
                            title="Bu aileye yeni üye tanımla"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Üye Ekle</span>
                          </button>
                        </div>
                      </div>

                      {/* Tree Branch: Member List (Ağaç Dalları) */}
                      {!isCollapsed && (
                        <div className="pt-3.5 pl-3 sm:pl-6 relative">
                          {/* Vertical stem line connecting parent to children */}
                          <div className="border-l-2 border-emerald-500/30 ml-2 sm:ml-3 pl-4 sm:pl-5 space-y-2.5 relative">
                            {family.members.map((u) => (
                              <div
                                key={u.id}
                                className="relative flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-bg-secondary/40 hover:bg-bg-secondary/80 border border-border/70 hover:border-emerald-500/30 transition-all"
                              >
                                {/* Horizontal branch line connecting stem to node */}
                                <div className="absolute -left-4 sm:-left-5 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-px bg-emerald-500/30" />
                                
                                {/* Left Info: Avatar + Details */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {/* Member Avatar */}
                                  <div className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center font-bold text-xs shrink-0 ${
                                    u.tenantRole === 'OWNER'
                                      ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                      : u.tenantRole === 'ADMIN'
                                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                      : u.tenantRole === 'VIEWER'
                                      ? 'bg-gray-500/15 text-gray-400 border border-gray-500/30'
                                      : 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                                  }`}>
                                    {u.avatarUrl ? (
                                      <img src={u.avatarUrl} alt={`${u.firstName} ${u.lastName}`} className="w-full h-full object-cover" />
                                    ) : (
                                      <span>{u.firstName.charAt(0)}{u.lastName.charAt(0)}</span>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-sm text-text-primary">
                                        {u.firstName} {u.lastName}
                                      </span>
                                      
                                      {/* Tenant Role Badge */}
                                      {u.tenantRole === 'OWNER' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                          <Crown size={11} /> Kurucu
                                        </span>
                                      ) : u.tenantRole === 'ADMIN' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                          <ShieldCheck size={11} /> Yönetici
                                        </span>
                                      ) : u.tenantRole === 'VIEWER' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">
                                          <Eye size={11} /> İzleyici
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                          <Users size={11} /> Üye
                                        </span>
                                      )}

                                      {/* System Role Badge */}
                                      {u.systemRole === 'SUPER_ADMIN' ? (
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                          Kurucu
                                        </span>
                                      ) : u.systemRole === 'ADMIN' ? (
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                          Yönetici
                                        </span>
                                      ) : null}

                                      {/* Active Status Badge */}
                                      {u.isActive ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
                                          <CheckCircle size={10} /> Onaylı
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-500">
                                          <ShieldAlert size={10} /> Bekliyor
                                        </span>
                                      )}
                                    </div>

                                    {/* Secondary Row: username, email, join date */}
                                    <div className="flex items-center gap-3 text-xs text-text-muted mt-1 flex-wrap">
                                      {u.username && (
                                        <span className="font-mono text-text-secondary">@{u.username}</span>
                                      )}
                                      <span>{u.email}</span>
                                      <span className="text-[11px] text-text-muted/70">
                                        Kayıt: {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
                                  {!u.isActive && (
                                    <button
                                      onClick={() => approveUser(u.id)}
                                      className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 text-xs font-semibold rounded-lg hover:text-white transition-colors cursor-pointer mr-1"
                                    >
                                      Onayla
                                    </button>
                                  )}
                                  
                                  {u.isActive && currentUser?.systemRole === 'SUPER_ADMIN' && currentUser.id !== u.id && (
                                    <button
                                      onClick={() => handleImpersonate(u.id, `${u.firstName} ${u.lastName}`)}
                                      className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                                      title="Bu hesapla giriş yap (Impersonate)"
                                    >
                                      <LogIn size={16} />
                                    </button>
                                  )}

                                  <button
                                    onClick={() => openEditModal(u)}
                                    className="p-1.5 text-text-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Kullanıcı Bilgilerini Düzenle"
                                  >
                                    <Pencil size={16} />
                                  </button>

                                  <button
                                    onClick={() => openPasswordModal(u)}
                                    className="p-1.5 text-text-muted hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Şifreyi Sıfırla / Değiştir"
                                  >
                                    <Key size={16} />
                                  </button>

                                  <button
                                    onClick={() => openMenuModal(u)}
                                    className="p-1.5 text-text-muted hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Menü Görünürlük Ayarları"
                                  >
                                    <SlidersHorizontal size={16} />
                                  </button>

                                  {u.systemRole !== 'ADMIN' && (
                                    <button
                                      onClick={() => deleteUser(u.id)}
                                      className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                      title="Sil / Reddet"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* User Table */
            <div className="bg-bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-sidebar border-b border-border">
                    <tr>
                      <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider">Kullanıcı</th>
                      <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider">Aile Hesabı</th>
                      <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider">Aile Rolü</th>
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
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-bg-secondary border border-border flex items-center justify-center text-xs font-bold text-text-muted shrink-0">
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span>{u.firstName.charAt(0)}{u.lastName.charAt(0)}</span>
                              )}
                            </div>
                            <div className="font-semibold text-text-primary">{u.firstName} {u.lastName}</div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-text-secondary text-sm">
                          <div className="flex items-center gap-1.5 font-medium text-text-primary">
                            <Home className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{u.tenantName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {u.tenantRole === 'OWNER' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              <Crown size={12} /> Kurucu
                            </span>
                          ) : u.tenantRole === 'ADMIN' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              <ShieldCheck size={12} /> Yönetici
                            </span>
                          ) : u.tenantRole === 'VIEWER' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">
                              <Eye size={12} /> İzleyici
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                              <Users size={12} /> Üye
                            </span>
                          )}
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
                                className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 text-xs font-semibold rounded-lg hover:text-white transition-colors cursor-pointer"
                              >
                                Onayla
                              </button>
                            )}
                            
                            {u.isActive && currentUser?.systemRole === 'SUPER_ADMIN' && currentUser.id !== u.id && (
                              <button
                                onClick={() => handleImpersonate(u.id, `${u.firstName} ${u.lastName}`)}
                                className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Bu hesapla giriş yap (Impersonate)"
                              >
                                <LogIn size={16} />
                              </button>
                            )}

                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 text-text-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Kullanıcı Bilgilerini Düzenle"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              onClick={() => openPasswordModal(u)}
                              className="p-1.5 text-text-muted hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Şifreyi Sıfırla / Değiştir"
                            >
                              <Key size={16} />
                            </button>

                            <button
                              onClick={() => openMenuModal(u)}
                              className="p-1.5 text-text-muted hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Menü Görünürlük Ayarları"
                            >
                              <SlidersHorizontal size={16} />
                            </button>

                            {u.systemRole !== 'ADMIN' && (
                              <button
                                onClick={() => deleteUser(u.id)}
                                className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
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
                        <td colSpan={9} className="px-6 py-12 text-center text-text-muted">
                          Kullanıcı bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tenant KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Toplam Aile - Blue */}
            <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-blue-600 transition-all hover:shadow-md">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 shrink-0">
                <Home className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Toplam Aile Hesabı</p>
                <p className="text-2xl font-black text-text-primary tracking-tight font-mono mt-0.5">{tenants.length}</p>
                <p className="text-xs text-text-muted mt-0.5 font-medium">Kayıtlı aile bütçesi</p>
              </div>
            </div>

            {/* Çok Kullanıcılı Aileler - Emerald */}
            <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-emerald-500 transition-all hover:shadow-md">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Çok Kullanıcılı Aileler</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono mt-0.5">
                  {tenants.filter(t => t.stats.memberCount > 1).length}
                </p>
                <p className="text-xs text-text-muted mt-0.5 font-medium">Birden fazla birey</p>
              </div>
            </div>

            {/* Toplam Aile Bireyi - Amber */}
            <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-amber-500 transition-all hover:shadow-md">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Toplam Aile Bireyi</p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono mt-0.5">
                  {tenants.reduce((acc, t) => acc + t.stats.memberCount, 0)}
                </p>
                <p className="text-xs text-text-muted mt-0.5 font-medium">Tüm kayıtlı üyeler</p>
              </div>
            </div>

            {/* Toplam Finansal İşlem - Purple */}
            <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border-l-[5px] border-l-purple-500 transition-all hover:shadow-md">
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Toplam Finans Kaydı</p>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight font-mono mt-0.5">
                  {tenants.reduce((acc, t) => acc + t.stats.transactionCount, 0)}
                </p>
                <p className="text-xs text-text-muted mt-0.5 font-medium">Gelir ve gider işlemi</p>
              </div>
            </div>
          </div>

          {/* Tenants Search Toolbar */}
          <div className="bg-bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Aile adı, kurucu veya üye ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-bg-secondary/60 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-colors"
              />
            </div>
            <p className="text-xs text-text-muted font-medium">
              {filteredTenants.length} / {tenants.length} aile hesabı gösteriliyor
            </p>
          </div>

          {/* Tenants Table */}
          <div className="bg-bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-sidebar border-b border-border">
                  <tr>
                    <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider">Aile Hesabı</th>
                    <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider">Aile Kurucusu</th>
                    <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider">Aile Bireyleri</th>
                    <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider">Finansal Durum</th>
                    <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider">Kayıt Tarihi</th>
                    <th className="px-5 py-3 text-[12px] font-semibold text-text-muted uppercase tracking-wider text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-bg-sidebar/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                            <Home className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-text-primary text-base flex items-center gap-2">
                              {t.name}
                              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-bg-secondary text-text-muted border border-border">
                                {t.currency}
                              </span>
                            </div>
                            <div className="text-xs text-text-muted mt-0.5 font-mono">
                              ID: {t.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {t.owner ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                              <Crown size={14} />
                            </div>
                            <div>
                              <div className="font-semibold text-text-primary text-sm">{t.owner.fullName}</div>
                              <div className="text-xs text-text-muted">{t.owner.email}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                          {t.members.map((m) => (
                            <div
                              key={m.id}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                m.role === 'OWNER'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                  : m.role === 'ADMIN'
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                                  : m.role === 'VIEWER'
                                  ? 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
                                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                              }`}
                              title={`${m.email} (${m.role})`}
                            >
                              <span>{m.fullName}</span>
                              <span className="text-[10px] opacity-75 font-semibold">
                                ({m.role === 'OWNER' ? 'Kurucu' : m.role === 'ADMIN' ? 'Yönetici' : m.role === 'VIEWER' ? 'İzleyici' : 'Üye'})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="px-2 py-1 rounded-md bg-bg-secondary text-text-primary font-medium border border-border">
                            {t.stats.memberCount} Birey
                          </span>
                          <span className="px-2 py-1 rounded-md bg-bg-secondary text-text-primary font-medium border border-border">
                            {t.stats.accountCount} Hesap
                          </span>
                          <span className="px-2 py-1 rounded-md bg-bg-secondary text-text-primary font-medium border border-border">
                            {t.stats.transactionCount} İşlem
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-text-secondary text-sm">
                        {new Date(t.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          onClick={() => openAddUserForTenant(t.id)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl px-3 py-1.5 transition-all flex items-center gap-1.5 ml-auto cursor-pointer shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Üye Ekle</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredTenants.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                        Aile hesabı bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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

      {/* Kullanıcı Bilgilerini Düzenleme Modalı */}
      {isEditModalOpen && selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-secondary/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 dark:bg-blue-500/20">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Kullanıcı Bilgilerini Düzenle
                  </h3>
                  <p className="text-xs text-text-muted">
                    {selectedUserForEdit.firstName} {selectedUserForEdit.lastName} {selectedUserForEdit.username ? `(@${selectedUserForEdit.username})` : ''}
                  </p>
                </div>
              </div>
              <button 
                onClick={closeEditModal}
                className="text-text-muted hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-bg-secondary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditUserSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Ad <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    placeholder="Örn: Ahmet"
                    className="w-full px-3.5 py-2.5 bg-bg-sidebar border border-border rounded-xl text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Soyad <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    placeholder="Örn: Yılmaz"
                    className="w-full px-3.5 py-2.5 bg-bg-sidebar border border-border rounded-xl text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Kullanıcı Adı
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm font-medium">@</span>
                    <input
                      type="text"
                      value={editFormData.username}
                      onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                      placeholder="kullaniciadi"
                      className="w-full pl-8 pr-3.5 py-2.5 bg-bg-sidebar border border-border rounded-xl text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    E-posta Adresi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    placeholder="ornek@mail.com"
                    className="w-full px-3.5 py-2.5 bg-bg-sidebar border border-border rounded-xl text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Bağlı Olduğu Aile Hesabı
                  </label>
                  <select
                    value={editFormData.existingTenantId}
                    onChange={(e) => {
                      const tId = e.target.value;
                      const foundTenant = tenants.find(t => t.id === tId);
                      setEditFormData({
                        ...editFormData,
                        existingTenantId: tId,
                        tenantName: foundTenant ? foundTenant.name : editFormData.tenantName,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-bg-sidebar border border-border rounded-xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.stats.memberCount} Birey)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Aile İçi Rolü
                  </label>
                  <select
                    value={editFormData.tenantRole}
                    onChange={(e) => setEditFormData({ ...editFormData, tenantRole: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-bg-sidebar border border-border rounded-xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
                  >
                    <option value="OWNER">Kurucu (OWNER)</option>
                    <option value="ADMIN">Aile Yöneticisi (ADMIN)</option>
                    <option value="MEMBER">Aile Üyesi (MEMBER)</option>
                    <option value="VIEWER">İzleyici (VIEWER)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Aile Adını Güncelle <span className="text-text-muted text-[10px] font-normal lowercase">(isteğe bağlı)</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.tenantName}
                    onChange={(e) => setEditFormData({ ...editFormData, tenantName: e.target.value })}
                    placeholder="Örn: Yılmaz Ailesi"
                    className="w-full px-3.5 py-2.5 bg-bg-sidebar border border-border rounded-xl text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Sistem Yetkisi
                  </label>
                  <select
                    value={editFormData.systemRole}
                    onChange={(e) => setEditFormData({ ...editFormData, systemRole: e.target.value })}
                    disabled={selectedUserForEdit.systemRole === 'SUPER_ADMIN' && currentUser?.systemRole !== 'SUPER_ADMIN'}
                    className="w-full px-3.5 py-2.5 bg-bg-sidebar border border-border rounded-xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <option value="USER">Kullanıcı (Standart)</option>
                    <option value="ADMIN">Yönetici (Admin)</option>
                    {currentUser?.systemRole === 'SUPER_ADMIN' && (
                      <option value="SUPER_ADMIN">Kurucu (Super Admin)</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-xl bg-bg-secondary/30 border border-border hover:bg-bg-secondary/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={editFormData.isActive}
                    onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    className="w-4 h-4 mt-0.5 text-blue-600 rounded border-border focus:ring-blue-500/50"
                  />
                  <div>
                    <span className="text-sm font-semibold text-text-primary">Onaylı & Aktif Hesap</span>
                    <p className="text-xs text-text-muted mt-0.5">İşaret kaldırıldığında kullanıcı pasife alınır ve giriş yapamaz.</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border mt-4">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={closeEditModal}
                  disabled={isSubmittingEdit}
                >
                  Vazgeç
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmittingEdit}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingEdit ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
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

              {/* Aile Hesabı Yapılandırması: Yeni vs Mevcut */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Aile Hesabı Seçimi
                </label>
                <div className="p-1 bg-bg-sidebar border border-border rounded-xl grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setAddFormData({ ...addFormData, tenantMode: 'new' })}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      addFormData.tenantMode === 'new'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Yeni Aile Hesabı Aç</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const firstTenantId = addFormData.existingTenantId || (tenants[0]?.id || '');
                      setAddFormData({
                        ...addFormData,
                        tenantMode: 'existing',
                        existingTenantId: firstTenantId,
                      });
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      addFormData.tenantMode === 'existing'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Mevcut Aileye Dahil Et</span>
                  </button>
                </div>
              </div>

              {addFormData.tenantMode === 'new' ? (
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
                    <p className="text-[11px] text-text-muted mt-1">
                      Kullanıcı yeni ailenin kurucusu (OWNER) olarak atanır.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                      Sistem Yetkisi
                    </label>
                    <select
                      value={addFormData.systemRole}
                      onChange={(e) => setAddFormData({ ...addFormData, systemRole: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all cursor-pointer"
                    >
                      <option value="USER">Standart Kullanıcı (USER)</option>
                      <option value="ADMIN">Sistem Yöneticisi (ADMIN)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                        Dahil Edilecek Aile Hesabı <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={addFormData.existingTenantId}
                        onChange={(e) => setAddFormData({ ...addFormData, existingTenantId: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all cursor-pointer"
                        required
                      >
                        <option value="">Aile Seçin...</option>
                        {tenants.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.stats.memberCount} Birey) {t.owner ? `— Kurucu: ${t.owner.fullName}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                        Aile İçi Rolü
                      </label>
                      <select
                        value={addFormData.tenantRole}
                        onChange={(e) => setAddFormData({ ...addFormData, tenantRole: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all cursor-pointer"
                      >
                        <option value="MEMBER">Aile Üyesi (MEMBER) - İşlem ekleyebilir</option>
                        <option value="ADMIN">Aile Yöneticisi (ADMIN) - Tüm bütçeyi yönetebilir</option>
                        <option value="VIEWER">İzleyici (VIEWER) - Sadece görüntüleme</option>
                        <option value="OWNER">Eş-Kurucu (OWNER)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                        Sistem Yetkisi
                      </label>
                      <select
                        value={addFormData.systemRole}
                        onChange={(e) => setAddFormData({ ...addFormData, systemRole: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-bg-secondary/60 border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all cursor-pointer"
                      >
                        <option value="USER">Standart Kullanıcı (USER)</option>
                        <option value="ADMIN">Sistem Yöneticisi (ADMIN)</option>
                      </select>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <Home className="w-4 h-4 shrink-0" />
                      <span>Bu kullanıcı seçilen ailenin ortak hesap ve verilerini anında paylaşacaktır.</span>
                    </div>
                  </div>
                </div>
              )}

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

      {/* Menu Permissions Modal */}
      {isMenuModalOpen && selectedUserForMenus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bg-card w-full max-w-3xl rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-sidebar/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Menü Görünürlük İzinleri
                  </h3>
                  <p className="text-xs text-text-muted">
                    {selectedUserForMenus.firstName} {selectedUserForMenus.lastName} {selectedUserForMenus.username ? `(@${selectedUserForMenus.username})` : ''} için menü başlıklarını özelleştirin
                  </p>
                </div>
              </div>
              <button 
                onClick={closeMenuModal}
                className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-card transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Quick Actions & Package Presets */}
              <div className="bg-bg-sidebar/40 p-3.5 rounded-xl border border-border space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-text-primary mr-1">Paket Şablonları:</span>
                    <button
                      type="button"
                      onClick={() => applyPreset('basic')}
                      className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 rounded-lg font-medium transition-colors cursor-pointer border border-blue-500/20"
                    >
                      📦 Temel Paket
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('pro')}
                      className="text-xs px-2.5 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 rounded-lg font-medium transition-colors cursor-pointer border border-purple-500/20"
                    >
                      ⚡ Temel + Pro
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('premium')}
                      className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 rounded-lg font-medium transition-colors cursor-pointer border border-amber-500/20"
                    >
                      👑 Tam Paket (Premium)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-muted">
                      Açık: <strong className="text-text-primary">{ALL_APP_MENUS.length - menuFormData.length}</strong> / {ALL_APP_MENUS.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => applyPreset('none')}
                      className="text-xs px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 rounded-lg font-medium transition-colors cursor-pointer border border-rose-500/20"
                    >
                      Tümünü Gizle
                    </button>
                  </div>
                </div>
              </div>

              {/* Categorized Package Sections */}
              {MENU_PACKAGES.map(pkg => {
                const pkgKeys = pkg.menus.map(m => m.key);
                const activeCountInPkg = pkgKeys.filter(k => !menuFormData.includes(k)).length;
                const isAllActiveInPkg = activeCountInPkg === pkgKeys.length;
                const PkgIcon = pkg.icon;

                return (
                  <div key={pkg.id} className="space-y-3">
                    {/* Package Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${pkg.iconColor}`}>
                          <PkgIcon size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-text-primary">{pkg.name}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${pkg.badgeClass}`}>
                              {pkg.badge}
                            </span>
                            <span className="text-xs text-text-muted font-medium">
                              ({activeCountInPkg} / {pkgKeys.length} açık)
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted">{pkg.description}</p>
                        </div>
                      </div>

                      {/* Package Quick Toggle Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => togglePackageMenus(pkg.id, true)}
                          disabled={isAllActiveInPkg}
                          className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-md font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Paketi Aç
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePackageMenus(pkg.id, false)}
                          disabled={activeCountInPkg === 0}
                          className="text-xs px-2 py-1 bg-gray-500/10 text-text-muted hover:bg-gray-500/20 rounded-md font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Paketi Gizle
                        </button>
                      </div>
                    </div>

                    {/* Menus Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {pkg.menus.map(menu => {
                        const isHidden = menuFormData.includes(menu.key);
                        const isVisible = !isHidden;
                        return (
                          <div
                            key={menu.key}
                            onClick={() => toggleMenu(menu.key)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                              isVisible
                                ? 'bg-bg-card border-border hover:border-emerald-500/50 shadow-xs'
                                : 'bg-bg-sidebar/50 border-border/60 opacity-60 hover:opacity-85'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isVisible ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-text-muted'
                              }`}>
                                {isVisible ? <CheckCircle size={16} /> : <EyeOff size={16} />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-text-primary truncate">{menu.name}</p>
                                <p className="text-[11px] text-text-muted truncate">{menu.description}</p>
                              </div>
                            </div>

                            {/* Custom Toggle Switch */}
                            <div
                              className={`w-11 h-6 flex items-center rounded-full p-1 shrink-0 transition-colors ${
                                isVisible ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                              }`}
                            >
                              <div
                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                  isVisible ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-bg-sidebar/50 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={closeMenuModal}
                disabled={isSubmittingMenus}
              >
                Vazgeç
              </Button>
              <Button
                type="button"
                onClick={handleSaveMenus}
                disabled={isSubmittingMenus}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
              >
                {isSubmittingMenus ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
