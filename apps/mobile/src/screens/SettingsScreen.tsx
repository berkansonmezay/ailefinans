import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, FlatList, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchApi, getAvatarUrl } from '../lib/api';
import { AuthContext } from '../context/AuthContext';
import { useModalKeyboard } from '../hooks/useModalKeyboard';
import { useTheme } from '../context/ThemeContext';

type Tab = 'TENANT' | 'CATEGORIES' | 'MERCHANTS' | 'THEME';

export const SettingsScreen = ({ navigation }: any) => {
  const { user, setUser } = useContext(AuthContext);
  const { isDark, colors, themeMode, setThemeMode } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('TENANT');
  const { overlayKeyboardStyle, maxContentHeight } = useModalKeyboard();
  
  // States for Tenant
  const [tenant, setTenant] = useState<any>(null);
  const [tenantName, setTenantName] = useState('');
  const [tenantLoading, setTenantLoading] = useState(false);
  const [isTenantSaving, setIsTenantSaving] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  // States for Categories
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catFormData, setCatFormData] = useState({ name: '', type: 'EXPENSE' });

  // States for Merchants
  const [merchants, setMerchants] = useState<any[]>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(false);
  const [isMerchModalOpen, setIsMerchModalOpen] = useState(false);
  const [editingMerchId, setEditingMerchId] = useState<string | null>(null);
  const [merchFormData, setMerchFormData] = useState({ name: '' });

  useEffect(() => {
    if (activeTab === 'TENANT') {
      loadTenantData();
    } else if (activeTab === 'CATEGORIES') {
      loadCategories();
    } else if (activeTab === 'MERCHANTS') {
      loadMerchants();
    }
  }, [activeTab]);

  // --- Tenant Handlers ---
  const loadTenantData = async () => {
    if (!user?.activeTenantId) return;
    try {
      setTenantLoading(true);
      const res = await fetchApi<any>(`/tenants/${user.activeTenantId}`);
      const t = res.data || res;
      setTenant(t);
      setTenantName(t.name || '');
      setMembers(t.members || []);
    } catch (error) {
      console.error('Kurum yüklenemedi:', error);
    } finally {
      setTenantLoading(false);
    }
  };

  const handleUpdateTenant = async () => {
    if (!user?.activeTenantId) return;
    try {
      setIsTenantSaving(true);
      const res = await fetchApi<any>(`/tenants/${user.activeTenantId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: tenantName }),
      });
      const newName = res.name || res.data?.name;
      if (newName && user) {
        setUser({ ...user, activeTenantName: newName });
      }
      Alert.alert('Başarılı', 'Kurum ayarları güncellendi.');
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Güncelleme başarısız');
    } finally {
      setIsTenantSaving(false);
    }
  };

  // --- Category Handlers ---
  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const res = await fetchApi<any>('/categories');
      setCategories(Array.isArray(res) ? res : (res.items || res.data || []));
    } catch (error) {
      console.error('Kategoriler yüklenemedi:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleOpenCatModal = (cat?: any) => {
    if (cat) {
      setEditingCatId(cat.id);
      setCatFormData({ name: cat.name, type: cat.type });
    } else {
      setEditingCatId(null);
      setCatFormData({ name: '', type: 'EXPENSE' });
    }
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!catFormData.name.trim()) return;
    try {
      if (editingCatId) {
        await fetchApi(`/categories/${editingCatId}`, {
          method: 'PUT',
          body: JSON.stringify(catFormData),
        });
      } else {
        await fetchApi('/categories', {
          method: 'POST',
          body: JSON.stringify(catFormData),
        });
      }
      setIsCatModalOpen(false);
      loadCategories();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'İşlem başarısız');
    }
  };

  const handleDeleteCategory = (id: string) => {
    Alert.alert('Kategoriyi Sil', 'Emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await fetchApi(`/categories/${id}`, { method: 'DELETE' });
          loadCategories();
        } catch (error) {
          Alert.alert('Hata', 'Silinemedi');
        }
      }}
    ]);
  };

  // --- Merchant Handlers ---
  const loadMerchants = async () => {
    try {
      setMerchantsLoading(true);
      const res = await fetchApi<any>('/merchants');
      setMerchants(Array.isArray(res) ? res : (res.items || res.data || []));
    } catch (error) {
      console.error('Harcama yerleri yüklenemedi:', error);
    } finally {
      setMerchantsLoading(false);
    }
  };

  const handleOpenMerchModal = (merch?: any) => {
    if (merch) {
      setEditingMerchId(merch.id);
      setMerchFormData({ name: merch.name });
    } else {
      setEditingMerchId(null);
      setMerchFormData({ name: '' });
    }
    setIsMerchModalOpen(true);
  };

  const handleSaveMerchant = async () => {
    if (!merchFormData.name.trim()) return;
    try {
      if (editingMerchId) {
        await fetchApi(`/merchants/${editingMerchId}`, {
          method: 'PUT',
          body: JSON.stringify(merchFormData),
        });
      } else {
        await fetchApi('/merchants', {
          method: 'POST',
          body: JSON.stringify(merchFormData),
        });
      }
      setIsMerchModalOpen(false);
      loadMerchants();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'İşlem başarısız');
    }
  };

  const handleDeleteMerchant = (id: string) => {
    Alert.alert('Kurumu Sil', 'Emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await fetchApi(`/merchants/${id}`, { method: 'DELETE' });
          loadMerchants();
        } catch (error) {
          Alert.alert('Hata', 'Silinemedi');
        }
      }}
    ]);
  };

  const renderTabs = () => (
    <View style={[styles.tabsContainer, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
      <TouchableOpacity 
        style={[
          styles.tab, 
          { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc' },
          activeTab === 'TENANT' && [styles.activeTab, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#eef2ff' }]
        ]} 
        onPress={() => setActiveTab('TENANT')}
      >
        <Ionicons name="business-outline" size={15} color={activeTab === 'TENANT' ? colors.accent : colors.textMuted} />
        <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'TENANT' && [styles.activeTabText, { color: colors.accent }]]}>Kurum</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.tab, 
          { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc' },
          activeTab === 'CATEGORIES' && [styles.activeTab, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#eef2ff' }]
        ]} 
        onPress={() => setActiveTab('CATEGORIES')}
      >
        <Ionicons name="pricetags-outline" size={15} color={activeTab === 'CATEGORIES' ? colors.accent : colors.textMuted} />
        <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'CATEGORIES' && [styles.activeTabText, { color: colors.accent }]]}>Kategori</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.tab, 
          { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc' },
          activeTab === 'MERCHANTS' && [styles.activeTab, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#eef2ff' }]
        ]} 
        onPress={() => setActiveTab('MERCHANTS')}
      >
        <Ionicons name="storefront-outline" size={15} color={activeTab === 'MERCHANTS' ? colors.accent : colors.textMuted} />
        <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'MERCHANTS' && [styles.activeTabText, { color: colors.accent }]]}>Harcama</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.tab, 
          { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc' },
          activeTab === 'THEME' && [styles.activeTab, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#eef2ff' }]
        ]} 
        onPress={() => setActiveTab('THEME')}
      >
        <Ionicons name="color-palette-outline" size={15} color={activeTab === 'THEME' ? colors.accent : colors.textMuted} />
        <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'THEME' && [styles.activeTabText, { color: colors.accent }]]}>Görünüm</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTenantTab = () => {
    if (tenantLoading) return <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />;
    return (
      <View style={styles.tabContent}>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Aktif Kurum Ayarları</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Kurum / Aile Adı</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#ffffff', borderColor: colors.border, color: colors.textPrimary }]}
            value={tenantName}
            onChangeText={setTenantName}
            placeholder="Örn: Yılmaz Ailesi"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity style={styles.btnPrimary} onPress={handleUpdateTenant} disabled={isTenantSaving}>
            {isTenantSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Kaydet</Text>}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Kurum Üyeleri</Text>
          {members.map((m, idx) => (
            <View key={idx} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatarMini, { overflow: 'hidden', backgroundColor: isDark ? colors.bgSecondary : '#f1f5f9' }]}>
                {m.user?.avatarUrl && getAvatarUrl(m.user.avatarUrl) ? (
                  <Image source={{ uri: getAvatarUrl(m.user.avatarUrl)! }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={[styles.avatarMiniText, { color: colors.textMuted }]}>{(m.user?.firstName?.[0] || 'U').toUpperCase()}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, { color: colors.textPrimary }]}>{m.user?.firstName} {m.user?.lastName}</Text>
                <Text style={[styles.memberRole, { color: colors.textMuted }]}>{m.role === 'OWNER' ? 'Yönetici' : 'Üye'}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCategoriesTab = () => {
    if (categoriesLoading) return <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />;
    return (
      <View style={styles.tabContent}>
        <View style={styles.flexRowBetween}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tüm Kategoriler</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenCatModal()}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Yeni</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={[styles.listItem, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <View style={styles.listLeft}>
                <View style={[styles.typeIcon, { backgroundColor: item.type === 'INCOME' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5') : (isDark ? 'rgba(244, 63, 94, 0.2)' : '#fef2f2') }]}>
                  <Ionicons name={item.type === 'INCOME' ? 'arrow-up' : 'arrow-down'} size={16} color={item.type === 'INCOME' ? '#10b981' : '#f43f5e'} />
                </View>
                <Text style={[styles.listName, { color: colors.textPrimary }]}>{item.name}</Text>
              </View>
              <View style={styles.listRight}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleOpenCatModal(item)}>
                  <Ionicons name="pencil" size={18} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteCategory(item.id)}>
                  <Ionicons name="trash" size={18} color="#f43f5e" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz kategori yok.</Text>}
        />
      </View>
    );
  };

  const renderMerchantsTab = () => {
    if (merchantsLoading) return <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />;
    return (
      <View style={styles.tabContent}>
        <View style={styles.flexRowBetween}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Harcama Yerleri</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenMerchModal()}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Yeni</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={merchants}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={[styles.listItem, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <View style={styles.listLeft}>
                <View style={[styles.typeIcon, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff' }]}>
                  <Ionicons name="storefront" size={16} color="#3b82f6" />
                </View>
                <Text style={[styles.listName, { color: colors.textPrimary }]}>{item.name}</Text>
              </View>
              <View style={styles.listRight}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleOpenMerchModal(item)}>
                  <Ionicons name="pencil" size={18} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteMerchant(item.id)}>
                  <Ionicons name="trash" size={18} color="#f43f5e" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz kayıtlı harcama yeri yok.</Text>}
        />
      </View>
    );
  };

  const renderThemeTab = () => {
    const options: Array<{ mode: 'light' | 'dark' | 'system'; title: string; desc: string; icon: any }> = [
      { mode: 'light', title: 'Açık Tema', desc: 'Aydınlık ve ferah klasik görünüm', icon: 'sunny-outline' },
      { mode: 'dark', title: 'Koyu Tema', desc: 'Göz yormayan modern karanlık renk paleti', icon: 'moon-outline' },
      { mode: 'system', title: 'Sistem Teması', desc: 'Cihazınızın sistem ayarlarıyla otomatik eşleşir', icon: 'phone-portrait-outline' },
    ];

    return (
      <View style={styles.tabContent}>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Görünüm ve Tema</Text>
          <Text style={[styles.label, { color: colors.textMuted, marginBottom: 16 }]}>
            Uygulamanın renk temasını belirleyin. Seçiminiz anında uygulanır ve cihazınıza kaydedilir.
          </Text>

          <View style={{ gap: 12 }}>
            {options.map((opt) => {
              const isSelected = themeMode === opt.mode;
              return (
                <TouchableOpacity
                  key={opt.mode}
                  style={[
                    styles.themeOptionCard,
                    {
                      backgroundColor: isSelected 
                        ? (isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff') 
                        : (isDark ? colors.bgSecondary : '#f8fafc'),
                      borderColor: isSelected ? colors.accent : (isDark ? colors.border : '#e2e8f0'),
                    }
                  ]}
                  onPress={() => setThemeMode(opt.mode)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.themeOptionIconCircle,
                    { 
                      backgroundColor: isSelected ? colors.accent : (isDark ? '#334155' : '#e2e8f0'),
                    }
                  ]}>
                    <Ionicons 
                      name={opt.icon} 
                      size={20} 
                      color={isSelected ? '#ffffff' : (isDark ? '#cbd5e1' : '#64748b')} 
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.themeOptionTitle,
                      { color: isSelected ? colors.accent : colors.textPrimary }
                    ]}>
                      {opt.title}
                    </Text>
                    <Text style={[styles.themeOptionDesc, { color: colors.textMuted }]}>
                      {opt.desc}
                    </Text>
                  </View>

                  <View style={[
                    styles.radioCircle,
                    { borderColor: isSelected ? colors.accent : (isDark ? '#475569' : '#cbd5e1') },
                    isSelected && { backgroundColor: colors.accent }
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Current Active Indicator Card */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: isDark ? 1 : 0, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={isDark ? "moon" : "sunny"} size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
              Aktif Durum: {isDark ? '🌙 Koyu Mod' : '☀️ Açık Mod'}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              {themeMode === 'system' ? 'Cihaz sistem teması devrede' : 'Kişisel tercih aktif'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}>
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Ayarlar</Text>
        <View style={styles.backButton} />
      </View>

      {renderTabs()}

      <ScrollView style={[styles.scrollView, { backgroundColor: colors.bgPrimary }]} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'TENANT' && renderTenantTab()}
        {activeTab === 'CATEGORIES' && renderCategoriesTab()}
        {activeTab === 'MERCHANTS' && renderMerchantsTab()}
        {activeTab === 'THEME' && renderThemeTab()}
      </ScrollView>

      {/* Category Modal */}
      <Modal visible={isCatModalOpen} animationType="slide" transparent>
        <View style={[styles.modalOverlay, overlayKeyboardStyle]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            style={[styles.modalContent, { maxHeight: maxContentHeight, backgroundColor: colors.bgCard }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{editingCatId ? 'Kategori Düzenle' : 'Yeni Kategori'}</Text>
              <TouchableOpacity onPress={() => setIsCatModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              keyboardShouldPersistTaps="handled" 
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Kategori Adı</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#ffffff', borderColor: colors.border, color: colors.textPrimary }]} 
                  value={catFormData.name} 
                  onChangeText={t => setCatFormData({...catFormData, name: t})} 
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Türü</Text>
                <View style={styles.rowInputs}>
                  <TouchableOpacity 
                    style={[styles.typeBtn, { borderColor: colors.border, backgroundColor: isDark ? colors.bgSecondary : '#fff' }, catFormData.type === 'EXPENSE' && styles.typeBtnActiveExp]}
                    onPress={() => setCatFormData({...catFormData, type: 'EXPENSE'})}
                  >
                    <Text style={[styles.typeBtnText, catFormData.type === 'EXPENSE' && { color: '#f43f5e' }]}>Gider</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.typeBtn, { borderColor: colors.border, backgroundColor: isDark ? colors.bgSecondary : '#fff' }, catFormData.type === 'INCOME' && styles.typeBtnActiveInc]}
                    onPress={() => setCatFormData({...catFormData, type: 'INCOME'})}
                  >
                    <Text style={[styles.typeBtnText, catFormData.type === 'INCOME' && { color: '#10b981' }]}>Gelir</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity style={[styles.btnPrimary, catFormData.type === 'INCOME' ? { backgroundColor: '#10b981' } : { backgroundColor: '#f43f5e' }]} onPress={handleSaveCategory}>
                <Text style={styles.btnPrimaryText}>Kaydet</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Merchant Modal */}
      <Modal visible={isMerchModalOpen} animationType="slide" transparent>
        <View style={[styles.modalOverlay, overlayKeyboardStyle]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            style={[styles.modalContent, { maxHeight: maxContentHeight, backgroundColor: colors.bgCard }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{editingMerchId ? 'Kurum Düzenle' : 'Yeni Harcama Yeri'}</Text>
              <TouchableOpacity onPress={() => setIsMerchModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              keyboardShouldPersistTaps="handled" 
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Harcama Yeri Adı</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#ffffff', borderColor: colors.border, color: colors.textPrimary }]} 
                  value={merchFormData.name} 
                  onChangeText={t => setMerchFormData({ name: t })} 
                  placeholder="Örn: Migros" 
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#3b82f6' }]} onPress={handleSaveMerchant}>
                <Text style={styles.btnPrimaryText}>Kaydet</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  tabsContainer: {
    flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 8
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, backgroundColor: '#f8fafc'
  },
  activeTab: { backgroundColor: '#eef2ff' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: '#4f46e5' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  tabContent: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 } },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#475569', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#fff', color: '#0f172a' },
  btnPrimary: { backgroundColor: '#4f46e5', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  avatarMini: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarMiniText: { color: '#64748b', fontWeight: '700' },
  memberName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  memberRole: { fontSize: 13, color: '#64748b' },
  flexRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05 },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  listName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  listRight: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  rowInputs: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  typeBtnActiveExp: { borderColor: '#f43f5e', backgroundColor: '#fff1f2' },
  typeBtnActiveInc: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  themeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 14,
  },
  themeOptionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  themeOptionDesc: {
    fontSize: 12,
    fontWeight: '500',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
